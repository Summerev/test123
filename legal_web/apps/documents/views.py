import pickle
import base64
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from . import doc_services as services

@csrf_exempt
@require_POST
def analyze_document_view(request):
    """
    파일을 업로드받아 문서 유형에 따라 다르게 처리하고 결과를 반환합니다.
    """
    uploaded_file = request.FILES.get('file')
    doc_type = request.POST.get('doc_type')
    session_id = request.POST.get('session_id')
    language = request.POST.get('language', 'ko')
    result = None

    if not all([uploaded_file, doc_type, session_id]):
        return JsonResponse({'error': '파일, 문서 유형, 세션 ID가 모두 필요합니다.'}, status=400)

    # 문서 유형에 따른 분기 처리
    if doc_type == 'terms':
        # 약관 처리: RAG 기반 분석
        result = services.analyze_terms_document(
            user=request.user,
            uploaded_file=uploaded_file,
            session_id=session_id,
            language=language
        )
    elif doc_type == 'contract':
        print('계약서는 미구현')
        # 계약서 처리: RAG 기반 분석
        result = services.analyze_contract_document(
            user=request.user,
            uploaded_file=uploaded_file,
            session_id=session_id,
            language=language
        )
    else:
        return JsonResponse({'error': f'지원하지 않는 문서 유형입니다: {doc_type}'}, status=400)

    if result is None or not result.get('success', False):
        if result is None:
            error_message = "문서 분석 서비스 호출에 실패했습니다. 내부 오류를 확인하세요."
            status_code = 500
        else:
            error_message = result.get('error', '문서 분석 중 알 수 없는 오류 발생')
            status_code = result.get('status_code', 500)

        return JsonResponse(
            {'error': error_message},
            status=status_code
        )

    # --- 수정된 FAISS 인덱스 세션 저장 로직 ---
    # doc_type에 관계없이 result에 'faiss' 유형의 storage_data가 있으면 저장
    storage_data = result.get('storage_data', {})
    if storage_data.get('type') == 'faiss': # 이 조건만으로 충분함
        faiss_index = storage_data.get('index')
        chunks = storage_data.get('chunks')

        if faiss_index is not None and chunks is not None:
            try:
                serialized_index = pickle.dumps(faiss_index)
                encoded_index_str = base64.b64encode(serialized_index).decode('utf-8')

                request.session[f'rag_index_b64_{session_id}'] = encoded_index_str
                request.session[f'rag_chunks_{session_id}'] = chunks
                print(f"비회원 문서 분석 완료. FAISS 데이터를 세션에 저장함 (세션키: {session_id}, 문서 유형: {doc_type})")
            except Exception as e:
                print(f"FAISS 인덱스 직렬화/저장 오류: {e}")
        else:
            print(f"⚠️ FAISS 인덱스 또는 청크가 None이어서 세션에 저장하지 못했습니다. index={faiss_index is not None}, chunks={chunks is not None}")
    # --- 수정된 FAISS 인덱스 세션 저장 로직 끝 ---

    return JsonResponse({
        'summary': result.get('summary'),
        'text': result.get('text'),
        'message': result.get('message', '분석이 완료되었습니다.')
    })
