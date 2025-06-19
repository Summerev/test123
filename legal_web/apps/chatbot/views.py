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

    uploaded = request.FILES['file']
    filename = uploaded.name
    ext = os.path.splitext(filename)[1].lower().lstrip('.')
    print(f"▶ upload_file: filename={filename}, ext={ext}")

    content = ''
    try:
        if ext == 'pdf':
            doc = fitz.open(stream=uploaded.read(), filetype='pdf')
            content = "\n".join(page.get_text() for page in doc)

        elif ext == 'docx':
            document = docx.Document(uploaded)
            content = "\n".join(p.text for p in document.paragraphs)

        elif ext == 'doc':
            return JsonResponse(
                {'error': '.doc 형식은 지원되지 않습니다. MS Word에서 .docx로 저장 후 다시 시도하세요.'},
                status=400
            )

        # HWP 로직 주석 처리하거나 추후 추가
        # elif ext == 'hwp':
        #     …

        else:
            return JsonResponse(
                {'error': f'지원하지 않는 파일 형식입니다: {ext}'},
                status=400
            )

    except Exception as e:
        print("📌 파일 처리 중 예외:", e)
        return JsonResponse({'error': f'파일 처리 오류: {e}'}, status=500)

    return JsonResponse({'text': content})

