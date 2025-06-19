# teamproject/legal_web/apps/rag/services.py

from openai import OpenAI
from django.conf import settings

from . import retriever, prompt_manager

# OpenAI 클라이언트 초기화 (settings.py에 OPENAI_API_KEY가 설정되어 있어야 함)
client = OpenAI(api_key=settings.OPENAI_API_KEY)

# --- 문서 분석 서비스 ---
def analyze_document(uploaded_file, doc_type, language='ko'):
    """
    업로드된 파일을 분석하여 요약문과 검색을 위한 데이터(인덱스, 청크)를 반환합니다.
    이 함수는 DB와 독립적으로 작동합니다.
    """
    try:
        # 1. 파일에서 텍스트 추출
        document_text = retriever.get_document_text(uploaded_file)
        if not document_text:
            raise ValueError("문서에서 텍스트를 추출할 수 없습니다.")
            
        doc_type_name = "이용약관" if doc_type == "terms" else "계약서"

        # 2. Map-Reduce 방식으로 요약 생성
        # (문서가 짧을 경우를 대비한 로직은 간소화하고, Map-Reduce에 집중)
        summary_chunks = retriever.split_text_into_chunks(document_text, max_tokens=2000)
        
        # Map 단계: 각 청크 요약
        individual_summaries = []
        for chunk in summary_chunks:
            prompt = prompt_manager.get_summarize_chunk_prompt(chunk, doc_type_name)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.3,
            )
            individual_summaries.append(response.choices[0].message.content)
            
        # Reduce 단계: 요약본 종합
        final_summary_prompt = prompt_manager.get_combine_summaries_prompt(individual_summaries, doc_type_name)
        final_summary_response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": final_summary_prompt}],
            max_tokens=1000,
            temperature=0.7,
        )
        final_summary = final_summary_response.choices[0].message.content

        # 3. 위험 요소 식별
        risk_prompt = prompt_manager.get_risk_factors_prompt(document_text, language)
        risk_response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": risk_prompt}],
            max_tokens=1000,
            temperature=0.3,
        )
        risk_text = risk_response.choices[0].message.content
        
        # 4. 검색을 위한 FAISS 인덱스 생성
        qa_chunks = retriever.split_text_into_chunks(document_text, max_tokens=500) # QA용은 더 잘게
        faiss_index, indexed_chunks = retriever.create_faiss_index(client, qa_chunks)

        # 5. 최종 결과 반환 (딕셔너리 형태)
        return {
            "success": True,
            "summary": f"📋 문서 요약\n\n{final_summary}\n\n---\n\n⚠️ 위험 요소 식별\n\n{risk_text}",
            "faiss_index": faiss_index,
            "chunks": indexed_chunks,
        }

    except Exception as e:
        print(f"Error in analyze_document service: {e}")
        return {"success": False, "error": str(e)}


# --- 질의응답 서비스 ---
def get_answer(question, faiss_index, chunks, chat_history=[]):
    """
    주어진 질문과 검색 데이터(인덱스, 청크)를 바탕으로 답변을 생성합니다.
    """
    try:
        # 1. FAISS에서 관련 문서 조각 검색
        relevant_chunks = retriever.search_faiss_index(faiss_index, chunks, client, question)
        context = "\n\n".join(relevant_chunks)
        
        # 2. 프롬프트 생성 및 LLM 호출
        prompt = prompt_manager.get_answer_prompt(context, question)
        
        # 이전 대화 기록을 messages에 포함
        messages = [{"role": "system", "content": "당신은 법률 문서 전문가입니다. 주어진 내용을 바탕으로 답변하세요."}]
        for entry in chat_history:
            role = "user" if entry.get("sender") == "user" else "assistant"
            messages.append({"role": role, "content": entry.get("text")})
        messages.append({"role": "user", "content": prompt})
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=500,
            temperature=0.5,
        )
        answer = response.choices[0].message.content
        
        return {"success": True, "answer": answer}

    except Exception as e:
        print(f"Error in get_answer service: {e}")
        return {"success": False, "error": str(e)}