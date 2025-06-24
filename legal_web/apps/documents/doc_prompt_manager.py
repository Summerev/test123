# teamproject/legal_web/apps/documents/doc_prompt_manager.py

# --- 문서 요약 관련 프롬프트 ---
def get_summarize_chunk_terms_prompt(chunk_text, doc_type_name):
    return f"""
다음 {doc_type_name} 조항/내용을 3~5문장으로 간결하게 요약해 주세요. 법률 용어는 쉬운 말로 풀어서 설명해 주세요.

[원문 {doc_type_name} 조각]
{chunk_text}
"""

def get_combine_summaries_terms_prompt(summary_list, doc_type_name):
    combined_text = "\n\n".join(summary_list)
    return f"""
다음은 여러 {doc_type_name} 조항들의 요약본입니다. 이들을 종합하여 하나의 완성된 {doc_type_name} 요약본으로 만들어 주세요.

[요약 작성 규칙]
1. **언어**: 법률 용어와 어려운 문장은 일상적인 표현으로 풀어 써 주세요.
2. **구조**: 조항별 제목을 붙여 구분하고, 각 조항마다 핵심 내용을 2~3문장 이내로 정리해 주세요.
3. **형식**: 글머리 기호(✅, ●, – 등)를 적절히 사용해 시각적으로 구분해 주세요.
4. **길이**: 전체 요약본은 웹 기준 약 600~1000자 내외로 작성해 주세요.
5. **표기**: 요약본 하단에는 "이 문서는 이해를 돕기 위한 참고용입니다. 법적 효력은 정식 {doc_type_name} 원문을 기준으로 합니다."라는 문장을 추가해 주세요.

[개별 요약본]
{combined_text}
"""

# --- 위험 요소 식별 관련 프롬프트 ---
def get_risk_factors_terms_prompt(full_text: str):
    return f"""    
다음은 약관 전체 원문입니다. 아래와 같은 내용을 조항 번호와 함께 정리해주세요:

### 면책 또는 손해배상 조항
- 회사가 책임을 지지 않는다고 명시된 조항
- 보장하지 않는다고 명시된 조항
- "손해배상", "손해", "배상", "손실", "피해보상", "책임", "책임한계", "배상청구" 등의 단어가 포함된 조항

### 기타 주의사항
- 법적 분쟁, 계약 해지, 이용제한 등 고객에게 법적 영향을 줄 수 있는 조항

각 항목마다 관련된 조항 번호(예: 제15조)를 명시해 주세요.

[원문]
{full_text[:12000]}
"""


