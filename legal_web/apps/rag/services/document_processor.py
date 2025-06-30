# apps/rag/services/document_processor.py
import re
import PyPDF2
import docx
from typing import List, Dict, Any, Tuple, Optional

# 계약서 유형별 전문 용어 데이터베이스
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

class DocumentProcessor:
    """문서 처리 클래스"""
    
    @staticmethod
    def extract_text_from_file(file_path: str, file_name: str) -> str:
        """파일에서 텍스트 추출"""
        file_ext = file_name.lower().split('.')[-1]
        try:
            if file_ext == 'pdf':
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    return "\n".join([page.extract_text() for page in reader.pages])
            elif file_ext == 'docx':
                doc = docx.Document(file_path)
                return "\n".join([paragraph.text for paragraph in doc.paragraphs])
            elif file_ext == 'txt':
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            else:
                return "❌ 지원하지 않는 파일 형식입니다."
        except Exception as e:
            return f"❌ 파일 읽기 오류: {str(e)}"

    @staticmethod
    def detect_contract_type(text: str) -> Tuple[Optional[str], Optional[Dict], Dict]:
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

    @staticmethod
    def extract_articles_with_content(text: str) -> List[Dict]:
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

    @staticmethod
    def extract_key_contract_info(text: str) -> Dict:
        """계약서에서 핵심 정보 추출"""
        info = {
            'contract_type': None,
            'keywords': [],
            'financial_terms': [],
            'period_terms': []
        }

        # 계약 유형 감지
        for contract_type in CONTRACT_TYPES_TERMS.keys():
            if any(term in text for term in CONTRACT_TYPES_TERMS[contract_type][:3]):
                info['contract_type'] = contract_type
                break

        # 핵심 키워드 추출
        # 금액 관련 용어
        financial_pattern = r'(대금|비용|요금|수수료|보증금|위약금|연체료|지체상금|계약금|잔금)'
        info['financial_terms'] = list(set(re.findall(financial_pattern, text)))

        # 기간 관련 용어
        period_pattern = r'(기간|기한|일자|날짜|시점|시기|완료|종료|만료)'
        info['period_terms'] = list(set(re.findall(period_pattern, text)))

        # 일반 키워드
        general_keywords = ['계약', '당사자', '의무', '권리', '책임', '조건', '기준', '방법']
        info['keywords'] = [kw for kw in general_keywords if kw in text]

        return info

    @staticmethod
    def extract_detailed_risk_info(text: str) -> Dict:
        """상세한 위험 관련 정보 추출"""
        risk_info = {
            'risk_keywords': [],
            'liability_terms': [],
            'termination_terms': [],
            'obligation_terms': [],
            'penalty_terms': []
        }

        # 손해배상 관련
        liability_pattern = r'(손해배상|배상책임|배상의무|손실보상|피해보상|손해|배상)'
        risk_info['liability_terms'] = list(set(re.findall(liability_pattern, text)))

        # 해지 관련
        termination_pattern = r'(해지|해제|종료|중단|파기|취소|철회)'
        risk_info['termination_terms'] = list(set(re.findall(termination_pattern, text)))

        # 의무 관련
        obligation_pattern = r'(의무|책임|이행|준수|완수|수행|실행)'
        risk_info['obligation_terms'] = list(set(re.findall(obligation_pattern, text)))

        # 제재 관련
        penalty_pattern = r'(위약금|연체료|지체상금|벌금|과태료|제재|처벌|징계)'
        risk_info['penalty_terms'] = list(set(re.findall(penalty_pattern, text)))

        # 전체 위험 키워드
        risk_info['risk_keywords'] = (
            risk_info['liability_terms'] +
            risk_info['termination_terms'] +
            risk_info['penalty_terms']
        )

        return risk_info