# legal_web/apps/chatbot/views.py

from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from openai import OpenAI
import os
import json

import fitz                   # PyMuPDF (PDF)
import docx                   # python-docx (DOCX)
# from pyhwp import HWPDocument # pyhwp (HWP)
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

import textwrap
import numpy as np
import faiss

from django.contrib.auth.models import AnonymousUser
import pickle
import base64

from apps.rag import services as rag_services

#from .models import ChatMessage

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def chat_main(request):
    return render(request, 'chatbot/chat.html', {'mode': 'default'})

def chat_contract(request):
    return render(request, 'chatbot/chat.html', {'mode': 'contract'})

def chat_policy(request):
    return render(request, 'chatbot/chat.html', {'mode': 'policy'})

@csrf_exempt
def chat_api(request):
    """
    사용자의 채팅 메시지를 받아 RAG 서비스를 호출하고 답변을 반환합니다.
    (대화 기록 저장 로직이 없는 원래 버전)
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'POST 요청만 허용됩니다.'}, status=405)

    try:
        data = json.loads(request.body)
        user_message_text = data.get('message', '')
        session_id = data.get('session_id')
        doc_type = data.get('docType')
        language = data.get('language', 'ko')
        chat_history = data.get('history', [])
        user = request.user

        if not all([user_message_text, session_id, doc_type]):
            return JsonResponse({'error': '메시지, 세션 ID, 문서 유형이 모두 필요합니다.'}, status=400)

        # --- 서비스 호출 로직 (원래 이 부분만 있었습니다) ---
        if doc_type == 'terms':
            print(f"[RAG] '약관' 질문 처리 시작 (세션: {session_id})")
            faiss_data = None
            if isinstance(user, AnonymousUser):
                encoded_index = request.session.get(f'rag_index_b64_{session_id}')
                chunks = request.session.get(f'rag_chunks_{session_id}')
                if encoded_index and chunks:
                    faiss_data = {'index': pickle.loads(base64.b64decode(encoded_index)), 'chunks': chunks}
                else:
                    return JsonResponse({'error': '분석된 약관 정보가 없습니다. 파일을 다시 업로드해주세요.'}, status=400)
            
            result = rag_services.get_answer(
                user=user,
                session_id=session_id,
                question=user_message_text,
                language=language,
                faiss_data=faiss_data,
                chat_history=chat_history
            )
        else:
            print(f"[기존] '{doc_type}' 질문 처리 시작")
            result = {'success': True, 'answer': f"'{doc_type}'에 대한 질문은 아직 지원되지 않습니다."}

        # --- 결과 처리 로직 (원래 이 부분만 있었습니다) ---
        if not result.get('success'):
            return JsonResponse({'error': result.get('error', '답변 생성 오류')}, status=500)

        bot_answer_text = result.get('answer')
        return JsonResponse({'reply': bot_answer_text})

    except Exception as e:
        print(f"[ERROR] chat_api: {e}")
        return JsonResponse({'error': '서버 내부 오류가 발생했습니다.'}, status=500)


@csrf_exempt
def upload_file(request):
    if request.method != 'POST' or 'file' not in request.FILES:
        return JsonResponse({'error': '잘못된 요청입니다.'}, status=400)

    uploaded_file = request.FILES['file']
    doc_type = request.POST.get('doc_type')
    session_id = request.POST.get('session_id')

    if not all([doc_type, session_id]):
        return JsonResponse({'error': '문서 유형과 세션 ID가 필요합니다.'}, status=400)

    # 'ext' 변수를 정의
    filename = uploaded_file.name
    ext = os.path.splitext(filename)[1].lower().lstrip('.')
    print(f"▶ upload_file: filename={filename}, ext={ext}, doc_type={doc_type}")

    if doc_type == 'terms':
        # --- '약관' 유형일 경우: 새로운 RAG 분석 서비스 호출 ---
        print("[RAG] '약관' 유형 분석을 시작합니다.")
        analysis_result = rag_services.analyze_document(
            user=request.user,
            uploaded_file=uploaded_file,
            doc_type=doc_type,
            session_id=session_id
        )
        return JsonResponse({'summary': analysis_result.get('summary')})

    else:
        # --- '계약서' 등 다른 유형일 경우: 기존 텍스트 추출 로직 실행 ---
        print("[기존] '계약서' 유형 텍스트 추출을 시작합니다.")
        content = ''
        try:
            if ext == 'pdf':
                doc = fitz.open(stream=uploaded_file.read(), filetype='pdf')
                content = "\n".join(page.get_text() for page in doc)

            elif ext == 'docx':
                document = docx.Document(uploaded_file)
                content = "\n".join(p.text for p in document.paragraphs)

            elif ext == 'doc':
                return JsonResponse(
                    {'error': '.doc 형식은 지원되지 않습니다. MS Word에서 .docx로 저장 후 다시 시도하세요.'},
                    status=400
                )
            else:
                return JsonResponse(
                    {'error': f'지원하지 않는 파일 형식입니다: {ext}'},
                    status=400
                )
        except Exception as e:
            print("📌 파일 처리 중 예외:", e)
            return JsonResponse({'error': f'파일 처리 오류: {e}'}, status=500)
        
        return JsonResponse({'text': content})
