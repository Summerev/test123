# teamproject/legal_web/apps/documents/doc_services.py

from openai import OpenAI, APIError
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from sympy import im

from . import doc_retriever
from . import doc_prompt_manager

import os
import fitz
import docx
import traceback

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
def analyze_terms_document(user, uploaded_file, session_id, language='ko', doc_type='terms'):
    """
    문서 분석의 각 단계를 로그로 출력하며 실행하고, 모든 예외를 처리합니다.
    재귀적 요약 기능이 포함된 안정적인 버전입니다.
    """
    try:
        print(f"[약관 분석] 시작: {uploaded_file.name}")

        # --- 1. 텍스트 추출 ---
        document_text = doc_retriever.get_document_text(uploaded_file)
        if not document_text:
            raise ValueError("문서에서 텍스트를 추출할 수 없습니다.")
        doc_type_name = "이용약관" if doc_type == "terms" else "계약서"
        print(f"[1단계 완료] 텍스트 추출 성공 (총 글자 수: {len(document_text)}자).")

        # --- 2. 요약 및 위험 분석 ---
        try:
            # --- 2-1. Map-Reduce 요약 ---
            summary_chunks = doc_retriever.split_text_into_chunks_terms(document_text, chunk_size=4000)
            print(f"  - [2단계] 청크 갯수: {len(summary_chunks)}")

            individual_summaries = []
            for i, chunk in enumerate(summary_chunks):
                summary_prompt = doc_prompt_manager.get_summarize_chunk_terms_prompt(chunk, doc_type_name)
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo", messages=[{"role": "user", "content": summary_prompt}],
                    max_tokens=300, temperature=0.3
                )
                individual_summaries.append(response.choices[0].message.content)
            print(f"  - [Map 단계 완료] 생성한 개별 요약본 : {len(individual_summaries)}개")

            # --- 2-2. 재귀적 요약 (Reduce 단계) ---
            current_summaries = individual_summaries
            while len(current_summaries) > 1:
                print(f"    - 현재 요약본 {len(current_summaries)}개를 그룹으로 묶어 다시 요약합니다...")
                next_level_summaries = []
                # 10개씩 묶어서 처리
                for i in range(0, len(current_summaries), 10):
                    batch = current_summaries[i:i+10]
                    reduce_prompt = doc_prompt_manager.get_combine_summaries_terms_prompt(batch, doc_type_name)
                    intermediate_summary = client.chat.completions.create(
                        model="gpt-3.5-turbo", messages=[{"role": "user", "content": reduce_prompt}],
                        max_tokens=1500, temperature=0.5
                    ).choices[0].message.content
                    next_level_summaries.append(intermediate_summary)
                current_summaries = next_level_summaries
            
            final_summary_ko = current_summaries[0] if current_summaries else "요약 생성에 실패했습니다."
            print("  - [Reduce 단계 완료] 최종 요약본을 생성")

            # --- 2-3. 위험 요소 분석 ---
            risk_text_ko_prompt = doc_prompt_manager.get_risk_factors_terms_prompt(document_text)
            risk_text_ko = client.chat.completions.create(
                model="gpt-3.5-turbo", messages=[{"role": "user", "content": risk_text_ko_prompt}],
                max_tokens=1000, temperature=0.3
            ).choices[0].message.content
            print("  - [2단계 완료] 위험 요소 분석 완료")

        except Exception as summary_e:
            print(f"[치명적 오류 - 2단계] 요약 또는 위험 분석 중 오류 발생: {summary_e}")
            traceback.print_exc() 
            raise summary_e

        # --- 3. 번역 ---
        final_summary_lang, risk_text_lang = final_summary_ko, risk_text_ko
        lang_map = {'en': 'English', 'es': 'Spanish', 'ja': '일본어', 'zh': '중국어'}
        if language in lang_map:
            target_lang_name = lang_map[language]
            final_summary_lang = _translate_text(final_summary_ko, target_lang_name)
            risk_text_lang = _translate_text(risk_text_ko, target_lang_name)
        print("[3단계 완료] 번역 성공.")

        # 4. QA를 위한 벡터화
        qa_chunks = doc_retriever.split_text_into_chunks_terms(document_text, chunk_size=1500)
        
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
        print(f"[최종 오류 처리] 예상치 못한 일반 오류:")
        traceback.print_exc() # 모든 종류의 예외에 대한 상세 정보 출력
        return {"success": False, "error": "서버 내부 처리 중 오류가 발생했습니다.", "status_code": 500}



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
