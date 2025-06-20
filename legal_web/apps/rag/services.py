# apps/rag/services.py

from openai import OpenAI
from django.conf import settings
from django.contrib.auth.models import AnonymousUser

from apps.documents import doc_retriever
from . import prompt_manager 

# 클라이언트 초기화 (settings.py에 OPENAI_API_KEY 설정)
client = OpenAI(api_key=settings.OPENAI_API_KEY)
qdrant_client = doc_retriever.get_qdrant_client()


# --- 질의응답 서비스 ---
def get_answer(user, session_id, question, faiss_data=None, chat_history=[]):
    """
    사용자 유형에 따라 다른 검색 소스에서 컨텍스트를 찾아 답변을 생성합니다.
    """
    try:
        # relevant_chunks 리스트를 초기화합니다.
        relevant_chunks = []
        
        # 1. 사용자 유형에 따른 검색 소스 선택
        if isinstance(user, AnonymousUser):
            # 비회원: 제공된 FAISS 데이터로 검색
            if not faiss_data or 'index' not in faiss_data or 'chunks' not in faiss_data:
                # 이 경우는 프론트엔드에서 데이터가 제대로 넘어오지 않았거나 세션이 만료된 경우입니다.
                # 사용자에게 파일을 다시 업로드하라는 명확한 안내를 반환하는 것이 좋습니다.
                return {"success": False, "error": "분석된 문서 정보가 만료되었습니다. 파일을 다시 업로드해주세요."}
            
            faiss_index = faiss_data['index']
            chunks = faiss_data['chunks']
            relevant_chunks = doc_retriever.search_faiss_index(faiss_index, chunks, client, question)
        else:
            # 회원: Qdrant에서 검색
            relevant_chunks = doc_retriever.search_qdrant(qdrant_client, client, question, user.id, session_id)

        # ★★★ 핵심 수정 부분 ★★★
        # 검색된 청크가 없는 경우, 더 이상 진행하지 않고 사용자에게 안내 메시지 반환
        if not relevant_chunks:
            return {"success": True, "answer": "죄송합니다. 현재 문서 내용에서 질문과 관련된 정보를 찾을 수 없습니다. 다른 질문을 시도해보세요."}

        # 검색된 청크가 있을 경우에만 컨텍스트를 생성
        context = "\n\n".join(relevant_chunks)
        
        # 2. 프롬프트 생성 및 LLM 호출 (공통)
        prompt = prompt_manager.get_answer_prompt(context, question)
        messages = [{"role": "system", "content": "당신은 법률 문서 전문가입니다. 주어진 내용을 바탕으로 답변하세요."}]
        for entry in chat_history:
            role = "user" if entry.get("sender") == "user" else "assistant"
            messages.append({"role": role, "content": entry.get("text")})
        messages.append({"role": "user", "content": prompt})
        
        response = client.chat.completions.create(model="gpt-3.5-turbo", messages=messages, max_tokens=500, temperature=0.5)
        answer = response.choices[0].message.content
        
        return {"success": True, "answer": answer}

    except Exception as e:
        print(f"Error in get_answer service: {e}")
        return {"success": False, "error": str(e)}