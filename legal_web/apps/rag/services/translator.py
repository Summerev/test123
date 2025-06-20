# apps/rag/services/translator.py
import os
import openai
from django.conf import settings

# 언어별 시스템 프롬프트 및 설정
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

class TranslationService:
    """번역 서비스 클래스"""
    
    def __init__(self):
        # OpenAI 클라이언트 초기화
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")
        
        self.client = openai.OpenAI(api_key=api_key)
    
    def translate_to_target_language(self, korean_text: str, target_language: str, content_type: str = "분석") -> str:
        """한국어 텍스트를 목표 언어로 번역"""
        if target_language == "한국어":
            return korean_text

        print(f"🔄 {content_type}을 {target_language}로 번역 중...")

        # 번역용 프롬프트
        translation_prompts = {
            "日本語": f"""다음 한국어 계약서 {content_type} 결과를 정확하게 일본어로 번역해주세요.
구조와 내용은 그대로 유지하고, 오직 언어만 번역하세요.
반드시 일본어로만 답변하고, 한국어는 절대 사용하지 마세요.

번역할 내용:
{korean_text}

위 내용을 구조를 그대로 유지하면서 자연스러운 일본어로 번역해주세요.""",

            "中文": f"""请将以下韩语合同{content_type}结果准确翻译成中文。
保持结构和内容不变，只翻译语言。
必须只用中文回答，绝对不要使用韩语。

待翻译内容：
{korean_text}

请保持结构不变，翻译成自然的中文。""",

            "English": f"""Please accurately translate the following Korean contract {content_type} results into English.
Maintain the structure and content exactly, only translate the language.
You must respond ONLY in English, never use Korean.

Content to translate:
{korean_text}

Please translate this into natural English while maintaining the exact structure.""",

            "Español": f"""Traduzca con precisión los siguientes resultados de {content_type} de contratos en coreano al español.
Mantenga exactamente la estructura y el contenido, solo traduzca el idioma.
Debe responder ÚNICAMENTE en español, nunca use coreano.

Contenido a traducir:
{korean_text}

Traduzca esto al español natural manteniendo la estructura exacta."""
        }

        # 번역 시스템 프롬프트
        translation_system_prompts = {
            "日本語": "専門的な韓国語から日本語への翻訳者です。契約書分析の構造と内容を正確に保持しながら自然な日本語に翻訳します。",
            "中文": "专业韩语到中文翻译专家。在保持合同分析结构和内容的同时，翻译成自然的中文。",
            "English": "Professional Korean to English translator specializing in contract analysis. I maintain structure and content while translating into natural English.",
            "Español": "Traductor profesional de coreano a español especializado en análisis de contratos. Mantengo la estructura y el contenido mientras traduzco al español natural."
        }

        user_prompt = translation_prompts.get(target_language)
        system_prompt = translation_system_prompts.get(target_language)

        if not user_prompt or not system_prompt:
            print(f"❌ {target_language} 번역 지원하지 않음")
            return korean_text

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=2000,
                temperature=0.1,
                stop=None
            )

            translated_content = response.choices[0].message.content.strip()
            print(f"✅ {target_language} 번역 완료")
            return translated_content

        except Exception as e:
            print(f"❌ {target_language} 번역 실패: {str(e)}")
            return korean_text

    def extract_legal_terms_from_korean_text(self, text: str) -> str:
        """한국어 텍스트에서만 어려운 법률 용어 추출 및 설명 제공"""
        legal_terms = IMPROVED_LANGUAGES["한국어"]["legal_terms"]
        found_terms = {}

        for term, explanation in legal_terms.items():
            if term in text:
                found_terms[term] = explanation
            elif len(term) >= 3:
                import re
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

class AnalysisService:
    """분석 서비스 클래스"""
    
    def __init__(self):
        # OpenAI 클라이언트 초기화
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")
        
        self.client = openai.OpenAI(api_key=api_key)
        self.translator = TranslationService()
    
    def enhanced_korean_based_summary(self, text: str) -> str:
        """강화된 한국어 기준 요약 생성"""
        print("📋 강화된 한국어 기준 요약 생성 중...")

        # 계약서에서 핵심 정보 사전 추출
        key_info = self._extract_key_contract_info(text)

        prompt = f"""다음 계약서를 정확하고 구체적으로 분석하여 요약해주세요.

**분석 구조** (반드시 이 순서대로):
1. **계약 목적**: 이 계약이 구체적으로 무엇을 위한 것인지
2. **주요 당사자**: 계약의 주체들과 각자의 구체적인 역할
3. **핵심 의무사항**: 각 당사자가 반드시 해야 할 구체적인 일들
4. **중요 조건**: 계약 이행을 위한 핵심 조건들 (기간, 금액, 방법 등)
5. **위험 요소**: 실제로 주의해야 할 구체적인 사항들

**추출된 핵심 정보**:
- 계약 유형: {key_info.get('contract_type', '미확인')}
- 주요 키워드: {', '.join(key_info.get('keywords', [])[:10])}
- 금액 관련: {', '.join(key_info.get('financial_terms', []))}
- 기간 관련: {', '.join(key_info.get('period_terms', []))}

**분석할 계약서**:
{text[:7000]}

각 항목에 대해 계약서의 구체적인 조항을 인용하면서 상세히 분석해주세요.
일반적이고 모호한 표현보다는 계약서에 실제로 명시된 내용을 기반으로 구체적으로 설명하세요."""

        try:
            response = self.client.chat.completions.create(
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

            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"❌ 강화된 한국어 요약 생성 실패: {e}")
            return self._fallback_korean_summary()

    def enhanced_korean_based_risk_analysis(self, text: str) -> str:
        """강화된 한국어 기준 위험 분석 생성"""
        print("⚠️ 강화된 한국어 기준 위험 분석 생성 중...")

        # 위험 관련 핵심 정보 사전 추출
        risk_info = self._extract_detailed_risk_info(text)

        prompt = f"""다음 계약서의 위험 요소를 매우 구체적이고 실용적으로 분석해주세요.

**위험 분석 구조** (반드시 이 순서대로):
1. **손해배상 위험**: 구체적인 배상 조항과 실제 위험성
2. **계약해지 위험**: 해지 조건과 실제 발생 가능한 불이익
3. **의무위반 위험**: 의무 불이행시 구체적인 제재와 결과
4. **재정적 위험**: 실제 금전적 손실 가능성과 규모
5. **법적 위험**: 구체적인 법률적 문제와 대응 방안

**추출된 위험 관련 정보**:
- 주요 위험 키워드: {', '.join(risk_info.get('risk_keywords', []))}
- 손해배상 관련: {', '.join(risk_info.get('liability_terms', []))}
- 해지 관련: {', '.join(risk_info.get('termination_terms', []))}
- 의무 관련: {', '.join(risk_info.get('obligation_terms', []))}
- 제재 관련: {', '.join(risk_info.get('penalty_terms', []))}

**분석할 계약서**:
{text[:8000]}

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

        try:
            response = self.client.chat.completions.create(
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

            result = response.choices[0].message.content.strip()
            return result

        except Exception as e:
            print(f"❌ 강화된 한국어 위험분석 생성 실패: {e}")
            return self._fallback_korean_risk_analysis(risk_info)

    def unified_analysis_with_translation(self, text: str, target_language: str) -> tuple:
        """강화된 한국어 분석 + 번역 통합 함수"""
        print(f"🌍 {target_language} 통일된 분석 시작 (강화된 한국어 기준)")

        # 1단계: 강화된 한국어 분석
        print("📋 1단계: 강화된 한국어 기준 분석 수행...")
        korean_summary = self.enhanced_korean_based_summary(text)
        korean_risk_analysis = self.enhanced_korean_based_risk_analysis(text)

        # 한국어인 경우 그대로 반환
        if target_language == "한국어":
            return korean_summary, korean_risk_analysis

        # 2단계: 다른 언어인 경우 번역 수행
        print(f"🔄 2단계: {target_language}로 번역 수행...")
        translated_summary = self.translator.translate_to_target_language(korean_summary, target_language, "요약")
        translated_risk = self.translator.translate_to_target_language(korean_risk_analysis, target_language, "위험분석")

        return translated_summary, translated_risk

    def generate_document_based_answer(self, question: str, context: str, target_language: str = "한국어") -> str:
        """문서 기반 답변 생성"""
        print(f"💬 문서 기반 답변 생성: {target_language}")

        korean_prompt = f"""아래 계약서 조항들을 바탕으로 질문에 정확히 답변해주세요.

질문: {question}

관련 계약서 조항들:
{context}

**중요한 답변 규칙**:
1. 위에 제공된 계약서 조항의 내용만을 바탕으로 답변하세요
2. 일반적인 법률 지식이나 추측은 절대 사용하지 마세요
3. 계약서에 명시되지 않은 내용은 "계약서에 명시되지 않음"이라고 하세요
4. 구체적인 조항 번호와 내용을 인용하여 답변하세요
5. 반드시 한국어로만 답변하세요

예시:
- "제5조에 따르면..."
- "계약서 제3조에는..."
- "해당 내용은 이 계약서에 명시되지 않았습니다"

위 계약서 조항들의 내용만을 근거로 정확히 답변해주세요."""

        try:
            # 한국어로 답변 생성 (문서 기반 강제)
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": """당신은 계약서 전문 해석 AI입니다.

**절대적 규칙**:
1. 제공된 계약서 조항의 내용만을 바탕으로 답변하세요
2. 일반적인 법률 지식을 사용하지 마세요
3. 추측하지 마세요
4. 계약서에 없는 내용은 "해당 내용이 계약서에 명시되지 않았습니다"라고 답변하세요
5. 반드시 구체적인 조항을 인용하세요
6. 한국어로만 답변하세요

이 규칙을 위반하면 답변을 거부당합니다."""},
                    {"role": "user", "content": korean_prompt}
                ],
                max_tokens=1000,
                temperature=0.03
            )

            korean_answer = response.choices[0].message.content.strip()

            # 한국어가 아닌 경우 번역
            if target_language != "한국어":
                answer = self.translator.translate_to_target_language(korean_answer, target_language, "답변")
            else:
                answer = korean_answer

            return answer

        except Exception as e:
            print(f"❌ 답변 생성 실패: {str(e)}")
            error_messages = {
                "한국어": f"답변 생성 중 오류가 발생했습니다: {str(e)}",
                "日本語": f"回答生成中にエラーが発生しました: {str(e)}",
                "中文": f"生成回答时发生错误: {str(e)}",
                "English": f"Error occurred while generating response: {str(e)}",
                "Español": f"Error al generar respuesta: {str(e)}"
            }
            return error_messages.get(target_language, error_messages["한국어"])

    def _extract_key_contract_info(self, text: str) -> dict:
        """계약서에서 핵심 정보 추출"""
        from .document_processor import CONTRACT_TYPES_TERMS
        import re

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

    def _extract_detailed_risk_info(self, text: str) -> dict:
        """상세한 위험 관련 정보 추출"""
        import re

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

    def _fallback_korean_summary(self) -> str:
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

    def _fallback_korean_risk_analysis(self, risk_info: dict) -> str:
        """폴백 위험분석"""
        risk_keywords = risk_info.get('risk_keywords', [])

        return f"""## ⚠️ 위험 분석

**발견된 주요 위험 요소:** {', '.join(risk_keywords[:5]) if risk_keywords else '일반적인 계약 위험'}

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

    # rag/services/translator.py의 AnalysisService 클래스에 추가할 메소드들

    def validate_risk_analysis_quality(self, analysis_text: str) -> bool:
        """위험분석 품질 검증"""
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

    def retry_enhanced_risk_analysis(self, text: str, risk_info: dict) -> str:
        """위험분석 재시도 (더 구체적인 프롬프트)"""
        print("🔄 더 구체적인 위험분석 재시도...")

        enhanced_prompt = f"""이 계약서의 위험을 **매우 구체적으로** 분석하세요. 모호한 표현은 절대 사용하지 마세요.

    {text[:7000]}

    각 위험에 대해 다음 형식으로 **반드시** 답변하세요:

    **1. 손해배상 위험:**
    - 관련 조항: "제○조 ○○○○" (실제 조항 인용)
    - 구체적 위험: ○○상황에서 ○○원 또는 ○○% 배상
    - 발생 조건: ○○할 경우 또는 ○○하지 않을 경우
    - 대응 방안: ○○를 사전에 확인하고 ○○해야 함

    위 형식으로 5가지 위험을 모두 분석하세요. "위험이 있다", "주의가 필요하다" 같은 모호한 표현은 사용 금지입니다."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "계약서 위험분석 전문가. 반드시 구체적이고 실용적인 분석만 제공. 모호한 표현 절대 금지."},
                    {"role": "user", "content": enhanced_prompt}
                ],
                max_tokens=1500,
                temperature=0.03
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"❌ 재시도도 실패: {e}")
            return self._fallback_korean_risk_analysis(risk_info)