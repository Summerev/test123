# teamproject/legal_web/apps/rag/views.py
import json
import pickle
from django.http import JsonResponse
from django.shortcuts import render 
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from . import services

import base64

'''
def rag_query(request):
    return render(request, 'rag/rag_query.html')
'''





@csrf_exempt
@require_POST
def analyze_document_view(request):
    """
    파일을 업로드받아 분석하고 요약문을 반환하는 API 뷰.
    비회원은 FAISS 인덱스를 Django 세션에 저장, 회원은 향후 Qdrant에 저장.
    """
    # 프론트엔드에서 보낸 'file'과 'doc_type' 데이터 가져오기
    uploaded_file = request.FILES.get('file')
    doc_type = request.POST.get('doc_type') # 'contract' or 'terms'

    if not all([uploaded_file, doc_type]):
        return JsonResponse({'error': '파일과 문서 유형이 필요합니다.'}, status=400)

    # 1. AI 서비스 호출하여 문서 분석
    analysis_result = services.analyze_document(uploaded_file, doc_type)

    # 먼저, 분석 결과가 성공했는지 확인하고 실패했다면 즉시 에러를 반환합니다.
    if not analysis_result.get('success'):
        # 여기서 바로 함수를 종료하므로, 아래의 세션 저장 로직은 실행되지 않습니다.
        return JsonResponse({'error': analysis_result.get('error', '분석 중 오류 발생')}, status=500)

    # 2. (분석 성공 시에만 실행됨) 사용자 유형에 따라 분석 데이터 처리
    faiss_index = analysis_result.get('faiss_index')
    chunks = analysis_result.get('chunks')
    
    # pickle 및 base64 인코딩
    serialized_index = pickle.dumps(faiss_index)
    encoded_index_str = base64.b64encode(serialized_index).decode('utf-8')
    
    # 세션에 저장 (회원/비회원 구분 없이 일단 저장)
    request.session['rag_index_b64'] = encoded_index_str
    request.session['rag_chunks'] = chunks
    
    if request.user.is_authenticated:
        print(f"회원 '{request.user.username}'의 문서 분석 완료. (향후 Qdrant 저장)")
    else:
        print("비회원 문서 분석 완료. FAISS 인덱스를 세션에 저장함.")
    

    # 3. 프론트엔드에 요약문만 반환
    return JsonResponse({
        'summary': analysis_result.get('summary')
    })


@csrf_exempt
@require_POST
def ask_question_view(request):
    """
    질문을 받아 분석된 문서 기반으로 답변을 생성하는 API 뷰.
    비회원은 Django 세션에서, 회원은 향후 Qdrant에서 데이터를 가져옴.
    """
    try:
        data = json.loads(request.body)
        question = data.get('question')
        chat_history = data.get('history', []) # 프론트에서 보낸 대화 기록

        if not question:
            return JsonResponse({'error': '질문 내용이 없습니다.'}, status=400)

        # 1. 사용자 유형에 따라 검색 데이터 로드
        if request.user.is_authenticated:
            # --- 회원인 경우 ---
            # TODO: DB 담당자가 Qdrant 검색 로직을 추가해야 함.
            # 예: relevant_docs = qdrant_service.search(user=request.user, question=...)
            # 현재는 비회원처럼 세션에서 데이터를 가져와 테스트.
            encoded_index_str = request.session.get('rag_index_b64')
            chunks = request.session.get('rag_chunks')
            print(f"회원 '{request.user.username}'의 질문 처리. (Qdrant 검색 로직 필요)")

        else:
            # --- 비회원인 경우 ---
            # Django 세션에서 FAISS 인덱스와 청크 로드
            encoded_index_str = request.session.get('rag_index_b64')
            chunks = request.session.get('rag_chunks')
            print("비회원 질문 처리. 세션에서 FAISS 인덱스 로드함.")

        if not encoded_index_str or not chunks:
            return JsonResponse({'error': '분석된 문서가 없습니다. 파일을 먼저 업로드해주세요.'}, status=400)

        serialized_index = base64.b64decode(encoded_index_str.encode('utf-8'))
        faiss_index = pickle.loads(serialized_index)

        # 2. AI 서비스 호출하여 답변 생성
        answer_result = services.get_answer(question, faiss_index, chunks, chat_history)

        if not answer_result.get('success'):
            return JsonResponse({'error': answer_result.get('error', '답변 생성 중 오류 발생')}, status=500)
            
        # 3. 프론트엔드에 답변 반환
        return JsonResponse({
            'answer': answer_result.get('answer')
        })

    except json.JSONDecodeError:
        return JsonResponse({'error': '잘못된 JSON 형식입니다.'}, status=400)
    except Exception as e:
        print(f"Error in ask_question_view: {e}")
        return JsonResponse({'error': f'서버 내부 오류: {e}'}, status=500)