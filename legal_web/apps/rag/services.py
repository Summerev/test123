# apps/rag/services.py

from openai import OpenAI, APIError
from django.conf import settings
from django.contrib.auth.models import AnonymousUser

from apps.documents import doc_retriever
from . import prompt_manager

# --- 클라이언트 초기화 ---
client = OpenAI(api_key=settings.OPENAI_API_KEY)
qdrant_client = doc_retriever.get_qdrant_client()



def _translate_text(text: str, target_lang_name: str) -> str:
    """
    주어진 텍스트를 지정된 언어로 번역하는 내부 함수.
    """
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
    """
    사용자 유형에 따라 검색하고, 선택된 언어에 맞춰 답변을 생성/번역합니다.
    """
    try:
        # --- 1. 한국어 문서 DB에서 컨텍스트 검색 ---
        print(f"Searching context for question in Korean DB...")
        if isinstance(user, AnonymousUser):
            if not faiss_data or 'index' not in faiss_data or 'chunks' not in faiss_data:
                return {"success": False, "error": "분석된 문서 정보가 만료되었습니다. 파일을 다시 업로드해주세요."}
            relevant_chunks = doc_retriever.search_faiss_index(faiss_data['index'], faiss_data['chunks'], client, question)
        else:
            relevant_chunks = doc_retriever.search_qdrant(qdrant_client, client, question, user.id, session_id)

        if not relevant_chunks:
            # 검색 결과가 없을 때의 처리 (간단한 다국어 처리)
            no_context_answer = {
                'ko': "죄송합니다. 현재 문서 내용에서 질문과 관련된 정보를 찾을 수 없습니다.",
                'en': "Sorry, I couldn't find relevant information in the document for your question.",
                'ja': "申し訳ありませんが、文書内で質問に関連する情報を見つけることができませんでした。",
                'zh': "抱歉，在文档中未能找到与您问题相关的信息。",
                'es': "Lo siento, no pude encontrar información relevante en el documento para su pregunta."
            }
            return {"success": True, "answer": no_context_answer.get(language, no_context_answer['ko'])}

        context = "\n\n".join(relevant_chunks)

        # --- 2. 한국어로 답변 생성 ---
        print("Generating answer in Korean first...")
        korean_prompt = prompt_manager.get_answer_prompt(context, question)
        
        messages = [{"role": "system", "content": "You are a helpful legal AI assistant. Answer based on the provided context."}]
        for entry in chat_history:
            role = "user" if entry.get("sender") == "user" else "assistant"
            messages.append({"role": role, "content": entry.get("text")})
        messages.append({"role": "user", "content": korean_prompt})

        response = client.chat.completions.create(model="gpt-3.5-turbo", messages=messages, max_tokens=700, temperature=0.5)
        answer_ko = response.choices[0].message.content

        # --- 3. 선택된 언어로 답변 번역 ---
        lang_map = {'en': 'English', 'es': 'Spanish', 'ja': '일본어', 'zh': '중국어'}

        if language in lang_map:
            target_lang_name = lang_map[language]
            print(f"Translating answer to {target_lang_name}...")
            final_answer = _translate_text(answer_ko, target_lang_name)
        else: # 한국어
            final_answer = answer_ko
        
        return {"success": True, "answer": final_answer}

    except APIError as e:
        error_message = f"AI 모델 통신 중 오류가 발생했습니다. (에러: {e.status_code})"
        if e.code == 'insufficient_quota':
            error_message = "AI 서비스 사용 한도를 초과했습니다. 관리자에게 문의해주세요."
        print(f"OpenAI API Error in get_answer: {e}")
        return {"success": False, "error": error_message}
    except Exception as e:
        print(f"Unexpected error in get_answer: {e}")
        return {"success": False, "error": f"답변 생성 중 예기치 않은 오류가 발생했습니다: {e}"}