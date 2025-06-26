# teamproject/legal_web/apps/rag/prompt_manager.py


# --- 질의응답 관련 프롬프트 ---
def get_answer_prompt(context: str, user_question: str):
    return f"""
당신은 주어진 [참고 문서 내용]을 바탕으로 사용자의 질문에 답변하는 법률 AI 비서입니다.

# 지시사항
1. 사용자의 질문에 대한 답변을 [참고 문서 내용] 안에서 찾으세요.
2. 찾은 내용을 바탕으로, 질문의 핵심에 대해 명확하고 이해하기 쉽게 설명해주세요.
3. 만약 관련된 내용이 여러 조항에 걸쳐 있다면, 종합해서 설명해주세요.
4. **만약 정말로 관련된 내용을 찾을 수 없다면, 그때 "문서에서 관련 내용을 찾을 수 없습니다." 라고 답변하세요.**


[문서 내용]
{context}

[질문]
{user_question}
"""

