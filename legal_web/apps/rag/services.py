# apps/rag/services.py

from openai import OpenAI, APIError
from django.conf import settings
from django.contrib.auth.models import AnonymousUser

from apps.documents import doc_retriever
from . import prompt_manager

import re

from qdrant_client import QdrantClient, models
import json

print("--- rag/services.py: Module imported ---")

# --- 클라이언트 초기화 ---
try:
    print("--- rag/services.py: Loading API Key... ---")
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    qdrant_client = doc_retriever.get_qdrant_client()
    print("--- rag/services.py: Clients initialized successfully ---") # 2. 클라이언트 초기화 확인
except Exception as e:
    print(f"[FATAL ERROR] Failed to initialize clients in rag/services.py: {e}")



import re

def _translate_text(text: str, target_lang_name: str) -> str:
    """
    텍스트를 번역한 후, 반복되는 괄호 설명을 제거하는 후처리 로직을 추가합니다.
    """
    if not text:
        return ""
    if target_lang_name == "한국어":
        return text
    try:
        prompt = f"""
# 절대적 지시사항:
당신은 매우 지능적이고 전문적인 법률 문서 번역가입니다. 아래 [원본 한국어 텍스트]를 {target_lang_name}로 번역해주세요.

# 엄격한 번역 규칙 (반드시 모두 준수):
1.  모든 한국어 텍스트를 {target_lang_name}로 완벽하게 번역해야 합니다.
2.  결과물에는 어떠한 경우에도 한국어가 남아있으면 안 됩니다.
3.  **특정 법률 용어(예: contract, damages)에 대한 부가 설명(괄호 안의 정의 등)은, 전체 문서에서 해당 용어가 '처음 등장할 때 단 한 번만' 추가할 수 있습니다.**
4.  **이미 설명한 용어가 다시 나오면, 그 다음부터는 오직 번역된 단어(예: contract)만 사용하고 부가 설명은 절대 반복하지 마세요.**
5.  원본의 마크다운 구조(줄바꿈, #, - 등)는 그대로 유지해주세요.

---
[원본 한국어 텍스트]:
{text}
---

위 규칙을 반드시 지켜서, 자연스럽고 전문적인 번역 결과물만 출력해주세요.
"""
        response = client.chat.completions.create(
            model="gpt-4o-mini",
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
        print(f"\n[RAG 시작] 원본 질문: '{question}'")

        # --- 1. 검색 전략 수립 ---
        
        # [1-1. 검색어 확장 및 재구성]
        # AI를 사용하여 사용자의 구어체 질문을 검색에 더 유리한 키워드와 문장으로 변환합니다.
        query_expansion_prompt = f"""
사용자의 다음 질문을 분석하여, 이 질문과 관련된 내용을 법률 문서에서 찾기 위한 최적의 검색어들을 추출해줘.
- 핵심 키워드 (1~3개)
- 의미적으로 유사한 동의어 또는 법률 용어
- 검색을 위한 완전한 문장 형태의 질문
- semantic_query는 사용자의 질문이 최우선이야

사용자 질문: "{question}"

출력 형식은 다음과 같이 JSON으로만 답변해줘:
{{
  "keywords": ["키워드1", "키워드2",],
  "semantic_query": "검색용 문장"
}}
"""
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "system", "content": "You are a query analysis expert."},
                          {"role": "user", "content": query_expansion_prompt}],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            query_data = json.loads(response.choices[0].message.content)
            keywords = query_data.get("keywords", [])
            semantic_query = query_data.get("semantic_query", question)
            print(f"  - AI 기반 검색어 확장: Keywords={keywords}, Semantic Query='{semantic_query}'")
        except Exception as e:
            print(f"  - 경고: 검색어 확장 실패. 원본 질문을 사용합니다. 오류: {e}")
            keywords = question.split()
            semantic_query = question


        final_context_chunks = []
        retrieved_chunks=[]

        # [전략 2: 의미 기반 검색 (조항 검색 실패 또는 일반 질문 시)]
          #[2-1. 의미 기반 검색 (기본)]
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

            '''
             # [2-2. 키워드 기반 재점수(Re-ranking)]
            
            print(f"  - [2단계: 키워드 재점수]를 수행합니다. (가져온 청크: {len(retrieved_chunks)}개)")

            if retrieved_chunks: # ★ 1차 검색 결과가 있을 때만 재점수 실행
                chunk_scores = []
                for chunk in retrieved_chunks:
                    score = 0
                    article_match = re.search(r'(\d+)\s*조', question)
                    if article_match and f"제{article_match.group(1)}조" in chunk.split('\n')[0]:
                        score += 100
                    
                    for kw in keywords:
                        if kw.lower() in chunk.lower():
                            score += 10
                    
                    chunk_scores.append({'chunk': chunk, 'score': score})
                    
                reranked_chunks = sorted(chunk_scores, key=lambda x: x['score'], reverse=True)
                
                # 점수가 0보다 큰, 즉 관련성이 있는 청크만 최종 후보로 선택
                final_context_chunks = [item['chunk'] for item in reranked_chunks if item['score'] > 0][:5]
                '''
        # ---  최종 답변 생성 ---
        if not final_context_chunks:
            return {"success": True, "answer": "죄송합니다. 문서에서 관련 내용을 찾을 수 없습니다."}

        context = "\n\n---\n\n".join(final_context_chunks)

        # --- 3. 프롬프트 답변 생성  ---
        korean_prompt = prompt_manager.get_answer_prompt(context, question, keywords)

        messages = [{"role": "system", "content": "You are a helpful legal AI assistant."}]
        for entry in chat_history:
            role = "user" if entry.get("sender") == "user" else "assistant"
            messages.append({"role": role, "content": entry.get("text")})
        messages.append({"role": "user", "content": korean_prompt})

        response = client.chat.completions.create(model="gpt-4o-mini", messages=messages, max_tokens=700, temperature=0.5)
        answer_ko = response.choices[0].message.content

        # --- 4. 번역 ---
        final_answer = answer_ko
        lang_map = {'en': 'English', 'es': 'Spanish', 'ja': '일본어', 'zh': '중국어'}
        if language in lang_map:
            target_lang_name = lang_map[language]
            final_answer = _translate_text(answer_ko, language_code=language)
        
        return {"success": True, "answer": final_answer}

    except APIError as e:
        error_message = f"AI 모델 통신 오류 (상태 코드: {e.status_code})" # pylint: disable=no-member
        if e.code == 'insufficient_quota':
            error_message = "AI 서비스 사용 한도를 초과하여 답변을 생성할 수 없습니다."
        return {"success": False, "error": error_message}
    
    except Exception as e:
        return {"success": False, "error": f"답변 생성 중 오류가 발생했습니다: {e}"}
    



