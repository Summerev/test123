import re
import traceback
from . import doc_retriever
from . import translation_content


def extract_articles_with_content(text):
    """조항별 정밀 추출"""
    print("📄 조항별 정밀 추출 시작...")

    chunks = []
    article_pattern = r'제\s*(\d+)\s*조\s*\(([^)]+)\)'
    articles = list(re.finditer(article_pattern, text))

    print(f"🔍 발견된 조항: {len(articles)}개")

    if articles:
        for i, article in enumerate(articles):
            article_num = int(article.group(1))
            article_title = article.group(2).strip()
            start_pos = article.start()

            if i + 1 < len(articles):
                end_pos = articles[i + 1].start()
            else:
                end_pos = len(text)

            full_content = text[start_pos:end_pos].strip()
            lines = full_content.split('\n')
            header = lines[0] if lines else ""
            body = '\n'.join(lines[1:]) if len(lines) > 1 else ""

            if len(full_content) > 10:
                chunk_data = {
                    'text': full_content,
                    'article_num': article_num,
                    'article_title': article_title,
                    'header': header,
                    'body': body,
                    'type': 'article'
                }
                chunks.append(chunk_data)
                print(f"✅ 제{article_num}조({article_title}) 추출: {len(full_content)}자")

    # 조항이 부족한 경우 문단별 추가
    if len(chunks) < 5:
        print("📋 조항이 부족하여 문단별 보완...")
        paragraphs = [p.strip() for p in text.split('\n') if len(p.strip()) > 50]

        for i, para in enumerate(paragraphs[:10]):
            chunks.append({
                'text': para,
                'article_num': None,
                'article_title': f"문단 {i+1}",
                'header': para[:50] + "...",
                'body': para,
                'type': 'paragraph'
            })

    print(f"✅ 총 {len(chunks)}개 청크 생성")
    return chunks

def detect_contract_type(text):
    """계약서 유형 자동 감지"""
    print("🎯 계약서 유형 자동 감지 시작...")

    type_scores = {}
    for contract_type, terms in CONTRACT_TYPES_TERMS.items():
        score = 0
        matched_terms = []

        for term in terms:
            if term in text:
                score += 1
                matched_terms.append(term)

        if score > 0:
            type_scores[contract_type] = {
                'score': score,
                'percentage': round((score / len(terms)) * 100, 1),
                'matched_terms': matched_terms
            }

    if type_scores:
        sorted_types = sorted(type_scores.items(), key=lambda x: x[1]['score'], reverse=True)
        detected_type = sorted_types[0][0]
        confidence = sorted_types[0][1]

        print(f"✅ 감지된 계약서 유형: {detected_type} ({confidence['percentage']}%)")
        return detected_type, confidence, dict(sorted_types)
    else:
        print("❌ 계약서 유형을 감지하지 못했습니다.")
        return None, None, {}


def create_enhanced_keyword_index(chunks, detected_contract_type=None):
    """강화된 키워드 인덱스 생성"""
    print("🔍 강화된 키워드 인덱스 생성 중...")

    keyword_index = {}

    # 기존 범용 키워드
    universal_keywords = {
        '해지_종료': ['해지', '해제', '종료', '중단', '파기'],
        '의무_책임': ['의무', '책임', '이행', '준수'],
        '권리_자격': ['권리', '권한', '자격'],
        '계약_약정': ['계약', '협약', '약정'],
        '위반_어김': ['위반', '위배', '어김'],
        '손해_배상': ['손해', '배상', '피해', '손실'],
        '지급_결제': ['지급', '지불', '납부', '결제'],
        '기간_기한': ['기간', '기한', '일자', '날짜'],
        '사유_이유': ['사유', '이유', '원인', '근거'],
        '위험_주의': ['위험', '주의', '경고', '위험요소']
    }

    # 감지된 계약서 유형별 특화 키워드 추가
    specialized_keywords = {}
    if detected_contract_type and detected_contract_type in CONTRACT_TYPES_TERMS:
        contract_terms = CONTRACT_TYPES_TERMS[detected_contract_type]

        for term in contract_terms:
            key = f"특화_{term}"
            specialized_keywords[key] = [term]

            # 유사 용어 추가
            if '계약' in term:
                specialized_keywords[key].extend(['계약서', '약정서', '협약서'])
            if '기간' in term:
                specialized_keywords[key].extend(['기한', '일정', '날짜'])
            if '금' in term and term != '금지':
                specialized_keywords[key].extend(['대금', '비용', '요금'])

        print(f"📋 {detected_contract_type} 특화 키워드 {len(specialized_keywords)}개 추가")

    # 전체 키워드 결합
    all_keywords = {**universal_keywords, **specialized_keywords}

    # 인덱싱
    for chunk_idx, chunk in enumerate(chunks):
        chunk_text = chunk['text'].lower()
        chunk_title = chunk['article_title'].lower()

        for keyword_group, keywords in all_keywords.items():
            score = 0
            found_keywords = []

            for keyword in keywords:
                title_count = chunk_title.count(keyword)
                text_count = chunk_text.count(keyword)

                if title_count > 0:
                    score += title_count * 15
                    found_keywords.append(f"{keyword}(제목)")

                if text_count > 0:
                    score += text_count * 3
                    found_keywords.append(f"{keyword}(본문)")

            if score > 0:
                if keyword_group not in keyword_index:
                    keyword_index[keyword_group] = []

                keyword_index[keyword_group].append({
                    'chunk_idx': chunk_idx,
                    'score': score,
                    'found_keywords': found_keywords,
                    'article_info': f"제{chunk['article_num']}조({chunk['article_title']})" if chunk['article_num'] else chunk['article_title']
                })

    # 점수순으로 정렬
    for keyword_group in keyword_index:
        keyword_index[keyword_group].sort(key=lambda x: x['score'], reverse=True)

    print(f"✅ 총 {len(keyword_index)}개 키워드 그룹 생성")
    return keyword_index


def enhance_document_texts(document_chunks: list[dict], user_id: int = None, session_id: str = None) -> tuple[list[str], list[dict]]:
    """
    문서 청크의 텍스트를 강화하고 페이로드를 생성합니다. (순수 변환 로직만 담당)
    
    Args:
        document_chunks: 문서 청크 리스트 (article_num, article_title, text, type 포함)
        user_id: 사용자 ID (선택적)
        session_id: 세션 ID (선택적)
        
    Returns:
        tuple: (강화된 텍스트 리스트, 페이로드 리스트)
    """
    print(f"🔄 enhance_document_texts 함수 시작: chunks={len(document_chunks)}개")
    
    if not document_chunks:
        print("⚠️ 강화할 청크가 없어 함수를 종료합니다")
        print("🏁 enhance_document_texts 함수 종료: 청크 없음")
        return [], []

    try:
        print("📝 텍스트 강화 및 페이로드 생성 중...")
        enhanced_texts = []
        payloads = []

        for chunk in document_chunks:
            title = chunk['article_title']
            text = chunk['text']
            enhanced_text = f"{title} {title} {title} {text}"
            enhanced_texts.append(enhanced_text)

            # 페이로드 생성
            payload = {
                'article_num': chunk['article_num'],
                'article_title': chunk['article_title'],
                'text': chunk['text'],
                'type': chunk['type']
            }
            
            # user_id, session_id가 제공된 경우에만 추가
            if user_id is not None:
                payload['user_id'] = user_id
            if session_id is not None:
                payload['session_id'] = session_id
                
            payloads.append(payload)

        print(f"✅ 텍스트 강화 및 페이로드 생성 완료: {len(enhanced_texts)}개")
        print(f"🏁 enhance_document_texts 함수 종료: {len(enhanced_texts)}개 처리 완료")
        return enhanced_texts, payloads

    except Exception as e:
        print(f"❌ 텍스트 강화 및 페이로드 생성 실패: {str(e)}")
        print("🏁 enhance_document_texts 함수 종료: 오류 발생")
        return [], []

def unified_analysis_with_translation(client, text: str, target_language: str):
    """강화된 한국어 분석 + 번역 통합 함수 - 안전성 강화 버전"""
    print(f"🌍 {target_language} 통일된 분석 시작 (강화된 한국어 기준)")

    try:
        # 1단계: 강화된 한국어 분석
        print("📋 1단계: 강화된 한국어 기준 분석 수행...")
        
        # 요약 생성 - 모듈 호출 방식을 직접 함수 호출로 변경
        summary_result = translation_content.enhanced_korean_based_summary(client, text)
        if not summary_result.get('success', False):
            print(f"ERROR: [unified_analysis_with_translation] 한국어 요약 생성 실패: {summary_result.get('error')}")
            error_msg = summary_result.get('error', '요약 생성 실패')
            # 폴백 텍스트 사용
            fallback_summary = summary_result.get('summary_text')
            return fallback_summary, error_msg

        korean_summary_text = summary_result.get('summary_text', '')

        # 위험 분석 생성 - 모듈 호출 방식을 직접 함수 호출로 변경
        risk_result = translation_content.enhanced_korean_based_risk_analysis(client, text)
        if not risk_result.get('success', False):
            print(f"ERROR: [unified_analysis_with_translation] 한국어 위험 분석 실패: {risk_result.get('error')}")
            error_msg = risk_result.get('error', '위험 분석 실패')
            # 폴백 텍스트 사용
            fallback_risk = risk_result.get('risk_analysis_text')
            return korean_summary_text, fallback_risk
            
        korean_risk_analysis_text = risk_result.get('risk_analysis_text', '')

        print("📋 1단계 완료: 한국어 분석 성공.")

        # 한국어인 경우, 바로 텍스트 반환
        if target_language == "ko":
            print("✅ 최종 결과 반환 (언어: ko)")
            return korean_summary_text, korean_risk_analysis_text

        # 2단계: 다른 언어인 경우 번역 수행
        print(f"🔄 2단계: {target_language}로 번역 수행...")

        # 요약 번역 - 모듈 호출 방식을 직접 함수 호출로 변경
        translated_summary_result = translation_content.translate_to_target_language(client, korean_summary_text, target_language, "요약")
        if not translated_summary_result.get('success', False):
            print(f"ERROR: [unified_analysis_with_translation] 요약 번역 실패: {translated_summary_result.get('error')}")
            # 번역 실패시 한국어 텍스트라도 반환
            translated_summary_text = translated_summary_result.get('translated_text', korean_summary_text)
        else:
            translated_summary_text = translated_summary_result.get('translated_text', korean_summary_text)

        # 위험분석 번역 - 모듈 호출 방식을 직접 함수 호출로 변경
        translated_risk_result = translation_content.translate_to_target_language(client, korean_risk_analysis_text, target_language, "위험분석")
        if not translated_risk_result.get('success', False):
            print(f"ERROR: [unified_analysis_with_translation] 위험 분석 번역 실패: {translated_risk_result.get('error')}")
            # 번역 실패시 한국어 텍스트라도 반환
            translated_risk_text = translated_risk_result.get('translated_text', korean_risk_analysis_text)
        else:
            translated_risk_text = translated_risk_result.get('translated_text', korean_risk_analysis_text)

        print(f"🔄 2단계 완료: {target_language}로 번역 성공.")

        # 최종적으로 번역된 텍스트를 담은 튜플 반환
        print(f"✅ 최종 결과 반환 (언어: {target_language})")
        return translated_summary_text, translated_risk_text

    except Exception as e:
        print(f"CRITICAL ERROR: [unified_analysis_with_translation] 함수 전체에서 예외 발생: {e}")

        traceback.print_exc()
        # 오류 발생시에도 최소한의 텍스트를 반환
        fallback_summary = translation_content.fallback_korean_summary()
        fallback_risk = translation_content.fallback_korean_risk_analysis({})
        return fallback_summary, fallback_risk

def generate_contract_type_info(detected_contract_type, confidence, language):
    """
    7단계: 계약서 유형 정보 생성 및 언어별 번역
    
    Args:
        detected_contract_type: 감지된 계약서 유형
        confidence: 신뢰도 정보 (dict)
        language: 목표 언어
    
    Returns:
        str: 포맷팅된 계약서 유형 정보
    """
    print("[7단계] 계약서 유형 정보 생성 중...")
    
    type_info = ""
    if detected_contract_type and confidence:
        # 기본 한국어 유형 정보 생성
        type_info_korean = f"""## 🎯 감지된 계약서 유형
**{detected_contract_type}** - {CONTRACT_TYPE_DESCRIPTIONS.get(detected_contract_type, '')}
- 매칭도: {confidence.get('percentage', 0)}% ({confidence.get('score', 0)}개 용어 매칭)
- 주요 매칭 용어: {', '.join(confidence.get('matched_terms', [])[:5])}{'...' if len(confidence.get('matched_terms', [])) > 5 else ''}
"""
        
        # 언어별 번역 처리
        if language != "한국어":
            try:
                # 유형 정보 번역
                type_info = translation_content.translate_to_target_language(type_info_korean, language, "유형정보")
            except Exception as e:
                print(f"[7단계 경고] 유형 정보 번역 중 오류: {str(e)}")
                type_info = type_info_korean  # 번역 실패시 한국어 사용
        else:
            type_info = type_info_korean
    
    print("[7단계 완료] 계약서 유형 정보 생성 완료.")
    return type_info


def get_section_titles_by_language(language):
    """
    8단계: 언어별 섹션 제목 반환
    
    Args:
        language: 목표 언어
    
    Returns:
        dict: 언어별 섹션 제목 딕셔너리
    """
    print("[8단계] 언어별 섹션 제목 설정...")
    
    section_titles = {
        "한국어": {
            "summary": "## 📋 문서 요약", 
            "risk": "## ⚠️ 위험 분석", 
            "complete": "✅ **분석 완료**"
        },
        "日本語": {
            "summary": "## 📋 文書要約", 
            "risk": "## ⚠️ リスク分析", 
            "complete": "✅ **分析完了**"
        },
        "中文": {
            "summary": "## 📋 文档摘要", 
            "risk": "## ⚠️ 风险分析", 
            "complete": "✅ **分析完成**"
        },
        "English": {
            "summary": "## 📋 Document Summary", 
            "risk": "## ⚠️ Risk Analysis", 
            "complete": "✅ **Analysis Complete**"
        },
        "Español": {
            "summary": "## 📋 Resumen del Documento", 
            "risk": "## ⚠️ Análisis de Riesgos", 
            "complete": "✅ **Análisis Completo**"
        }
    }
    
    titles = section_titles.get(language, section_titles["한국어"])
    print(f"[8단계 완료] '{language}' 언어 섹션 제목 설정 완료.")
    return titles


def extract_legal_terms_explanation(summary_text, risk_text, language):
    """
    9단계: 한국어인 경우에만 어려운 용어 설명 추가
    
    Args:
        summary_text: 요약 텍스트
        risk_text: 위험 분석 텍스트
        language: 언어
    
    Returns:
        str: 법률 용어 설명 (한국어가 아니면 빈 문자열)
    """
    print("[9단계] 법률 용어 설명 추출...")
    
    legal_terms_explanation = ""
    if language == "한국어":
        try:
            # extract_legal_terms_from_korean_text 함수 호출
            legal_terms_explanation = extract_legal_terms_from_korean_text(summary_text + risk_text)
            print("[9단계 완료] 한국어 법률 용어 설명 추출 완료.")
        except Exception as e:
            print(f"[9단계 경고] 법률 용어 추출 중 오류: {str(e)}")
            legal_terms_explanation = ""
    else:
        print("[9단계 건너뜀] 한국어가 아니므로 법률 용어 설명 생략.")
    
    return legal_terms_explanation


def create_final_contract_summary(type_info, titles, summary_text, risk_text, legal_terms_explanation, chunk_count):
    """
    10단계: 최종 요약 텍스트 조합
    
    Args:
        type_info: 계약서 유형 정보
        titles: 언어별 섹션 제목
        summary_text: 요약 텍스트
        risk_text: 위험 분석 텍스트
        legal_terms_explanation: 법률 용어 설명
        chunk_count: 청크 개수
    
    Returns:
        str: 최종 조합된 요약 텍스트
    """
    print("[10단계] 최종 요약 텍스트 조합...")

    final_combined_summary = f"""{type_info}

{titles['summary']}
{summary_text}

{titles['risk']}
{risk_text}{legal_terms_explanation}

---
{titles['complete']}: {chunk_count}개 조항 분석 | **강화된 RAG 검색** | **문서 기반 우선 답변**"""
    
    print("[10단계 완료] 최종 요약 텍스트 조합 완료.")
    return final_combined_summary


def format_contract_analysis_result(detected_contract_type, confidence, analysis_result_summary, analysis_result_risk, language, chunk_count):
    """
    통합 함수: 7~10단계를 모두 처리하는 메인 포맷팅 함수
    
    Args:
        detected_contract_type: 감지된 계약서 유형
        confidence: 신뢰도 정보
        analysis_result_summary: 번역된 요약 텍스트
        analysis_result_risk: 번역된 위험 분석 텍스트
        language: 목표 언어
        chunk_count: 청크 개수
    
    Returns:
        str: 최종 포맷팅된 분석 결과
    """
    print("\n[포맷팅 단계] 계약서 분석 결과 포맷팅 시작...")
    
    try:
        # 7단계: 계약서 유형 정보 생성
        type_info = generate_contract_type_info(detected_contract_type, confidence, language)
        
        # 8단계: 언어별 섹션 제목 설정
        titles = get_section_titles_by_language(language)
        
        # 9단계: 법률 용어 설명 추출
        legal_terms_explanation = extract_legal_terms_explanation(analysis_result_summary, analysis_result_risk, language)
        
        # 10단계: 최종 요약 텍스트 조합
        final_combined_summary = create_final_contract_summary(
            type_info, titles, analysis_result_summary, analysis_result_risk, legal_terms_explanation, chunk_count
        )
        
        print("[포맷팅 단계 완료] 계약서 분석 결과 포맷팅 성공.")
        return final_combined_summary
        
    except Exception as e:
        print(f"[포맷팅 단계 오류] 포맷팅 중 오류 발생: {str(e)}")
        
        # 오류 발생시 기본 포맷으로 반환
        error_messages = {
            "한국어": f"❌ 포맷팅 중 오류 발생: {str(e)}",
            "日本語": f"❌ フォーマット中にエラーが発生しました: {str(e)}",
            "中文": f"❌ 格式化过程中发生错误: {str(e)}",
            "English": f"❌ Error occurred during formatting: {str(e)}",
            "Español": f"❌ Error ocurrido durante el formateo: {str(e)}"
        }
        
        fallback_summary = f"""## 📋 문서 요약
{analysis_result_summary}

## ⚠️ 위험 분석
{analysis_result_risk}

---
✅ **분석 완료**: {chunk_count}개 조항 분석

{error_messages.get(language, error_messages["한국어"])}"""

        return fallback_summary


def extract_legal_terms_from_korean_text(text):
    """한국어 텍스트에서만 어려운 법률 용어 추출 및 설명 제공"""
    legal_terms = IMPROVED_LANGUAGES["한국어"]["legal_terms"]
    found_terms = {}

    for term, explanation in legal_terms.items():
        if term in text:
            found_terms[term] = explanation
        elif len(term) >= 3:
            pattern = term + r'[은는이가을를의에서로부터까지와과도나며으로써에게에서부터]'
            if re.search(pattern, text):
                found_terms[term] = explanation

    if found_terms:
        explanations = []
        sorted_terms = sorted(found_terms.items(), key=lambda x: len(x[0]), reverse=True)

        for term, explanation in sorted_terms:
            explanations.append(f"**{term}**: {explanation}")

        return f"""

## 📚 어려운 용어 설명
{chr(10).join(explanations)}"""

    return ""


CONTRACT_TYPES_TERMS = {
    "근로계약서": ["근로시간", "임금", "퇴직금", "연차휴가", "수습기간", "근로기준법", "계약기간", "해고", "업무내용", "복무규정", "연장근로", "야간근로", "휴게시간", "직무기술서", "취업규칙", "복리후생", "직급체계", "경력직", "정규직", "직장 내 괴롭힘 방지"],
    "용역계약서": ["용역제공", "계약기간", "용역대금", "완료기준", "인도조건", "계약해지", "용역내용", "추가비용", "품질기준", "납품일정", "계약변경", "검수기준", "하자담보", "보고의무", "용역책임", "기밀유지", "지적재산권", "계약이행", "손해배상", "준거법"],
    "매매계약서": ["매도인", "매수인", "물품명세", "인도조건", "대금지급일", "하자보증", "소유권 이전", "계약금", "잔금", "위약금", "거래조건", "납품검수", "수령증", "반품정책", "사양서", "물품대금청구", "물류비용", "수출입신고", "무역조건", "국제운송", "세금계산서"],
    "임대차계약서": ["임대인", "임차인", "보증금", "임대료", "임대차 기간", "계약갱신", "관리비", "원상복구", "중도해지", "연체료", "손해배상", "전대금지", "권리금", "임대목적물", "사용승낙", "재계약", "사용제한", "유지보수", "일시불", "부동산등기", "시설물"],
    "비밀유지계약서": ["기밀정보", "수신자", "제공자", "비공개", "유효기간", "제3자 공개금지", "자료반환", "위반책임", "영업비밀", "정보보호", "손해배상", "독립개발", "반환의무", "사전동의", "정보사용목적", "비공개정보", "공개범위", "보안등급", "모니터링", "정보통제", "유출방지"],
    "공급계약서": ["공급업체", "납품기한", "품질관리", "공급조건", "납품검수", "단가협상", "재고관리", "로트번호", "공급능력", "품질보증", "결함처리", "납기일정", "공급중단", "대체공급", "품질인증", "제품사양", "포장기준", "운송책임", "수량조정", "가격조정"],
    "프랜차이즈 계약서": ["가맹본부", "가맹점", "가맹금", "로열티", "영업지역", "상표사용권", "영업노하우", "광고분담금", "매뉴얼", "교육훈련", "점포운영", "판매목표", "계약해지", "경업금지", "재계약", "점포이전", "인테리어", "원재료 구매", "영업감독", "브랜드 관리"],
    "MOU": ["양해각서", "협력사항", "역할분담", "협력기간", "비밀유지", "지적재산권", "공동연구", "정보공유", "의사결정", "분쟁해결", "계약해지", "후속협약", "협력범위", "상호협력", "공동개발", "협의사항", "업무협조", "협력체계", "연락창구", "평가방법"],
    "주식양도계약서": ["양도인", "양수인", "주식수", "양도가격", "주식양도", "주주권리", "대금지급", "양도조건", "주주총회", "이사회", "배당권", "신주인수권", "경영권", "주식평가", "실사완료", "담보제공", "표명보장", "손해배상", "양도제한", "우선매수권"],
    "라이선스 계약서": ["라이선서", "라이선시", "특허권", "실시료", "독점", "비독점", "실시범위", "기술지원", "개량발명", "라이선스 기간", "최소실시료", "기술이전", "노하우", "개발성과", "사용제한", "기술정보", "실시보고", "특허출원", "지적재산권", "계약해지"],
    "합작투자계약서": ["합작당사자", "출자비율", "경영권", "이익배분", "손실분담", "이사회", "경영진", "재무관리", "의사결정", "합작회사", "청산절차", "계약해지", "출자의무", "자본금", "기술기여", "운영관리", "감사권", "정보공개", "경쟁제한", "분쟁해결"],
    "위임계약서": ["위임자", "수임자", "위임사무", "보수", "위임기간", "선관주의의무", "보고의무", "계산서 제출", "비용정산", "대리권", "복위임", "위임해지", "손해배상", "기밀유지", "이해상충", "수임료", "경비부담", "업무범위", "권한범위", "책임한계"],
    "기술이전계약서": ["기술제공자", "기술도입자", "기술료", "기술범위", "기술문서", "기술지도", "개량기술", "특허출원", "노하우", "기술평가", "기술검증", "실시권", "독점권", "기술지원", "교육훈련", "기술개발", "성과배분", "기술보증", "계약해지", "경업금지"],
    "하도급계약서": ["원도급자", "하도급자", "하도급대금", "공사기간", "시공범위", "품질기준", "안전관리", "진도관리", "검사기준", "기성고", "하자보수", "계약변경", "공사중단", "하도급법", "지급보증", "이행보증", "설계변경", "공기연장", "손해배상", "보험가입"],
    "광고대행계약서": ["광고주", "광고대행사", "광고비", "광고기간", "매체선정", "광고효과", "크리에이티브", "매체수수료", "광고승인", "광고결과", "예산관리", "광고전략", "타겟팅", "광고평가", "저작권", "초상권", "광고윤리", "계약해지", "손해배상", "기밀유지"],
    "컨설팅계약서": ["컨설턴트", "클라이언트", "컨설팅료", "컨설팅 기간", "컨설팅 범위", "성과물", "보고서", "컨설팅 방법", "전문성", "기밀유지", "이해상충", "책임한계", "성과보장", "추가비용", "지적재산권", "경쟁제한", "계약해지", "손해배상", "분쟁해결", "준거법"],
    "출판계약서": ["저작자", "출판사", "인세", "출간일", "판권", "저작권", "편집권", "배포권", "번역권", "2차 저작물", "최소출간부수", "절판기준", "재출간", "광고홍보", "마케팅", "저작인격권", "수정권", "검열금지", "계약해지", "손해배상"],
    "건설공사계약서": ["발주자", "수급인", "공사대금", "공사기간", "설계도서", "시방서", "품질관리", "안전관리", "준공검사", "하자담보", "기성고", "선급금", "공사변경", "공기연장", "계약해지", "손해배상", "이행보증", "하자보수", "보험가입", "하도급"],
    "임의규약계약서": ["당사자", "합의사항", "이행조건", "계약기간", "권리의무", "특약사항", "면책조항", "불가항력", "계약변경", "계약해지", "분쟁해결", "준거법", "관할법원", "통지의무", "승계금지", "계약의 효력", "해석기준", "우선순위", "부속합의", "완전합의"],
    "투자계약서": ["투자자", "피투자회사", "투자금액", "주식인수", "기업가치", "우선주", "전환권", "희석방지", "투자조건", "경영참여", "정보제공", "승인사항", "우선청산권", "동반매도권", "우선매수권", "경업금지", "키맨조항", "투자회수", "IPO", "M&A"]
}

CONTRACT_TYPE_DESCRIPTIONS = {
    "근로계약서": "고용주와 근로자 간의 근로관계를 정하는 계약서",
    "용역계약서": "특정 서비스나 업무의 제공에 관한 계약서",
    "매매계약서": "물품이나 재산의 매매에 관한 계약서",
    "임대차계약서": "부동산이나 물건의 임대차에 관한 계약서",
    "비밀유지계약서": "기밀정보의 보호와 관리에 관한 계약서",
    "공급계약서": "지속적인 물품이나 서비스 공급에 관한 계약서",
    "프랜차이즈 계약서": "가맹사업에 관한 권리와 의무를 정하는 계약서",
    "MOU": "상호 협력과 양해에 관한 각서",
    "주식양도계약서": "주식의 양도와 매매에 관한 계약서",
    "라이선스 계약서": "지적재산권의 사용허가에 관한 계약서",
    "합작투자계약서": "공동투자와 사업운영에 관한 계약서",
    "위임계약서": "특정 업무의 위임에 관한 계약서",
    "기술이전계약서": "기술과 노하우의 이전에 관한 계약서",
    "하도급계약서": "건설이나 제조업의 하도급에 관한 계약서",
    "광고대행계약서": "광고업무의 대행에 관한 계약서",
    "컨설팅계약서": "전문적인 조언과 컨설팅에 관한 계약서",
    "출판계약서": "저작물의 출간과 배포에 관한 계약서",
    "건설공사계약서": "건설공사의 시행에 관한 계약서",
    "임의규약계약서": "당사자 간의 특별한 약정에 관한 계약서",
    "투자계약서": "투자와 지분참여에 관한 계약서"
}

IMPROVED_LANGUAGES = {
    "한국어": {
        "system_prompt": """당신은 계약서 전문 해석 AI입니다. 다음 5가지 기능을 수행합니다:
1. 계약서 조항 해석 - 복잡한 조항을 쉽게 설명
2. 법률 용어 설명 - 어려운 용어를 일반인이 이해하기 쉽게 설명
3. 문서 요약 - 핵심 내용을 간단명료하게 정리
4. 조건 분석 - 계약 조건과 의무사항 분석
5. 위험 요소 식별 - 불리한 조건이나 주의사항 파악

**중요한 규칙**:
- 제공된 계약서 내용만을 바탕으로 정확하게 답변하세요
- 일반적인 법률 지식이 아닌 이 계약서의 구체적인 조항을 설명하세요
- 계약서에 없는 내용은 추측하지 마세요
- 반드시 한국어로만 답변하세요

법률 용어는 원문 그대로 사용하되, 일반인이 이해하기 쉽게 설명하세요.""",

        "off_topic_response": "죄송합니다. 업로드하신 계약서 내용에 대해서만 답변드릴 수 있습니다. 계약서와 관련된 질문을 해주세요.",
        "no_results_response": "해당 내용을 계약서에서 찾을 수 없습니다. 계약서에 실제로 포함된 조항이나 내용으로 다시 질문해주세요.",
        "language_enforcement": "반드시 한국어로만 답변하세요.",

        "legal_terms": {
            "해지": "계약을 중간에 끝내는 것",
            "위반": "약속이나 규정을 어기는 것",
            "배상": "손해를 보상해주는 것",
            "이행": "약속한 것을 실제로 지키는 것",
            "귀책사유": "잘못의 원인이 되는 이유",
            "임대인": "집이나 건물을 빌려주는 사람",
            "임차인": "집이나 건물을 빌리는 사람",
            "보증금": "계약을 보장하기 위해 미리 맡기는 돈",
            "연체료": "정해진 기한을 넘겨서 내는 벌금",
            "원상복구": "원래 상태로 되돌리는 것"
        }
    },

    "English": {
        "off_topic_response": "I can only answer questions about the uploaded contract content. Please ask contract-related questions.",
        "no_results_response": "That content cannot be found in the contract. Please ask again with clauses or content actually included in the contract.",
    },

    "日本語": {
        "off_topic_response": "申し訳ございませんが、アップロードされた契約書内容についてのみ回答できます。契約書に関連する質問をしてください。",
        "no_results_response": "その内容は契約書に見つかりません。契約書に実際に含まれている条項や内容で再度質問してください。",
    },

    "中文": {
        "off_topic_response": "抱歉，只能回答上传的合同内容相关问题。请提出与合同相关的问题。",
        "no_results_response": "在合同中找不到该内容。请用合同中实际包含的条款或内容重新提问。",
    },

    "Español": {
        "off_topic_response": "Solo puedo responder preguntas sobre el contenido del contrato subido. Por favor haga preguntas relacionadas con el contrato.",
        "no_results_response": "Ese contenido no se puede encontrar en el contrato. Por favor pregunte nuevamente con cláusulas o contenido realmente incluido en el contrato.",
    }
}