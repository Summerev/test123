# teamproject/legal_web/apps/documents/doc_services.py

from openai import OpenAI, APIError
from django.conf import settings
from django.contrib.auth.models import AnonymousUser

from . import doc_retriever
from . import doc_prompt_manager
from . import doc_retriever_content

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
    문서 분석의 각 단계를 로그로 출력하며 실행하고, 모든 예외를 처리합니다.
    재귀적 요약 기능이 포함된 안정적인 버전입니다.
    """
    try:
        print("\n[함수 시작] 'analyze_terms_document'가 호출되었습니다.")

        # --- 1. 텍스트 추출 ---
        print("[1단계] 파일에서 텍스트를 추출합니다...")
        document_text = doc_retriever.get_document_text(uploaded_file)
        if not document_text:
            raise ValueError("문서에서 텍스트를 추출할 수 없습니다.")
        doc_type_name = "이용약관"
        print(f"[1단계 완료] 텍스트 추출 성공 (총 글자 수: {len(document_text)}자).")

        # --- 2. 요약 및 위험 분석 ---
        # 이 전체 블록을 별도의 try-except로 감싸서 문제 지점을 특정합니다.
        try:
            print("\n[2단계] AI를 이용한 요약 및 위험 분석을 시작합니다...")

            # --- 2-1. Map-Reduce 요약 ---
            print("  - [2-1 시작] 문서를 요약용 청크로 분할합니다...")
            summary_chunks = doc_retriever.split_text_into_chunks_terms(document_text, chunk_size=4000)
            print(f"  - 요약을 위해 문서를 {len(summary_chunks)}개의 청크로 나누었습니다.")

            print("  - [Map 단계] 각 청크를 개별적으로 요약합니다...")
            individual_summaries = []
            for i, chunk in enumerate(summary_chunks):
                summary_prompt = doc_prompt_manager.get_summarize_chunk_terms_prompt(chunk, doc_type_name)
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo", messages=[{"role": "user", "content": summary_prompt}],
                    max_tokens=300, temperature=0.3
                )
                individual_summaries.append(response.choices[0].message.content)
            print(f"  - [Map 단계 완료] {len(individual_summaries)}개의 개별 요약본을 생성했습니다.")

            # --- 2-2. 재귀적 요약 (Reduce 단계) ---
            print("  - [Reduce 단계] 요약본들을 하나로 합치는 작업을 시작합니다...")
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
            print("  - [Reduce 단계 완료] 최종 요약본을 생성했습니다.")

            # --- 2-3. 위험 요소 분석 ---
            print("  - [위험 요소 분석 시작]...")
            risk_text_ko_prompt = doc_prompt_manager.get_risk_factors_terms_prompt(document_text)
            risk_text_ko = client.chat.completions.create(
                model="gpt-3.5-turbo", messages=[{"role": "user", "content": risk_text_ko_prompt}],
                max_tokens=1000, temperature=0.3
            ).choices[0].message.content
            print("  - [위험 요소 분석 완료].")
            print("[2단계 완료] 요약 및 위험 분석이 모두 끝났습니다.")

        except Exception as summary_e:
            print(f"[치명적 오류 - 2단계] 요약 또는 위험 분석 중 오류 발생: {summary_e}", exc_info=True)
            raise summary_e

        # --- 3. 번역 ---
        print(f"\n[3단계] 결과를 '{language}' 언어로 번역합니다...")
        final_summary_lang, risk_text_lang = final_summary_ko, risk_text_ko
        lang_map = {'en': 'English', 'es': 'Spanish', 'ja': '일본어', 'zh': '중국어'}
        if language in lang_map:
            target_lang_name = lang_map[language]
            final_summary_lang = _translate_text(final_summary_ko, target_lang_name)
            risk_text_lang = _translate_text(risk_text_ko, target_lang_name)
        print("[3단계 완료] 번역 성공.")

        # --- 4. QA를 위한 벡터화 ---
        try:
            print("\n[4단계] 질의응답(QA)을 위한 텍스트 분할 및 벡터화를 시작합니다...")
            qa_chunks = doc_retriever.split_text_into_chunks_terms(document_text, chunk_size=1500)
            chunk_count = len(qa_chunks)
            print(f"  - 텍스트가 {chunk_count}개의 조각으로 분할되었습니다.")

            print("  - 텍스트 벡터화(임베딩) 시작...")
            vectors = doc_retriever.get_embeddings(client, qa_chunks)
            print(f"  - 총 {len(vectors)}개 벡터 생성 완료.")

            if isinstance(user, AnonymousUser):
                print("  - FAISS 인덱스 생성 중...")
                faiss_index = doc_retriever.create_faiss_index_from_vectors(vectors)

                storage_data = {"type": "faiss", "index": faiss_index, "chunks": qa_chunks}
                print("  - 비회원용 FAISS 인덱스 및 청크 저장 완료.")
            else:
                print("  - Qdrant DB에 벡터 저장 시작...")

                doc_retriever.upsert_vectors_to_qdrant(
                    client=qdrant_client,
                    chunks=qa_chunks,
                    vectors=vectors,
                    user_id=user.id,
                    session_id=session_id
                )
                storage_data = {"type": "qdrant"}
                print(f"  - 회원(ID:{user.id})용 Qdrant DB에 저장 완료.")

            print("[4단계 완료] 벡터화 및 저장 성공.")
        except Exception as vector_e:
            print(f"[치명적 오류 - 4단계] 벡터화 또는 DB 저장 중 오류 발생: {vector_e}", exc_info=True)
            raise vector_e

        # --- 5. 최종 결과 반환 ---
        print("\n[성공] 모든 단계가 완료되어 성공 응답을 반환합니다.")
        return {
            "success": True,
            "summary": f"📋 문서 요약\n\n{final_summary_lang}\n\n---\n\n⚠️ 위험 요소 식별\n\n{risk_text_lang}",
            "storage_data": storage_data,
            "chunk_count": chunk_count
        }

    # ★★★ 바깥쪽 최종 예외 처리 블록 ★★★
    except APIError as e:
        print(f"\n[최종 오류 처리] OpenAI API 에러를 감지했습니다.")
        status_code = getattr(e, 'status_code', 500)
        error_message = f"AI 모델 통신 오류 (상태 코드: {status_code})"

        if getattr(e, 'code', None) == 'insufficient_quota':
            error_message = "AI 서비스 사용 한도를 초과했습니다."

        return {
            "success": False,
            "error": error_message,
            "status_code": status_code
        }

    except Exception as e:
        print(f"\n[최종 오류 처리] 예상치 못한 일반 에러를 감지했습니다.")
        return {"success": False, "error": "서버 내부 처리 중 오류가 발생했습니다.", "status_code": 500}

# ----------------------------------------------------------

def analyze_contract_document(user, uploaded_file, session_id, language='ko'):
    print("\n[함수 시작] 'analyze_contract_document'가 호출되었습니다.")
    try:
        # --- 1. 텍스트 추출 ---
        print("[1단계] 파일에서 텍스트를 추출합니다...")
        document_text = doc_retriever.get_document_text(uploaded_file)
        if not document_text:
            print("[1단계 오류] 문서에서 텍스트를 추출할 수 없습니다.")
            return {"success": False, "error": "문서에서 텍스트를 추출할 수 없습니다.", "status_code": 400}
        doc_type_name = "계약서"
        print(f"[1단계 완료] 텍스트 추출 성공 (총 글자 수: {len(document_text)}자).")


        # --- 2. 계약서 유형 감지 및 조항별 추출 ---
        print("[2단계] 계약서 유형 감지 및 조항 추출 시작...")
        detected_contract_type, confidence, contract_type_info = doc_retriever_content.detect_contract_type(document_text)
        print(f"  - 감지된 계약서 유형: {detected_contract_type} (신뢰도: {confidence:.2f})")

        document_chunks_raw = doc_retriever_content.extract_articles_with_content(document_text)
        if not document_chunks_raw:
             print("[2단계 오류] 텍스트를 유효한 조항 청크로 분할할 수 없습니다.")
             return {"success": False, "error": "계약서 조항 분할에 실패했습니다.", "status_code": 400}
        print(f"📋 총 {len(document_chunks_raw)}개 청크 생성 완료.")
        chunk_count = len(document_chunks_raw)

        # --- 3. 키워드 인덱스 생성 ---
        print("[3단계] 키워드 인덱스 생성 중...")
        keyword_index = doc_retriever_content.create_enhanced_keyword_index(document_chunks_raw, detected_contract_type)
        print(f"[3단계 완료] 키워드 인덱스 생성 완료.")

        # --- 4. 텍스트 강화 및 벡터화(임베딩) ---
        print("[4단계] 텍스트 강화 및 임베딩 생성 시작...")
        enhanced_texts, payloads = doc_retriever_content.enhance_document_texts(
            document_chunks_raw, # 원본 청크 사용
            user_id=user.id if user.is_authenticated else None, # AnonymousUser일 경우 None 전달
            session_id=session_id
        )
        if not enhanced_texts or not payloads:
            print("[4단계 오류] 텍스트 강화 또는 페이로드 생성 실패.")
            return {"success": False, "error": "문서 텍스트 강화에 실패했습니다.", "status_code": 500}

        print("  - 텍스트 벡터화(임베딩) 시작...")
        # 여기서 정의된 openai_client를 사용
        vectors = doc_retriever.get_embeddings(client, enhanced_texts)
        if not vectors:
            print("[4단계 오류] 벡터 생성 실패.")
            return {"success": False, "error": "텍스트 임베딩 생성에 실패했습니다.", "status_code": 500}
        print(f"[4단계 완료] 총 {len(vectors)}개 벡터 생성 완료.")

        # --- 5. 벡터 저장 (FAISS 또는 Qdrant) ---
        storage_data = {} # 결과에 포함될 스토리지 정보
        print("[5단계] 벡터 저장 처리 (회원/비회원 구분)...")
        if isinstance(user, AnonymousUser):
            print("  - 비회원: FAISS 인덱스 생성 중...")
            faiss_index = doc_retriever.create_faiss_index_from_vectors(vectors)
            if faiss_index is None:
                print("  - FAISS 인덱스 생성 실패.")
                return {"success": False, "error": "FAISS 인덱스 생성 실패.", "status_code": 500}
            storage_data = {"type": "faiss", "index": faiss_index, "chunks": enhanced_texts, "payloads": payloads}
            print("  - 비회원용 FAISS 인덱스 및 청크 저장 완료.")
        else:
            print("  - 회원: Qdrant DB에 벡터 저장 시작...")
            # qdrant_client가 미리 정의되었는지 확인
            if qdrant_client is None:
                print("  - Qdrant 클라이언트가 정의되지 않았습니다 (회원인데 DB 연결 실패).")
                return {"success": False, "error": "데이터베이스 연결 오류 (Qdrant 클라이언트 없음).", "status_code": 500}

            upsert_success = doc_retriever.upsert_vectors_to_qdrant(
                client=qdrant_client,
                chunks=enhanced_texts,
                vectors=vectors,
                user_id=user.id,
                session_id=session_id,
                payloads=payloads  # 계약서용 상세 페이로드 추가
            )
            if not upsert_success:
                print("  - Qdrant DB에 벡터 저장 실패.")
                return {"success": False, "error": "Qdrant에 벡터 저장 실패.", "status_code": 500}
            storage_data = {"type": "qdrant"}
            print(f"  - 회원(ID:{user.id})용 Qdrant DB에 저장 완료.")


        # --- 6. 통합 분석 (요약 및 위험 분석) ---
        print(f"[6단계] {language} 통일된 분석 시작 (한국어 기준 번역 방식)...")
        
        # doc_retriever_content.unified_analysis_with_translation 함수 호출
        # 이 함수가 (final_summary_lang_string, risk_text_lang_string) 형태의 튜플을 반환한다고 가정
        analysis_result_tuple = doc_retriever_content.unified_analysis_with_translation(client, document_text, language) # client 인자 없는 기존 함수에 맞춰 수정

        # !!!!!!! 여기서 튜플을 직접 언패킹하여 변수에 할당합니다 !!!!!!!
        # 이제 analysis_result_tuple.get('success', False) 이런 코드는 더 이상 사용하지 않습니다.
        # 오류 처리가 필요하다면, analysis_result_tuple의 내용이 비어있거나 예상과 다를 때를 처리해야 합니다.
        if not isinstance(analysis_result_tuple, tuple) or len(analysis_result_tuple) != 2:
            print(f"[6단계 오류] unified_analysis_with_translation이 예상치 못한 형식의 값을 반환했습니다: {analysis_result_tuple}")
            return {"success": False,
                    "error": "통합 분석 서비스에서 예상치 못한 반환 형식.",
                    "status_code": 500}

        final_summary_lang = analysis_result_tuple[0] # 튜플의 첫 번째 요소가 요약
        risk_text_lang = analysis_result_tuple[1]    # 튜플의 두 번째 요소가 위험 분석

        # 이전에 정의된 chunk_count 변수를 사용하거나 계산합니다.
        # 예: chunk_count = len(document_chunks_raw)
        chunk_count = len(document_chunks_raw) if 'document_chunks_raw' in locals() else 0 # 또는 enhanced_texts 등

        print("[6단계 완료] 통합 분석 완료. 요약 및 위험 분석 텍스트 준비됨.")

        # --- 최종 성공 반환 (요청하신 형식) ---
        print("\n[함수 종료] 'analyze_contract_document' 성공적으로 완료되었습니다.")
        return {
            "success": True,
            "summary": f"📋 문서 요약\n\n{final_summary_lang}\n\n---\n\n⚠️ 위험 요소 식별\n\n{risk_text_lang}",
            "storage_data": storage_data, # 기존 storage_data 변수 사용
            "chunk_count": chunk_count # 새로 추가된 필드
        }

        #return {
        #    "success": True,
        #    "summary": f"📋 문서 요약\n\n{summary}\n\n---\n\n⚠️ 잠재적 위험 요소 식별\n\n{risk_analysis}\n\n---\n\n 유형 : {detected_contract_type}, 정보 : {contract_type_info}",
        #    "storage_data": storage_data, # FAISS 또는 Qdrant 저장 정보 포함
        #    "chunk_count": chunk_count
        #}

    # ★★★ 바깥쪽 최종 예외 처리 블록 ★★★
    except APIError as e:
        print("\n[최종 오류 처리] OpenAI API 에러를 감지했습니다.")
        status_code = getattr(e, 'status_code', 500)
        error_message = f"AI 모델 통신 오류 (상태 코드: {status_code})"

        if getattr(e, 'code', None) == 'insufficient_quota':
            error_message = "AI 서비스 사용 한도를 초과했습니다."

        return {
            "success": False,
            "error": error_message,
            "status_code": status_code
        }

    except Exception as e:
        print(f"\n[최종 오류 처리] 예상치 못한 일반 에러를 감지했습니다: {e}")
        return {"success": False, "error": f"서버 내부 처리 중 오류가 발생했습니다: {e}", "status_code": 500}
