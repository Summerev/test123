# teamproject/legal_web/apps/documents/doc_services.py

from openai import OpenAI, APIError
from django.conf import settings
from django.contrib.auth.models import AnonymousUser

from . import doc_retriever
from . import doc_prompt_manager

import os
import fitz
import docx

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

# 약관 
def analyze_terms_document(user, uploaded_file, session_id, language='ko'):
    """
    약관 문서 분석: RAG 기반 요약 및 위험 요소 분석
    """
    try:
        print(f"[약관 분석] 시작: {uploaded_file.name}")
        
        # 1. 텍스트 추출
        document_text = doc_retriever.get_document_text(uploaded_file)
        if not document_text:
            raise ValueError("문서에서 텍스트를 추출할 수 없습니다.")
        
        doc_type_name = "이용약관"

        # 2. 한국어 기준으로 문서 요약 및 위험 요소 분석
        print("[약관 분석] OpenAI API로 분석 중...")
        summary_chunks = doc_retriever.split_text_into_chunks_terms(document_text, max_tokens=2000)
        
        # 개별 청크 요약
        individual_summaries = []
        for chunk in summary_chunks:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": doc_prompt_manager.get_summarize_chunk_terms_prompt(chunk, doc_type_name)}],
                max_tokens=300, 
                temperature=0.3
            )
            individual_summaries.append(response.choices[0].message.content)
        
        # 전체 요약 생성
        final_summary_ko_prompt = doc_prompt_manager.get_combine_summaries_terms_prompt(individual_summaries, doc_type_name)
        final_summary_ko = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": final_summary_ko_prompt}],
            max_tokens=1000, 
            temperature=0.7
        ).choices[0].message.content
        
        # 위험 요소 분석
        risk_text_ko_prompt = doc_prompt_manager.get_risk_factors_terms_prompt(document_text)
        risk_text_ko = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": risk_text_ko_prompt}],
            max_tokens=1000, 
            temperature=0.3
        ).choices[0].message.content

        # 3. 선택된 언어로 번역
        print("[약관 분석] 번역 처리 중...")
        final_summary_lang, risk_text_lang = final_summary_ko, risk_text_ko
        lang_map = {'en': 'English', 'es': 'Spanish', 'ja': '일본어', 'zh': '중국어'}
        if language in lang_map:
            target_lang_name = lang_map[language]
            final_summary_lang = _translate_text(final_summary_ko, target_lang_name)
            risk_text_lang = _translate_text(risk_text_ko, target_lang_name)

        # 4. QA를 위한 벡터화
        print("[약관 분석] 벡터화 처리 중...")
        qa_chunks = doc_retriever.split_text_into_chunks_terms(document_text, max_tokens=500)
        
        if isinstance(user, AnonymousUser):
            faiss_index, indexed_chunks = doc_retriever.create_faiss_index(client, qa_chunks)
            storage_data = {"type": "faiss", "index": faiss_index, "chunks": indexed_chunks}
        else:
            doc_retriever.upsert_document_to_qdrant(qdrant_client, qa_chunks, client, user.id, session_id)
            storage_data = {"type": "qdrant"}

        # 5. 결과 반환
        summary_text = f"📋 문서 요약\n\n{final_summary_lang}\n\n---\n\n⚠️ 위험 요소 식별\n\n{risk_text_lang}"
        
        print(f"[약관 분석] 완료: {uploaded_file.name}")
        return {
            "success": True,
            "summary": summary_text,
            "storage_data": storage_data,
            "message": "약관 분석이 완료되었습니다."
        }

    except APIError as e:
        error_message = f"AI 모델 통신 오류 (상태 코드: {e.status_code})"
        if e.code == 'insufficient_quota':
            error_message = "AI 서비스 사용 한도를 초과했습니다."
        
        print(f"[ERROR] 약관 분석 - OpenAI API Error: {e}")
        return {"success": False, "error": error_message}
    
    except Exception as e:
        print(f"[ERROR] 약관 분석 - Unexpected error: {e}")
        return {"success": False, "error": f"약관 분석 중 오류가 발생했습니다: {e}"}

def analyze_contract_document(user, uploaded_file, session_id, language='ko'):
    """
    계약서 문서 분석: 기존 방식의 텍스트 추출
    """
    try:
        print(f"[계약서 분석] 시작: {uploaded_file.name}")
        
        # 파일 확장자 확인
        filename = uploaded_file.name
        ext = os.path.splitext(filename)[1].lower().lstrip('.')
        
        content = ''
        if ext == 'pdf':
            doc = fitz.open(stream=uploaded_file.read(), filetype='pdf')
            content = "\n".join(page.get_text() for page in doc)
        elif ext == 'docx':
            document = docx.Document(uploaded_file)
            content = "\n".join(p.text for p in document.paragraphs)
        elif ext == 'txt':
            content = uploaded_file.read().decode('utf-8')
        elif ext == 'doc':
            return {
                "success": False,
                "error": ".doc 형식은 지원되지 않습니다. MS Word에서 .docx로 저장 후 다시 시도하세요."
            }
        else:
            return {
                "success": False,
                "error": f"지원하지 않는 파일 형식입니다: {ext}"
            }
        
        if not content.strip():
            return {
                "success": False,
                "error": "문서에서 텍스트를 추출할 수 없습니다."
            }
        
        print(f"[계약서 분석] 완료: {uploaded_file.name} ({len(content)}자)")
        return {
            "success": True,
            "text": content,
            "summary": f"📄 계약서 텍스트 추출 완료\n\n문서 길이: {len(content)}자\n\n추출된 내용을 바탕으로 질문해주세요.",
            "message": "계약서 텍스트 추출이 완료되었습니다."
        }
        
    except Exception as e:
        print(f"[ERROR] 계약서 분석 - Error: {e}")
        return {
            "success": False,
            "error": f"계약서 처리 중 오류가 발생했습니다: {e}"
        }
