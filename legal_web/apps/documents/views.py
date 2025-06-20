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
    파일을 업로드받아 분석하고 요약문을 반환합니다.
    사용자 유형에 따라 다른 방식으로 벡터 데이터를 처리합니다.
    """
    uploaded_file = request.FILES.get('file')
    doc_type = request.POST.get('doc_type')
    session_id = request.POST.get('session_id')
    language = request.POST.get('language', 'ko')

    if not all([uploaded_file, doc_type, session_id]):
        return JsonResponse({'error': '파일, 문서 유형, 세션 ID가 모두 필요합니다.'}, status=400)

    # 1. AI 서비스 호출
    analysis_result = services.analyze_document(
        user=request.user, 
        uploaded_file=uploaded_file, 
        doc_type=doc_type,
        session_id=session_id,
        language=language
    )

    if not analysis_result.get('success'):
        return JsonResponse({'error': analysis_result.get('error', '분석 중 오류 발생')}, status=500)

    # 2. 비회원인 경우에만 FAISS 인덱스를 세션에 저장
    storage_data = analysis_result.get('storage_data', {})
    if storage_data.get('type') == 'faiss':
        faiss_index = storage_data.get('index')
        chunks = storage_data.get('chunks')
        
        if faiss_index is not None and chunks is not None:
            serialized_index = pickle.dumps(faiss_index)
            encoded_index_str = base64.b64encode(serialized_index).decode('utf-8')
            
            # 각 탭(세션)별로 데이터를 구분하여 저장
            request.session[f'rag_index_b64_{session_id}'] = encoded_index_str
            request.session[f'rag_chunks_{session_id}'] = chunks
            print(f"비회원 분석 완료. FAISS 데이터를 세션에 저장함 (세션키 접미사: {session_id})")

    # 3. 프론트엔드에 요약문 반환
    return JsonResponse({
        'summary': analysis_result.get('summary')
    })