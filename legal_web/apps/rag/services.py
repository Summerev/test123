# teamproject/legal_web/apps/rag/services.py

from openai import OpenAI
from django.conf import settings
from django.contrib.auth.models import AnonymousUser

from . import retriever
from . import prompt_manager

# OpenAI 클라이언트 초기화 (settings.py에 OPENAI_API_KEY 설정)
client = OpenAI(api_key=settings.OPENAI_API_KEY)
# Qdrant 클라이언트 초기화
qdrant_client = retriever.get_qdrant_client()

# --- 문서 분석 서비스 ---
def analyze_document(user, uploaded_file, doc_type, session_id, language='ko'):
    """
    업로드된 파일을 분석하여 요약문을 반환합니다.
    사용자 유형에 따라 벡터 데이터를 다른 방식으로 저장합니다.
    """
    try:
        # 1. 파일에서 텍스트 추출 및 기본 정보 설정
        document_text = retriever.get_document_text(uploaded_file)
        if not document_text:
            raise ValueError("문서에서 텍스트를 추출할 수 없습니다.")
        doc_type_name = "이용약관" if doc_type == "terms" else "계약서"

        # 2. Map-Reduce 방식으로 요약 생성 (이 로직은 회원/비회원 공통)
        summary_chunks = retriever.split_text_into_chunks(document_text, max_tokens=2000)
        individual_summaries = []
        for chunk in summary_chunks:
            prompt = prompt_manager.get_summarize_chunk_prompt(chunk, doc_type_name)
            response = client.chat.completions.create(model="gpt-3.5-turbo", messages=[{"role": "user", "content": prompt}], max_tokens=300, temperature=0.3)
            individual_summaries.append(response.choices[0].message.content)
            
        final_summary_prompt = prompt_manager.get_combine_summaries_prompt(individual_summaries, doc_type_name)
        final_summary_response = client.chat.completions.create(model="gpt-3.5-turbo", messages=[{"role": "user", "content": final_summary_prompt}], max_tokens=1000, temperature=0.7)
        final_summary = final_summary_response.choices[0].message.content

        # 3. 위험 요소 식별 (공통)
        risk_prompt = prompt_manager.get_risk_factors_prompt(document_text, language)
        risk_response = client.chat.completions.create(model="gpt-3.5-turbo", messages=[{"role": "user", "content": risk_prompt}], max_tokens=1000, temperature=0.3)
        risk_text = risk_response.choices[0].message.content

        # 4. QA를 위한 청크 준비
        qa_chunks = retriever.split_text_into_chunks(document_text, max_tokens=500)
        
        # 5. ★★★ 사용자 유형에 따른 분기 처리 ★★★
        if isinstance(user, AnonymousUser):
            # --- 비회원인 경우: FAISS 인덱스를 생성하여 반환 ---
            faiss_index, indexed_chunks = retriever.create_faiss_index(client, qa_chunks)
            storage_data = {"type": "faiss", "index": faiss_index, "chunks": indexed_chunks}
            print(f"비회원 분석 완료. FAISS 인덱스를 생성했습니다.")
        else:
            # --- 회원인 경우: Qdrant에 벡터를 저장 ---
            retriever.upsert_document_to_qdrant(qdrant_client, qa_chunks, client, user.id, session_id)
            storage_data = {"type": "qdrant"} # Qdrant는 별도 반환 데이터 없음
            print(f"회원(id:{user.id}) 분석 완료. Qdrant에 저장했습니다.")
            
        # 6. 최종 결과 반환
        return {
            "success": True,
            "summary": f"📋 문서 요약\n\n{final_summary}\n\n---\n\n⚠️ 위험 요소 식별\n\n{risk_text}",
            "storage_data": storage_data # 저장 방식과 데이터를 함께 전달
        }

    except Exception as e:
        print(f"Error in analyze_document service: {e}")
        return {"success": False, "error": str(e)}


# --- 질의응답 서비스 ---
def get_answer(user, session_id, question, faiss_data=None, chat_history=[]):
    """
    사용자 유형에 따라 다른 검색 소스에서 컨텍스트를 찾아 답변을 생성합니다.
    """
    try:
        # 1. ★★★ 사용자 유형에 따른 검색 소스 선택 ★★★
        if isinstance(user, AnonymousUser):
            # --- 비회원인 경우: 제공된 FAISS 데이터로 검색 ---
            if not faiss_data or 'index' not in faiss_data or 'chunks' not in faiss_data:
                raise ValueError("FAISS 데이터가 필요합니다.")
            faiss_index = faiss_data['index']
            chunks = faiss_data['chunks']
            relevant_chunks = retriever.search_faiss_index(faiss_index, chunks, client, question)
        else:
            # --- 회원인 경우: Qdrant에서 검색 ---
            relevant_chunks = retriever.search_qdrant(qdrant_client, client, question, user.id, session_id)

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