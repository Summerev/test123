# teamproject/legal_web/apps/rag/prompt_manager.py


# --- 질의응답 관련 프롬프트 ---
def get_answer_prompt(context: str, user_question: str):
    return f"""
당신은 주어진 문서 내용을 바탕으로 질문에 답변하는 법률 AI 비서입니다.
반드시 아래 [문서 내용]만을 참고하여 질문에 답변하세요. 문서에 없는 내용은 답변할 수 없습니다.

[문서 내용]
{context}

[질문]
{user_question}
"""

