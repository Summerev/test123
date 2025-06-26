# apps/rag/services.py

from openai import OpenAI, APIError
from django.conf import settings
from django.contrib.auth.models import AnonymousUser

from apps.documents import doc_retriever
from . import prompt_manager

import re

from qdrant_client import QdrantClient, models

print("--- rag/services.py: Module imported ---")

# --- 클라이언트 초기화 ---
try:
    print("--- rag/services.py: Loading API Key... ---")
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
        print(f"\n[RAG 시작] 질문: '{question}'")

        final_context_chunks = []

        # --- 1. 질문 유형 분석 및 검색 전략 결정 ---
        article_match = re.search(r'(\d+)\s*조', question)
        
        # [전략 1: 조항 직접 검색]
        if article_match:
            article_number = article_match.group(1)
            keyword_pattern = rf'제\s*{article_number}\s*조'
            print(f"  - [전략 1: 조항 직접 검색] 패턴 '{keyword_pattern}'으로 검색합니다.")

            # 검색 대상 청크 리스트 준비
            all_chunks = []
            if isinstance(user, AnonymousUser):
                if not faiss_data or 'chunks' not in faiss_data:
                    return {"success": False, "error": "분석된 문서 정보가 없습니다."}
                all_chunks = faiss_data['chunks']
            else:
                # ★★★ 회원용 청크 로딩 구현 ★★★
                all_chunks = doc_retriever.get_all_chunks_from_qdrant(qdrant_client, user.id, session_id)

            # 전체 청크를 순회하며 키워드 검색
            for chunk in all_chunks:
                if re.search(keyword_pattern, chunk.split('\n')[0]):
                    final_context_chunks.append(chunk)

        # [전략 2: 의미 기반 검색 (조항 검색 실패 또는 일반 질문 시)]
        if not final_context_chunks:
            print("  - [전략 2: 의미 기반 검색]을 수행합니다.")
            search_query = question # 다국어 로직은 나중에 추가
            top_k = 7
            
            # ★★★★★ 여기가 수정된 핵심입니다 ★★★★★
            if isinstance(user, AnonymousUser):
                if not faiss_data or 'chunks' not in faiss_data:
                    return {"success": False, "error": "분석된 문서 정보가 없습니다."}
                final_context_chunks = doc_retriever.search_faiss_index(
                    index=faiss_data['index'],
                    chunks=faiss_data['chunks'],
                    client=client,
                    query=search_query,
                    top_k=top_k
                )
            else:
                final_context_chunks = doc_retriever.search_qdrant(
                    client=qdrant_client,
                    embedding_client=client,
                    query=search_query,
                    user_id=user.id,
                    session_id=session_id,
                    top_k=top_k
                )

        # --- 2. 최종 답변 생성 ---
        if not final_context_chunks:
            return {"success": True, "answer": "죄송합니다. 문서에서 관련 내용을 찾을 수 없습니다."}

        context = "\n\n---\n\n".join(final_context_chunks)

        # --- 3. 프롬프트 답변 생성  ---
        korean_prompt = prompt_manager.get_answer_prompt(context, question)

        messages = [{"role": "system", "content": "You are a helpful legal AI assistant."}]
        for entry in chat_history:
            role = "user" if entry.get("sender") == "user" else "assistant"
            messages.append({"role": role, "content": entry.get("text")})
        messages.append({"role": "user", "content": korean_prompt})

        response = client.chat.completions.create(model="gpt-3.5-turbo", messages=messages, max_tokens=700, temperature=0.5)
        answer_ko = response.choices[0].message.content

        # --- 4. 번역 ---
        final_answer = answer_ko
        lang_map = {'en': 'English', 'es': 'Spanish', 'ja': '일본어', 'zh': '중국어'}
        if language in lang_map:
            target_lang_name = lang_map[language]
            final_answer = _translate_text(answer_ko, target_lang_name)
        
        return {"success": True, "answer": final_answer}

    except APIError as e:
        error_message = f"AI 모델 통신 오류 (상태 코드: {e.status_code})" # pylint: disable=no-member
        if e.code == 'insufficient_quota':
            error_message = "AI 서비스 사용 한도를 초과하여 답변을 생성할 수 없습니다."
        return {"success": False, "error": error_message}
    
    except Exception as e:
        return {"success": False, "error": f"답변 생성 중 오류가 발생했습니다: {e}"}
    



