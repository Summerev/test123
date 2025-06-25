# ========================== 🔥 핵심: 한국어 기준 번역 방식 ==========================
from openai import APIError

def enhanced_korean_based_risk_analysis(client, text):
    """강화된 한국어 기준 위험 분석 생성 - 구체성과 실용성 대폭 향상"""
    print("⚠️ 강화된 한국어 기준 위험 분석 생성 중...")

    try:
        # 위험 관련 핵심 정보 사전 추출
        risk_info = extract_detailed_risk_info(text)

        # 안전한 데이터 추출 함수 개선
        def safe_join(data, default_msg="정보 없음"):
            try:
                if isinstance(data, list) and data:
                    return ', '.join(str(item) for item in data)
                elif isinstance(data, (str, int, float)) and data:
                    return str(data)
                else:
                    return default_msg
            except Exception:
                return default_msg

        # 안전하게 정보 추출하고 str()로 한 번 더 감싸기
        risk_keywords = str(safe_join(risk_info.get('risk_keywords', [])))
        liability_terms = str(safe_join(risk_info.get('liability_terms', [])))
        termination_terms = str(safe_join(risk_info.get('termination_terms', [])))
        obligation_terms = str(safe_join(risk_info.get('obligation_terms', [])))
        penalty_terms = str(safe_join(risk_info.get('penalty_terms', [])))
        
        # 텍스트도 안전하게 문자열로 변환
        text_safe = str(text[:8000])

        prompt = f"""다음 계약서의 위험 요소를 매우 구체적이고 실용적으로 분석해주세요.

**위험 분석 구조** (반드시 이 순서대로):
1. **손해배상 위험**: 구체적인 배상 조항과 실제 위험성
2. **계약해지 위험**: 해지 조건과 실제 발생 가능한 불이익
3. **의무위반 위험**: 의무 불이행시 구체적인 제재와 결과
4. **재정적 위험**: 실제 금전적 손실 가능성과 규모
5. **법적 위험**: 구체적인 법률적 문제와 대응 방안

**추출된 위험 관련 정보**:
- 주요 위험 키워드: {risk_keywords}
- 손해배상 관련: {liability_terms}
- 해지 관련: {termination_terms}
- 의무 관련: {obligation_terms}
- 제재 관련: {penalty_terms}

**분석할 계약서**:
{text_safe}

**중요한 분석 원칙**:
- 각 위험에 대해 계약서의 **구체적인 조항 번호와 내용**을 인용하세요
- "가능성이 있다", "위험하다" 같은 모호한 표현 대신 **구체적인 상황과 결과**를 설명하세요
- **실제로 발생할 수 있는 시나리오**와 **구체적인 손실 규모**를 제시하세요
- **실무에서 주의해야 할 구체적인 행동 지침**을 포함하세요

예시 형식:
**1. 손해배상 위험:**
• **구체적 조항**: 제○조에 따르면 "○○○"
• **위험 시나리오**: ○○한 상황에서 ○○가 발생하면
• **예상 손실**: ○○원 또는 ○○% 수준의 손해배상
• **주의사항**: ○○를 반드시 확인하고 ○○해야 함"""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": """당신은 계약서 위험 분석 전문가입니다. 다음 원칙을 엄격히 따르세요:

**분석 원칙**:
1. 반드시 계약서의 구체적인 조항을 인용하세요
2. "위험이 있습니다", "주의가 필요합니다" 같은 모호한 표현 금지
3. 구체적인 상황, 금액, 기간, 조건을 명시하세요
4. 실제로 발생 가능한 시나리오를 구체적으로 제시하세요
5. 실무에서 즉시 활용 가능한 구체적인 조치 사항을 포함하세요

**품질 기준**:
- 각 위험 항목당 최소 3개의 구체적인 포인트 포함
- 계약서 조항 번호나 구체적 내용 인용 필수
- 예상 손실 규모나 구체적 불이익 명시
- 실무 대응 방안 구체적으로 제시"""},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.05
        )

        risk_analysis_text = response.choices[0].message.content.strip()
        
        # 품질 검증 및 처리
        if validate_risk_analysis_quality(risk_analysis_text):
            print("✅ 강화된 한국어 위험 분석 생성 완료 (품질 기준 통과).")
            return {
                "success": True,
                "risk_analysis_text": risk_analysis_text,
                "message": "한국어 기반 위험 분석이 성공적으로 생성되었습니다."
            }
        else:
            print("⚠️ 위험분석 품질 기준 미달, 재생성 시도...")
            # 재생성 시도
            retry_result = retry_enhanced_risk_analysis(client, text, risk_info)
            if isinstance(retry_result, dict):
                return retry_result
            else:
                return {
                    "success": True,
                    "risk_analysis_text": retry_result,
                    "message": "한국어 기반 위험 분석이 재생성으로 완료되었습니다."
                }

    except APIError as e:
        print(f"❌ 강화된 한국어 위험분석 생성 실패 (API Error): {str(e)}")
        status_code = getattr(e, 'status_code', 500)
        error_message = f"AI 모델 통신 오류 (위험분석): {str(e)}"
        if getattr(e, 'code', None) == 'insufficient_quota':
            error_message = "AI 서비스 사용 한도를 초과했습니다 (위험분석)."
        
        fallback_text = fallback_korean_risk_analysis({})
        return {
            "success": False,
            "error": error_message,
            "status_code": status_code,
            "risk_analysis_text": fallback_text
        }
        
    except Exception as e:
        print(f"❌ 강화된 한국어 위험분석 생성 실패 (일반 오류): {str(e)}")
        import traceback
        traceback.print_exc()
        
        fallback_text = fallback_korean_risk_analysis({})
        return {
            "success": False,
            "error": f"한국어 위험분석 생성 중 예기치 않은 오류 발생: {str(e)}",
            "status_code": 500,
            "risk_analysis_text": fallback_text
        }


def enhanced_korean_based_summary(client, text: str) -> dict:
    """강화된 한국어 기준 요약 생성 - 구체성 향상"""
    print("📋 강화된 한국어 기준 요약 생성 중...")

    try:
        # 입력 텍스트가 너무 길면 잘라냄 (OpenAI 토큰 한계 고려)
        processed_text = text[:15000]

        # 계약서에서 핵심 정보 사전 추출
        key_info = extract_key_contract_info(processed_text)
        
        # 안전한 데이터 추출 함수 개선
        def safe_join(data, default_msg="정보 없음"):
            try:
                if isinstance(data, list) and data:
                    return ', '.join(str(item) for item in data)
                elif isinstance(data, (str, int, float)) and data:
                    return str(data)
                else:
                    return default_msg
            except Exception:
                return default_msg

        # 안전하게 문자열로 변환
        contract_type = str(key_info.get('contract_type', '미확인'))
        keywords = safe_join(key_info.get('keywords', []))
        financial_terms = safe_join(key_info.get('financial_terms', []))
        period_terms = safe_join(key_info.get('period_terms', []))

        # 추가 안전장치: 모든 변수를 str()로 한번 더 감싸기
        contract_type = str(contract_type)
        keywords = str(keywords)
        financial_terms = str(financial_terms)
        period_terms = str(period_terms)
        processed_text = str(processed_text)

        prompt = f"""다음 계약서를 정확하고 구체적으로 분석하여 요약해주세요.

**분석 구조** (반드시 이 순서대로):
1. **계약 목적**: 이 계약이 구체적으로 무엇을 위한 것인지
2. **주요 당사자**: 계약의 주체들과 각자의 구체적인 역할
3. **핵심 의무사항**: 각 당사자가 반드시 해야 할 구체적인 일들
4. **중요 조건**: 계약 이행을 위한 핵심 조건들 (기간, 금액, 방법 등)
5. **위험 요소**: 실제로 주의해야 할 구체적인 사항들

**추출된 핵심 정보**:
- 계약 유형: {contract_type}
- 주요 키워드: {keywords}
- 금액 관련: {financial_terms}
- 기간 관련: {period_terms}

**분석할 계약서**:
{processed_text}

각 항목에 대해 계약서의 구체적인 조항을 인용하면서 상세히 분석해주세요.
일반적이고 모호한 표현보다는 계약서에 실제로 명시된 내용을 기반으로 구체적으로 설명하세요."""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": """당신은 계약서 전문 분석가입니다. 다음 원칙을 따르세요:
1. 계약서의 실제 조항을 구체적으로 인용하세요
2. 일반적인 내용보다는 이 계약서만의 특징을 강조하세요
3. 실무에서 중요한 구체적인 사항들을 중점적으로 다루세요
4. 모호한 표현보다는 명확하고 구체적인 분석을 제공하세요"""},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1200,
            temperature=0.1
        )

        summary_text = response.choices[0].message.content.strip()
        print("✅ 강화된 한국어 요약 생성 완료.")
        return {
            "success": True,
            "summary_text": summary_text,
            "message": "한국어 기반 요약이 성공적으로 생성되었습니다."
        }

    except APIError as e:
        print(f"❌ 강화된 한국어 요약 생성 실패 (API Error): {str(e)}")
        status_code = getattr(e, 'status_code', 500)
        error_message = f"AI 모델 통신 오류 (요약): {str(e)}"
        if getattr(e, 'code', None) == 'insufficient_quota':
            error_message = "AI 서비스 사용 한도를 초과했습니다 (요약)."
        
        fallback_text = fallback_korean_summary()
        return {
            "success": False,
            "error": error_message,
            "status_code": status_code,
            "summary_text": fallback_text
        }
        
    except Exception as e:
        print(f"❌ 강화된 한국어 요약 생성 실패 (일반 오류): {str(e)}")
        import traceback
        traceback.print_exc()
        fallback_text = fallback_korean_summary()
        return {
            "success": False,
            "error": f"한국어 요약 생성 중 예기치 않은 오류 발생: {str(e)}",
            "status_code": 500,
            "summary_text": fallback_text
        }



def translate_to_target_language(client, korean_text, target_language, content_type="분석"):
    """한국어 텍스트를 목표 언어로 번역"""
    if target_language == "ko":
        return korean_text

    print(f"🔄 {content_type}을 {target_language}로 번역 중...")

    # 번역용 프롬프트
    translation_prompts = {
        "ja": f"""다음 한국어 계약서 {content_type} 결과를 정확하게 일본어로 번역해주세요.
구조와 내용은 그대로 유지하고, 오직 언어만 번역하세요.
반드시 일본어로만 답변하고, 한국어는 절대 사용하지 마세요.

번역할 내용:
{korean_text}

위 내용을 구조를 그대로 유지하면서 자연스러운 일본어로 번역해주세요.""",

        "zh": f"""请将以下韩语合同{content_type}结果准确翻译成中文。
保持结构和内容不变，只翻译语言。
必须只用中文回答，绝对不要使用韩语。

待翻译内容：
{korean_text}

请保持结构不变，翻译成自然的中文。""",

        "en": f"""Please accurately translate the following Korean contract {content_type} results into English.
Maintain the structure and content exactly, only translate the language.
You must respond ONLY in English, never use Korean.

Content to translate:
{korean_text}

Please translate this into natural English while maintaining the exact structure.""",

        "es": f"""Traduzca con precisión los siguientes resultados de {content_type} de contratos en coreano al español.
Mantenga exactamente la estructura y el contenido, solo traduzca el idioma.
Debe responder ÚNICAMENTE en español, nunca use coreano.

Contenido a traducir:
{korean_text}

Traduzca esto al español natural manteniendo la estructura exacta."""
    }

    # 번역 시스템 프롬프트
    translation_system_prompts = {
        "ja": "専門的な韓国語から日本語への翻訳者です。契約書分析の構造と内容を正確に保持しながら自然な日本語に翻訳します。",
        "zh": "专业韩语到中文翻译专家。在保持合同分析结构和内容的同时，翻译成自然的中文。",
        "en": "Professional Korean to English translator specializing in contract analysis. I maintain structure and content while translating into natural English.",
        "es": "Traductor profesional de coreano a español especializado en análisis de contratos. Mantengo la estructura y el contenido mientras traduzco al español natural."
    }

    user_prompt = translation_prompts.get(target_language)
    system_prompt = translation_system_prompts.get(target_language)

    if not user_prompt or not system_prompt:
        print(f"❌ {target_language} 번역 지원하지 않음")
        return korean_text

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=2000,  # 번역용으로 충분한 토큰
            temperature=0.1,   # 번역의 일관성을 위해 낮은 온도
            stop=None
        )

        translated_content = response.choices[0].message.content.strip()
        print(f"✅ {target_language} 번역 완료")
        return translated_content

    except Exception as e:
        print(f"❌ {target_language} 번역 실패: {str(e)}")
        return korean_text  # 번역 실패시 한국어 반환


def extract_key_contract_info(text):
    """계약서에서 핵심 정보 추출 - 안전성 강화"""
    info = {
        'contract_type': None,
        'keywords': [],
        'financial_terms': [],
        'period_terms': []
    }

    try:
        # 계약 유형 감지
        for contract_type in CONTRACT_TYPES_TERMS.keys():
            if any(term in text for term in CONTRACT_TYPES_TERMS[contract_type][:3]):
                info['contract_type'] = contract_type
                break

        # 핵심 키워드 추출
        import re

        # 금액 관련 용어
        financial_pattern = r'(대금|비용|요금|수수료|보증금|위약금|연체료|지체상금|계약금|잔금)'
        financial_matches = re.findall(financial_pattern, text)
        info['financial_terms'] = list(set(financial_matches)) if financial_matches else []

        # 기간 관련 용어
        period_pattern = r'(기간|기한|일자|날짜|시점|시기|완료|종료|만료)'
        period_matches = re.findall(period_pattern, text)
        info['period_terms'] = list(set(period_matches)) if period_matches else []

        # 일반 키워드
        general_keywords = ['계약', '당사자', '의무', '권리', '책임', '조건', '기준', '방법']
        info['keywords'] = [kw for kw in general_keywords if kw in text]

    except Exception as e:
        print(f"❌ 핵심 정보 추출 중 오류 발생: {e}")
        # 오류가 발생해도 기본 구조를 반환
        
    return info

# ========== 완전히 안전한 데이터 처리 함수들 ==========

def safe_extract_list_data(data, default_list=None):
    """데이터에서 안전하게 리스트를 추출하는 함수"""
    if default_list is None:
        default_list = []
    
    try:
        if isinstance(data, list):
            # 리스트인 경우 문자열로 변환 가능한 요소만 필터링
            return [str(item) for item in data if item is not None]
        elif isinstance(data, (str, int, float)) and data:
            return [str(data)]
        elif isinstance(data, dict):
            # 딕셔너리인 경우 값들을 리스트로 변환
            values = []
            for v in data.values():
                if isinstance(v, list):
                    values.extend([str(item) for item in v if item is not None])
                elif v is not None:
                    values.append(str(v))
            return values
        else:
            return default_list
    except Exception as e:
        print(f"❌ safe_extract_list_data 오류: {e}")
        return default_list

def safe_join_data(data, default_msg="정보 없음"):
    """데이터를 안전하게 문자열로 결합하는 함수"""
    try:
        # 먼저 안전한 리스트로 변환
        safe_list = safe_extract_list_data(data, [])

        if safe_list:
            # 빈 문자열이나 None 값 제거
            filtered_list = [item for item in safe_list if item and str(item).strip()]
            if filtered_list:
                return ', '.join(filtered_list)
        
        return default_msg
    except Exception as e:
        print(f"❌ safe_join_data 오류: {e}")
        return default_msg

def debug_data_type(data, name="data"):
    """데이터 타입을 디버깅하는 함수"""
    try:
        print(f"🔍 {name} 타입: {type(data)}")
        print(f"🔍 {name} 내용: {repr(data)}")
        if isinstance(data, dict):
            print(f"🔍 {name} 키들: {list(data.keys())}")
            for k, v in data.items():
                print(f"   {k}: {type(v)} = {repr(v)}")
    except Exception as e:
        print(f"❌ debug_data_type 오류: {e}")

# ========== 수정된 위험 정보 추출 함수 ==========

def extract_detailed_risk_info(text):
    """상세한 위험 관련 정보 추출 - 완전 안전 버전"""
    # 기본 구조를 명확히 정의
    risk_info = {
        'risk_keywords': [],
        'liability_terms': [],
        'termination_terms': [],
        'obligation_terms': [],
        'penalty_terms': []
    }

    try:
        import re

        # 각 패턴별로 안전하게 추출
        patterns = {
            'liability_terms': r'(손해배상|배상책임|배상의무|손실보상|피해보상|손해|배상)',
            'termination_terms': r'(해지|해제|종료|중단|파기|취소|철회)',
            'obligation_terms': r'(의무|책임|이행|준수|완수|수행|실행)',
            'penalty_terms': r'(위약금|연체료|지체상금|벌금|과태료|제재|처벌|징계)'
        }

        for key, pattern in patterns.items():
            try:
                matches = re.findall(pattern, text)
                if matches:
                    # 중복 제거하고 리스트로 저장
                    unique_matches = list(set(matches))
                    risk_info[key] = unique_matches
                    print(f"✅ {key}: {len(unique_matches)}개 발견")
                else:
                    risk_info[key] = []
            except Exception as e:
                print(f"❌ {key} 패턴 매칭 오류: {e}")
                risk_info[key] = []

        # 전체 위험 키워드 생성
        all_terms = []
        for key in ['liability_terms', 'termination_terms', 'penalty_terms']:
            terms = risk_info.get(key, [])
            if isinstance(terms, list):
                all_terms.extend(terms)
        
        risk_info['risk_keywords'] = list(set(all_terms)) if all_terms else []

        print(f"✅ 위험 정보 추출 완료: 총 {len(risk_info['risk_keywords'])}개 키워드")
        
        # 디버깅 정보 출력
        debug_data_type(risk_info, "risk_info")
        
        return risk_info

    except Exception as e:
        print(f"❌ 위험 정보 추출 중 심각한 오류: {e}")
        import traceback
        traceback.print_exc()
        # 오류 발생시에도 기본 구조 반환
        return risk_info

def validate_risk_analysis_quality(analysis_text):
    """위험분석 품질 검증"""
    try:
        quality_checks = {
            'length': len(analysis_text) >= 500,  # 최소 길이
            'structure': analysis_text.count('**') >= 8,  # 구조화 정도
            'specificity': '조' in analysis_text or '항' in analysis_text,  # 조항 인용
            'concreteness': any(word in analysis_text for word in ['구체적', '명시', '규정', '조항']),
            'practical': any(word in analysis_text for word in ['주의', '확인', '검토', '대응'])
        }

        score = sum(quality_checks.values()) / len(quality_checks)
        print(f"🔍 위험분석 품질 점수: {score:.1f} ({score*100:.0f}%)")

        for check, passed in quality_checks.items():
            print(f"   {check}: {'✅' if passed else '❌'}")

        return score >= 0.7  # 70% 이상

    except Exception as e:
        print(f"❌ 품질 검증 중 오류: {e}")
        return False  # 오류 발생시 검증 실패로 처리

def retry_enhanced_risk_analysis(client, text, risk_info):
    """위험분석 재시도 (더 구체적인 프롬프트) - 딕셔너리 반환 형식으로 수정"""
    print("🔄 더 구체적인 위험분석 재시도...")

    try:
        # 안전한 데이터 추출
        def safe_join(data, default_msg="정보 없음"):
            if isinstance(data, list) and data:
                return ', '.join(str(item) for item in data)
            elif isinstance(data, (str, int, float)) and data:
                return str(data)
            else:
                return default_msg

        risk_keywords = safe_join(risk_info.get('risk_keywords', []))

        enhanced_prompt = f"""이 계약서의 위험을 **매우 구체적으로** 분석하세요. 모호한 표현은 절대 사용하지 마세요.

주요 위험 키워드: {risk_keywords}

{text[:7000]}

각 위험에 대해 다음 형식으로 **반드시** 답변하세요:

**1. 손해배상 위험:**
• 관련 조항: "제○조 ○○○○" (실제 조항 인용)
• 구체적 위험: ○○상황에서 ○○원 또는 ○○% 배상
• 발생 조건: ○○할 경우 또는 ○○하지 않을 경우
• 대응 방안: ○○를 사전에 확인하고 ○○해야 함

위 형식으로 5가지 위험을 모두 분석하세요. "위험이 있다", "주의가 필요하다" 같은 모호한 표현은 사용 금지입니다."""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "계약서 위험분석 전문가. 반드시 구체적이고 실용적인 분석만 제공. 모호한 표현 절대 금지."},
                {"role": "user", "content": enhanced_prompt}
            ],
            max_tokens=1500,
            temperature=0.03
        )

        retry_result = response.choices[0].message.content.strip()
        print("✅ 재시도 위험분석 완료.")
        return {
            "success": True,
            "risk_analysis_text": retry_result,
            "message": "재시도를 통해 위험 분석이 성공적으로 생성되었습니다."
        }

    except Exception as e:
        print(f"❌ 재시도도 실패: {e}")
        fallback_text = fallback_korean_risk_analysis(risk_info)
        return {
            "success": False,
            "error": f"재시도 중 오류 발생: {e}",
            "risk_analysis_text": fallback_text
        }

def fallback_korean_summary():
    """폴백 요약"""
    return """## 📋 문서 요약

**계약 목적**
계약서의 구체적인 목적을 확인하기 위해 추가 분석이 필요합니다.

**주요 당사자**
계약 당사자와 각자의 역할을 명확히 파악하세요.

**핵심 의무사항**
각 당사자의 구체적인 의무사항을 검토하세요.

**중요 조건**
계약 이행 조건과 기준을 자세히 확인하세요.

**위험 요소**
구체적인 위험 사항에 대해서는 위험 분석을 참조하세요."""

def fallback_korean_risk_analysis(risk_info):
    """폴백 위험분석 - 추출된 정보 기반"""
    try:
        risk_keywords = safe_join_data(risk_info.get('risk_keywords') if isinstance(risk_info, dict) else [], "일반적인 계약 위험")
    except:
        risk_keywords = "일반적인 계약 위험"

    return f"""## ⚠️ 위험 분석

**발견된 주요 위험 요소:** {risk_keywords}

**1. 손해배상 위험:**
• 계약 위반시 손해배상 책임이 발생할 수 있습니다
• 배상 범위와 한계를 명확히 확인하세요
• 배상 책임의 구체적 조건을 검토하세요

**2. 계약해지 위험:**
• 일방적 해지 조건이 존재할 수 있습니다
• 해지시 불이익 조항을 주의깊게 확인하세요
• 해지 통지 방법과 기간을 확인하세요

**3. 의무위반 위험:**
• 의무 불이행시 제재 조치가 있을 수 있습니다
• 이행 기준과 방법을 명확히 하세요
• 위반시 구체적 결과를 파악하세요

**4. 재정적 위험:**
• 추가 비용이 발생할 가능성이 있습니다
• 지급 조건과 연체 위험을 확인하세요
• 비용 부담의 한계를 명확히 하세요

**5. 법적 위험:**
• 관련 법규를 준수해야 합니다
• 법적 분쟁 발생 가능성을 고려하세요
• 분쟁 해결 절차를 미리 확인하세요

구체적인 조항별 위험 분석을 위해 해당 조항을 직접 문의해 주세요."""



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