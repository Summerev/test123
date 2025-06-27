# teamproject/legal_web/apps/documents/doc_prompt_manager.py


TRANSLATION_PROMPTS = {
    "ko": { 
        "translation_prompt_template": None,
    },
    "en": {
        "translation_prompt_template": """

# ABSOLUTE INSTRUCTION:
You are an expert legal document translator. Translate the following [Original Korean Text] into English.
# Strict Translation Rules (MUST FOLLOW):
1. Translate ALL Korean text into perfect, natural English.
2. The final output MUST NOT contain any Korean characters.
3. **Crucially, DO NOT add any extra explanations, definitions in parentheses, or any content that was not in the original text.**
4. Maintain the original markdown structure precisely.

---
[Original Korean Analysis]:
{text}
---

Now, provide the professional {language_code} translation.
""",
    },
    "ja": {
        "translation_prompt_template": """
# 絶対的指示：
あなたは専門的な法律文書の翻訳家です。以下の[原文韓国語テキスト]を日本語に翻訳してください。

# 厳格な翻訳ルール（必ず守ること）：
1. すべての韓国語テキストを完璧で自然な日本語に翻訳しなければなりません。
2. 結果物にはいかなる場合も韓国語が含まれていてはなりません。
3. **重要：括弧内に定義を追加するなど、原文になかった解説や内容を絶対に追加しないでください。**（例：「계약」→「契約」(O)、「契約(法的に拘束力のある合意...)」(X)）
4. 元のマークダウン構造（改行、#、- など）を正確に維持してください。

---
[原文韓国語テキスト]:
{text}
---

上記のルールを厳守して翻訳し、翻訳されたテキストのみを出력してください。
""",
    },
    "zh": { ... }, # 중국어용 프롬프트
    "es": { ... }, # 스페인어용 프롬프트
}


# --- 약관 문서 조각 요약 프롬프트 ---
def get_summarize_chunk_terms_prompt(chunk_text, doc_type_name):
    return f"""
# 지시: 아래 [원문]의 핵심 내용을 3~5 문장으로 간결하게 요약하세요.
# 규칙:
# 1. 원문의 단어와 표현을 최대한 그대로 사용하세요.
# 2. 당신의 해석이나 부가적인 설명을 추가하지 마세요. 오직 요약만 하세요.

[원문 {doc_type_name} 조각]:
{chunk_text}
"""

# --- 약관 문서 종합 요약 프롬프트 ---
def get_combine_summaries_terms_prompt(text_summary: str, doc_type_name: str = "이용약관"):
    """
    여러 중간 요약본을 바탕으로, 전문가 수준의 최종 분석 보고서를 생성하는 프롬프트.
    """
    return f"""
당신은 서비스 이용약관을 분석하는 최고의 전문가입니다. 아래 제공된 [약관 핵심 내용]을 바탕으로, 사용자가 반드시 알아야 할 내용들을 담은 최종 분석 보고서를 작성해주세요.
[약관 핵심 내용]에 없는 내용은 절대 추측해서 작성하지 마세요.

# 분석 보고서 필수 포함 내용 (이 구조를 반드시 따르세요):

✅ 아래 항목들을 순서대로 작성해주세요 (각 항목은 보기 좋게 구분하여 **(어울리는 이모지)+제목, 짧은 문단, 불릿 리스트**로 구성하세요):

---

### 서비스의 핵심 및 주요 권리/의무  
 이 약관이 다루는 **서비스의 본질**과 사용자/회사의 **주요 권리 및 의무**를 2~3 문단으로 정리해주세요.

---

### 개인정보 및 데이터 처리 방침  
수집, 제공, 파기 등 **개인정보 처리방침의 핵심 포인트**를 요약하고, 사용자가 자신의 정보가 어떻게 활용되는지 이해할 수 있게 설명해주세요.

---

### 사용자에게 유리한 조항  
사용자에게 도움이 되거나 **권익을 보호해주는 조항 2~3개**를 조항 번호와 함께 설명해주세요.  
예시:  
- 제10조: 탈퇴 요청 시 마이너스 하나머니 처리 가능  
- 제12조: 카드 위조 시 회사 책임 명시

---

### 사용자에게 불리하거나 주의가 필요한 조항  
독소조항 또는 금전적 손실 가능성이 있는 항목을 2~3개 찾아 조항 번호와 함께 명확히 정리해주세요.

---

### 총평 및 사용자 행동 강령  
이 약관의 전반적 성격을 평가하고, 사용자가 유의해야 할 점을 **조언 형태로 1~2가지** 작성해주세요.

---

작성 시, 각 항목은 명확한 마크다운 제목(`#`) 또는 **굵은 글씨**로 시작하고, 가독성을 높이기 위해 ✅, ⚠️, 📌 등 기호를 적절히 활용해주세요.

---
[참고할 약관 핵심 내용]:
{text_summary}
---

위 지침에 따라, 매우 전문적이고 구조화된 최종 분석 보고서를 한국어로 작성해주세요.
"""

# 위험 분석 프롬프트도 
def get_risk_factors_terms_prompt(full_text: str):
    return f"""
당신은 서비스 이용약관의 법적 리스크를 분석하는 전문가입니다. 아래 [약관 원문] 전체를 검토하여, 사용자가 겪을 수 있는 잠재적 위험을 모두 찾아내고, 구체적인 조항을 근거로 설명해주세요.

# 위험 분석 항목:
- **회사의 면책 조항:** 회사가 어떤 경우에 책임을 지지 않는다고 명시하고 있나요?
- **서비스 변경/중단:** 회사가 일방적으로 서비스를 변경하거나 중단할 수 있는 조건은 무엇인가요?
- **자동 결제 및 환불 정책:** 유료 서비스의 자동 결제, 구독 갱신, 환불 불가 조항 등 사용자의 금전적 손실과 관련된 내용은 무엇인가요?
- **계정 정지 및 해지:** 어떤 경우에 사용자의 계정이 정지되거나 해지될 수 있나요?

---
[약관 원문]:
{full_text[:15000]}
---
위 항목들을 중심으로 위험 요소를 분석하고, 관련 조항 번호를 반드시 명시하여 설명해주세요.
"""


'''
TRANSLATION_PROMPTS_LOCAL = {
    "ko": { 
        "translation_prompt_template": None,
    },
    "en": {
        "translation_prompt_template": """

# Your Role:
You are an expert legal and business translator. Your task is to translate the following [Original Korean Analysis] into fluent, professional {language_code}.

# Core Instruction:
Translate the content naturally, as if it were originally written in {language_code}. Do not sound like a machine translation.

# Critical Rule - NO Parenthetical Definitions:
- **You MUST NOT add explanatory definitions in parentheses.**
- **Correct Example:** `...the company is not liable for damages.`
- **Incorrect Example:** `...the company is not liable for damages (monetary compensation for loss...).`
- Simply translate the term. That's it.

# Other Rules:
- Translate all Korean text. The final output must only be in {language_code}.
- Keep the original markdown structure (headings, lists, etc.).

---
[Original Korean Analysis]:
{text}
---

Now, provide the professional {language_code} translation.
""",
    },
    "ja": {
        "translation_prompt_template": """
# 絶対的指示：
あなたは専門的な法律文書の翻訳家です。以下の[原文韓国語テキスト]を日本語に翻訳してください。

# 厳格な翻訳ルール（必ず守ること）：
1. すべての韓国語テキストを完璧で自然な日本語に翻訳しなければなりません。
2. 結果物にはいかなる場合も韓国語が含まれていてはなりません。
3. **重要：括弧内に定義を追加するなど、原文になかった解説や内容を絶対に追加しないでください。**（例：「계약」→「契約」(O)、「契約(法的に拘束力のある合意...)」(X)）
4. 元のマークダウン構造（改行、#、- など）を正確に維持してください。

---
[原文韓国語テキスト]:
{text}
---

上記のルールを厳守して翻訳し、翻訳されたテキストのみを出력してください。
""",
    },
    "zh": { ... }, # 중국어용 프롬프트
    "es": { ... }, # 스페인어용 프롬프트
}
'''
