# teamproject/legal_web/apps/documents/doc_services.py

from openai import OpenAI, APIError
from django.conf import settings
from django.contrib.auth.models import AnonymousUser

from . import doc_retriever 
from . import doc_prompt_manager 

# 클라이언트 초기화 (settings.py에 OPENAI_API_KEY 설정)
client = OpenAI(api_key=settings.OPENAI_API_KEY)
qdrant_client = doc_retriever.get_qdrant_client()




def _translate_text(text: str, target_lang_name: str) -> str:
    """
    주어진 텍스트를 지정된 언어로 번역하는 내부 함수.
    """
    if not text or target_lang_name == "한국어":
        return text
    try:
        prompt = f"다음 텍스트를 {target_lang_name}로 자연스럽게 번역해주세요. 원문의 서식(줄바꿈, 글머리 기호 등)을 최대한 유지해주세요:\n\n---\n{text}"
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2, # 번역의 일관성을 위해 낮은 온도로 설정
        )
        return response.choices[0].message.content.strip()
    except APIError as e:
        print(f"OpenAI API Error during translation: {e}")
        # API 오류 발생 시, 번역 실패 메시지와 함께 원문 반환
        return f"({target_lang_name} 번역 실패: API 오류) {text}"
    except Exception as e:
        print(f"Unexpected error during translation: {e}")
        return f"({target_lang_name} 번역 실패: 시스템 오류) {text}"

        
        

# --- 문서 분석 서비스 --- 
def analyze_document(user, uploaded_file, doc_type, session_id, language='ko'):
    """
    OpenAI API를 사용하여 문서를 분석하고, API 오류를 포함한 모든 예외를
    안정적으로 처리하여 명확한 JSON 응답을 반환합니다.
    """
    try:
        # --- 1. 텍스트 추출 ---
        document_text = doc_retriever.get_document_text(uploaded_file)
        if not document_text:
            raise ValueError("문서에서 텍스트를 추출할 수 없습니다.")
        doc_type_name = "이용약관" if doc_type == "terms" else "계약서"

        # --- 2. 한국어 기준으로 문서 요약 및 위험 요소 분석 ---
        print("Step 1: Analyzing document with Chat Completions API...")
        summary_chunks = doc_retriever.split_text_into_chunks(document_text, max_tokens=2000)
        individual_summaries = [
            client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": doc_prompt_manager.get_summarize_chunk_prompt(chunk, doc_type_name)}],
                max_tokens=300, temperature=0.3
            ).choices[0].message.content
            for chunk in summary_chunks
        ]
        final_summary_ko_prompt = doc_prompt_manager.get_combine_summaries_prompt(individual_summaries, doc_type_name)
        final_summary_ko = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": final_summary_ko_prompt}],
            max_tokens=1000, temperature=0.7
        ).choices[0].message.content
        risk_text_ko_prompt = doc_prompt_manager.get_risk_factors_prompt(document_text)
        risk_text_ko = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": risk_text_ko_prompt}],
            max_tokens=1000, temperature=0.3
        ).choices[0].message.content
        
        # --- 3. 선택된 언어로 결과 번역 ---
        print("Step 2: Translating results if necessary...")
        final_summary_lang, risk_text_lang = final_summary_ko, risk_text_ko
        lang_map = {'en': 'English', 'es': 'Spanish', 'ja': '일본어', 'zh': '중국어'}
        if language in lang_map:
            target_lang_name = lang_map[language]
            final_summary_lang = _translate_text(final_summary_ko, target_lang_name)
            risk_text_lang = _translate_text(risk_text_ko, target_lang_name)

        # --- 4. QA를 위한 벡터화 ---
        print("Step 3: Vectorizing document with Embeddings API...")
        qa_chunks = doc_retriever.split_text_into_chunks(document_text, max_tokens=500)
        
        if isinstance(user, AnonymousUser):
            faiss_index, indexed_chunks = doc_retriever.create_faiss_index(client, qa_chunks)
            storage_data = {"type": "faiss", "index": faiss_index, "chunks": indexed_chunks}
        else:
            doc_retriever.upsert_document_to_qdrant(qdrant_client, qa_chunks, client, user.id, session_id)
            storage_data = {"type": "qdrant"}

        # --- 5. 모든 것이 성공했을 때의 최종 결과 반환 ---
        return {
            "success": True,
            "summary": f"📋 문서 요약\n\n{final_summary_lang}\n\n---\n\n⚠️ 위험 요소 식별\n\n{risk_text_lang}",
            "storage_data": storage_data
        }


    except APIError as e:
        # OpenAI에서 보낸 에러 코드를 분석하여 명확한 메시지를 만듭니다.
        error_message = f"AI 모델 통신 오류 (상태 코드: {e.status_code})"
        if e.code == 'insufficient_quota':
            error_message = "AI 서비스 사용 한도를 초과했습니다. 관리자에게 문의해주세요."
        
        print(f"[ERROR] OpenAI API Error occurred: {e}")
        # 서버가 죽는 대신, 정상적인 JSON 에러 응답을 반환합니다.
        return {"success": False, "error": error_message}
    
    # 그 외 모든 예외(파일 읽기 실패 등)를 처리합니다.
    except Exception as e:
        print(f"[ERROR] Unexpected error occurred: {e}")
        return {"success": False, "error": f"문서 분석 중 오류가 발생했습니다: {e}"}
