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

def get_answer(user, session_id, question, language='ko', faiss_data=None, chat_history=[]):

    try:
        print(f"[RAG 시작] 질문: '{question}'")

        # --- 1. 넓게 검색 (top_k=20) ---
        top_k_initial = 20
        
        if isinstance(user, AnonymousUser):
            # 비회원 FAISS 검색
            if not faiss_data or 'index' not in faiss_data or 'chunks' not in faiss_data:
                return {"success": False, "error": "분석된 문서 정보가 만료되었습니다."}
            
            initial_chunks = doc_retriever.search_faiss_index(
                index=faiss_data['index'],
                chunks=faiss_data['chunks'],
                client=client,
                query=question,
                top_k=top_k_initial
            )
        else:
            # 회원 Qdrant 검색
            initial_chunks = doc_retriever.search_qdrant(
                client=qdrant_client,
                embedding_client=client,
                query=question,
                user_id=user.id,
                session_id=session_id,
                top_k=top_k_initial
            )
        
        print(f"  - 1차 검색 결과: {len(initial_chunks)}개의 청크를 가져왔습니다.")

        # --- 2. 키워드 후처리 및 재정렬 ---
        article_match = re.search(r'(\d+)\s*조', question)
        
        if article_match and initial_chunks:
            article_number = article_match.group(1)
            keyword = f"제{article_number}조"
            print(f"  - 질문에서 키워드 '{keyword}'를 감지하여 결과를 재정렬합니다.")
            
            with_keyword = []
            without_keyword = []
            for chunk in initial_chunks:
                if chunk.strip().startswith(keyword):
                    with_keyword.append(chunk)
                else:
                    without_keyword.append(chunk)
            
            relevant_chunks = with_keyword + without_keyword
        else:
            relevant_chunks = initial_chunks
        
        # --- 3. 최종 컨텍스트 선택 ---
        final_context_chunks = relevant_chunks[:5] # 상위 5개만 사용
        
        if not final_context_chunks:
            return {"success": True, "answer": "죄송합니다. 문서에서 질문과 관련된 정보를 찾을 수 없습니다."}
            
        print(f"  - 최종적으로 {len(final_context_chunks)}개의 청크를 컨텍스트로 사용합니다.")
        context = "\n\n---\n\n".join(final_context_chunks)

        # --- 4. 답변 생성  ---
        korean_prompt = prompt_manager.get_answer_prompt(context, question)
        
        messages = [{"role": "system", "content": "You are a helpful legal AI assistant."}]
        for entry in chat_history:
            role = "user" if entry.get("sender") == "user" else "assistant"
            messages.append({"role": role, "content": entry.get("text")})
        messages.append({"role": "user", "content": korean_prompt})

        response = client.chat.completions.create(model="gpt-3.5-turbo", messages=messages, max_tokens=700, temperature=0.5)
        answer_ko = response.choices[0].message.content

        # --- 5. 번역 ---
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