# apps/rag/services.py

from openai import OpenAI, APIError
from django.conf import settings
from django.contrib.auth.models import AnonymousUser

from apps.documents import doc_retriever
from . import prompt_manager

import re


print("--- rag/services.py: Module imported ---")

# --- 클라이언트 초기화 ---
try:
    print(f"--- rag/services.py: Loading API Key... ---")
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    qdrant_client = doc_retriever.get_qdrant_client()
    print("--- rag/services.py: Clients initialized successfully ---") # 2. 클라이언트 초기화 확인
except Exception as e:
    print(f"[FATAL ERROR] Failed to initialize clients in rag/services.py: {e}")



def _translate_text(text: str, target_lang_name: str) -> str:
    """
    주어진 텍스트를 지정된 언어로 번역하는 내부 함수.
    """
    print("--- rag/services.py: get_answer function started ---")
    
    if not text or target_lang_name == "한국어":
        return text
    try:
        prompt = f"다음 텍스트를 {target_lang_name}로 자연스럽게 번역해주세요:\n\n---\n{text}"
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Translation Error: {e}")
        return f"({target_lang_name} 번역 실패) {text}"



# 질의응답 서비스 함수 
# ★★★★★ 이 함수를 아래의 '단순한 RAG 버전'으로 교체해주세요 ★★★★★
def get_answer(user, session_id, question, language='ko', faiss_data=None, chat_history=[]):
    """
    (단순화된 버전) 사용자 유형에 따라 검색하고 답변을 생성/번역합니다.
    """
    try:
        print(f"[RAG 시작] 질문: '{question}'")
        # --- 1. 컨텍스트 검색 ---
        top_k = 5 # 기본 검색 결과 수를 3~5개로 설정

        if isinstance(user, AnonymousUser):
            if not faiss_data or 'index' not in faiss_data or 'chunks' not in faiss_data:
                return {"success": False, "error": "분석된 문서 정보가 만료되었습니다."}
            
            relevant_chunks = doc_retriever.search_faiss_index(
                index=faiss_data['index'],
                chunks=faiss_data['chunks'],
                client=client,
                query=question, # ★ 원래 질문을 그대로 검색에 사용
                top_k=top_k
            )
        else:
            relevant_chunks = doc_retriever.search_qdrant(
                client=qdrant_client,
                embedding_client=client,
                query=question, # ★ 원래 질문을 그대로 검색에 사용
                user_id=user.id,
                session_id=session_id,
                top_k=top_k
            )

        if not relevant_chunks:
            print("[RAG 결과] 관련성 높은 문서를 찾지 못했습니다.")
            return {"success": True, "answer": "죄송합니다. 문서에서 질문과 관련된 정보를 찾을 수 없습니다."}

        print(f"[RAG 결과] {len(relevant_chunks)}개의 관련성 높은 문서를 찾았습니다.")
        context = "\n\n---\n\n".join(relevant_chunks)

        # --- 2. 답변 생성 ---
        korean_prompt = prompt_manager.get_answer_prompt(context, question)
        
        messages = [{"role": "system", "content": "You are a helpful legal AI assistant."}]
        for entry in chat_history:
            role = "user" if entry.get("sender") == "user" else "assistant"
            messages.append({"role": role, "content": entry.get("text")})
        messages.append({"role": "user", "content": korean_prompt})

        response = client.chat.completions.create(model="gpt-3.5-turbo", messages=messages, max_tokens=700, temperature=0.5)
        answer_ko = response.choices[0].message.content

        # --- 3. 번역 ---
        final_answer = answer_ko
        lang_map = {'en': 'English', 'es': 'Spanish', 'ja': '일본어', 'zh': '중국어'}
        if language in lang_map:
            target_lang_name = lang_map[language]
            final_answer = _translate_text(answer_ko, target_lang_name)
        
        return {"success": True, "answer": final_answer}

    except APIError as e:
        error_message = f"AI 모델 통신 오류 (상태 코드: {e.status_code})"
        if e.code == 'insufficient_quota':
            error_message = "AI 서비스 사용 한도를 초과하여 답변을 생성할 수 없습니다."
        return {"success": False, "error": error_message}
    
    except Exception as e:
        return {"success": False, "error": f"답변 생성 중 오류가 발생했습니다: {e}"}