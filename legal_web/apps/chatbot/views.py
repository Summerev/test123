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

# RAG 서비스를 import
from apps.rag import services as rag_services

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def chat_main(request):
    return render(request, 'chatbot/chat.html', {'mode': 'default'})

def chat_contract(request):
    return render(request, 'chatbot/chat.html', {'mode': 'contract'})

def chat_policy(request):
    return render(request, 'chatbot/chat.html', {'mode': 'policy'})

@csrf_exempt
def chat_api(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        user_message = data.get('message', '')
        session_id = data.get('session_id')
        chat_history = data.get('history', [])
        
        # 프론트엔드에서 doc_type을 보내줘야 함 (또는 세션에서 가져와야 함)
        # 여기서는 JS가 보내준다고 가정
        doc_type = data.get('docType') 

        if not all([user_message, session_id]):
            return JsonResponse({'error': '메시지와 세션 ID가 필요합니다.'}, status=400)

        # ★★★ 분기 로직 ★★★
        if doc_type == 'terms':
            # --- '약관' 세션일 경우: 새로운 RAG 질의응답 서비스 호출 ---
            print("[RAG] '약관' 세션 질문에 답변합니다.")

            faiss_data_from_session = None
            if isinstance(request.user, AnonymousUser):
                # 세션에서 비회원 데이터 로드
                encoded_index_str = request.session.get(f'rag_index_b64_{session_id}')
                chunks = request.session.get(f'rag_chunks_{session_id}')
                if encoded_index_str and chunks:
                    serialized_index = base64.b64decode(encoded_index_str.encode('utf-8'))
                    faiss_index = pickle.loads(serialized_index)
                    faiss_data_from_session = {'index': faiss_index, 'chunks': chunks}
                else:
                    return JsonResponse({'error': '분석된 약관 정보가 없습니다. 파일을 다시 업로드해주세요.'}, status=400)

            answer_result = rag_services.get_answer(
                user=request.user,
                session_id=session_id,
                question=user_message,
                faiss_data=faiss_data_from_session,
                chat_history=chat_history
            )
            
            if not answer_result.get('success'):
                return JsonResponse({'error': answer_result.get('error', '답변 생성 오류')}, status=500)
            
            return JsonResponse({'reply': answer_result.get('answer')})

        else:
            # --- '계약서' 등 다른 유형일 경우: 기존 OpenAI 호출 로직 ---
            print("[기존] 일반 채팅으로 답변합니다.")
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": user_message}]
            )
            reply = response.choices[0].message.content.strip()
            return JsonResponse({'reply': reply})
            
    return JsonResponse({'error': 'Invalid request method'}, status=405)


@csrf_exempt
def upload_file(request):
    if request.method != 'POST' or 'file' not in request.FILES:
        return JsonResponse({'error': '잘못된 요청입니다.'}, status=400)

    uploaded_file = request.FILES['file']
    doc_type = request.POST.get('doc_type')
    session_id = request.POST.get('session_id')

    if not all([doc_type, session_id]):
        return JsonResponse({'error': '문서 유형과 세션 ID가 필요합니다.'}, status=400)

    # ★★★ 'ext' 변수를 여기서 먼저 정의합니다 ★★★
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
