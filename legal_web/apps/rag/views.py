# teamproject/legal_web/apps/rag/views.py

import json
import pickle
import base64
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth.models import AnonymousUser

from . import services

# --- 기존 테스트용 뷰 (그대로 유지) ---
def rag_query(request):
    """
    RAG 기능 테스트를 위한 HTML 페이지를 렌더링합니다.
    """
    return render(request, 'rag/rag_query.html')


# --- API 뷰들 (모든 오류 수정된 최종 버전) ---

@csrf_exempt
@require_POST



@csrf_exempt
@require_POST
def ask_question_view(request):
    """
    질문을 받아 분석된 문서 기반으로 답변을 생성합니다.
    """
    try:
        data = json.loads(request.body)
        question = data.get('question')
        session_id = data.get('session_id')
        chat_history = data.get('history', [])

        if not all([question, session_id]):
            return JsonResponse({'error': '질문과 세션 ID가 필요합니다.'}, status=400)

        faiss_data_from_session = None
        # 비회원인 경우, 세션에서 해당 탭의 FAISS 데이터를 가져옵니다.
        if isinstance(request.user, AnonymousUser):
            encoded_index_str = request.session.get(f'rag_index_b64_{session_id}')
            chunks = request.session.get(f'rag_chunks_{session_id}')
            
            if encoded_index_str and chunks:
                serialized_index = base64.b64decode(encoded_index_str.encode('utf-8'))
                faiss_index = pickle.loads(serialized_index)
                faiss_data_from_session = {'index': faiss_index, 'chunks': chunks}
            else:
                return JsonResponse({'error': f'분석된 비회원 세션({session_id})이 없습니다. 파일을 먼저 업로드해주세요.'}, status=400)

        # AI 서비스 호출 (faiss_data는 비회원일 때만 값이 있고, 회원일 때는 None)
        answer_result = services.get_answer(
            user=request.user,
            session_id=session_id,
            question=question,
            faiss_data=faiss_data_from_session,
            chat_history=chat_history
        )

        if not answer_result.get('success'):
            return JsonResponse({'error': answer_result.get('error', '답변 생성 중 오류 발생')}, status=500)
            
        return JsonResponse({'answer': answer_result.get('answer')})

    except Exception as e:
        print(f"Error in ask_question_view: {e}")
        return JsonResponse({'error': f'서버 내부 오류: {e}'}, status=500)