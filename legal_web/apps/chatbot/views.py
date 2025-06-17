# apps/chatbot/views.py (RAG 통합 업데이트)
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from openai import OpenAI
import os
import json

import fitz                   # PyMuPDF (PDF)
import docx                   # python-docx (DOCX)
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

# RAG 관련 임포트 추가
from apps.rag.services.document_processor import DocumentProcessor
from apps.rag.services.rag_engine import RAGEngine
from apps.rag.services.translator import AnalysisService
from apps.rag.models import Document, ChatSession, ChatMessage
from apps.rag.utils.file_handler import FileHandler

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# 현재 처리된 문서를 저장할 전역 변수 (세션 기반으로 개선 가능)
current_document_data = {}

def chat_main(request):
    """메인 채팅 페이지"""
    # 사용자의 최근 문서들 조회 (로그인된 경우)
    recent_documents = []
    if request.user.is_authenticated:
        recent_documents = Document.objects.filter(user=request.user)[:5]
    
    context = {
        'mode': 'default',
        'recent_documents': recent_documents
    }
    return render(request, 'chatbot/chat.html', context)

def chat_contract(request):
    """계약서 모드 채팅 페이지"""
    # 사용자의 계약서 문서들 조회
    contract_documents = []
    if request.user.is_authenticated:
        contract_documents = Document.objects.filter(
            user=request.user,
            contract_type__isnull=False
        )[:10]
    
    context = {
        'mode': 'contract',
        'contract_documents': contract_documents
    }
    return render(request, 'chatbot/chat.html', context)

def chat_policy(request):
    """약관 해석 모드 채팅 페이지"""
    context = {'mode': 'policy'}
    return render(request, 'chatbot/chat.html', context)

@csrf_exempt
def chat_api(request):
    """🔥 업그레이드된 채팅 API - RAG 기능 통합"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        user_message = data.get('message', '').strip()
        document_id = data.get('document_id')  # 문서 ID (있으면 RAG 사용)
        language = data.get('language', '한국어')
        use_rag = data.get('use_rag', True)  # RAG 사용 여부
        
        if not user_message:
            return JsonResponse({'error': '메시지가 없습니다.'}, status=400)
        
        # 🔥 RAG 기능 사용 (문서가 있고 사용자가 로그인된 경우)
        if document_id and request.user.is_authenticated and use_rag:
            try:
                rag_response = _handle_rag_chat(
                    request.user, user_message, document_id, language
                )
                return JsonResponse(rag_response)
            except Exception as e:
                print(f"❌ RAG 처리 실패, 일반 채팅으로 폴백: {str(e)}")
                # RAG 실패시 일반 채팅으로 폴백
        
        # 일반 채팅 처리
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system", 
                    "content": _get_system_prompt(language, data.get('mode', 'default'))
                },
                {"role": "user", "content": user_message}
            ],
            max_tokens=1000,
            temperature=0.3
        )
        
        reply = response.choices[0].message.content.strip()
        
        return JsonResponse({
            'reply': reply,
            'rag_used': False,
            'search_info': '일반 AI 응답'
        })
        
    except Exception as e:
        print(f"❌ 채팅 API 오류: {str(e)}")
        return JsonResponse({'error': f'채팅 처리 중 오류 발생: {str(e)}'}, status=500)

def _handle_rag_chat(user, message, document_id, language):
    """RAG 기반 채팅 처리"""
    try:
        # 문서 조회
        document = Document.objects.get(id=document_id, user=user)
        
        # 채팅 세션 생성 또는 조회
        chat_session, created = ChatSession.objects.get_or_create(
            user=user,
            document=document,
            defaults={
                'title': f"{document.title} 상담",
                'language': language
            }
        )
        
        # RAG 엔진 초기화 및 검색
        rag_engine = RAGEngine()
        rag_engine.process_document(document.text_content)
        
        # RAG 검색 수행
        search_results = rag_engine.search(message, top_k=3)
        
        if not search_results:
            # 문서와 관련 없는 질문
            return {
                'reply': "죄송합니다. 업로드하신 계약서 내용에 대해서만 답변드릴 수 있습니다. 계약서와 관련된 질문을 해주세요.",
                'rag_used': True,
                'search_info': '문서와 관련 없는 질문으로 판단됨',
                'document_title': document.title
            }
        
        # 컨텍스트 구성
        context_parts = []
        for result in search_results:
            chunk = result['chunk']
            if isinstance(chunk, dict):
                article_info = f"제{chunk.get('article_num', '?')}조({chunk.get('article_title', 'Unknown')})"
                chunk_text = chunk.get('text', '')
            else:
                article_info = "Unknown"
                chunk_text = str(chunk)
            
            method = result['method']
            context_parts.append(f"[{article_info} - {method}로 검색됨]\n{chunk_text}")
        
        context = "\n\n".join(context_parts)
        
        # 응답 생성
        analysis_service = AnalysisService()
        response = analysis_service.generate_document_based_answer(
            message, context, language
        )
        
        # 검색 정보 구성
        article_count = len(search_results)
        search_info = f"🔍 문서 기반 답변: {article_count}개 조항 (100% 계약서 내용 기반)"
        
        # 메시지 저장
        ChatMessage.objects.create(
            session=chat_session,
            message_type='user',
            content=message
        )
        
        ChatMessage.objects.create(
            session=chat_session,
            message_type='assistant',
            content=response,
            search_results=[{
                'method': result['method'],
                'score': result['score']
            } for result in search_results]
        )
        
        return {
            'reply': response + f"\n\n{search_info}",
            'rag_used': True,
            'search_info': search_info,
            'document_title': document.title,
            'contract_type': document.contract_type,
            'search_results': search_results[:3]  # 최대 3개
        }
        
    except Document.DoesNotExist:
        return {
            'reply': "문서를 찾을 수 없습니다. 다시 업로드해 주세요.",
            'rag_used': False,
            'search_info': '문서 없음'
        }
    except Exception as e:
        print(f"❌ RAG 채팅 처리 오류: {str(e)}")
        raise e

def _get_system_prompt(language, mode):
    """모드별 시스템 프롬프트 반환"""
    prompts = {
        "한국어": {
            "default": "당신은 친절한 법률 AI 어시스턴트입니다. 법률 관련 질문에 정확하고 이해하기 쉽게 답변해주세요.",
            "contract": "당신은 계약서 전문 AI 어시스턴트입니다. 계약서 조항을 쉽게 해석하고 주의사항을 알려주세요.",
            "policy": "당신은 약관 해석 전문 AI 어시스턴트입니다. 복잡한 약관을 쉽게 설명해주세요."
        },
        "English": {
            "default": "You are a helpful legal AI assistant. Please provide accurate and easy-to-understand answers to legal questions.",
            "contract": "You are a contract specialist AI assistant. Please interpret contract clauses easily and provide important notices.",
            "policy": "You are a policy interpretation AI assistant. Please explain complex terms and policies in simple terms."
        }
    }
    
    lang_prompts = prompts.get(language, prompts["한국어"])
    return lang_prompts.get(mode, lang_prompts["default"])

@csrf_exempt
def upload_file(request):
    """🔥 업그레이드된 파일 업로드 - RAG 처리 통합"""
    if request.method != 'POST' or 'file' not in request.FILES:
        return JsonResponse({'error': '잘못된 요청입니다.'}, status=400)

    uploaded = request.FILES['file']
    filename = uploaded.name
    ext = os.path.splitext(filename)[1].lower().lstrip('.')
    language = request.POST.get('language', '한국어')
    
    print(f"📄 파일 업로드: {filename} (확장자: {ext})")

    # 🔥 RAG 시스템 사용 (로그인된 사용자)
    if request.user.is_authenticated:
        try:
            return _handle_rag_upload(request, uploaded, language)
        except Exception as e:
            print(f"❌ RAG 업로드 실패, 기존 방식으로 폴백: {str(e)}")
            # RAG 실패시 기존 방식으로 폴백

    # 기존 방식: 텍스트만 추출하여 반환
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
        else:
            return JsonResponse(
                {'error': f'지원하지 않는 파일 형식입니다: {ext}'},
                status=400
            )

    except Exception as e:
        print(f"❌ 파일 처리 중 예외: {e}")
        return JsonResponse({'error': f'파일 처리 오류: {e}'}, status=500)

    return JsonResponse({
        'text': content,
        'rag_processed': False,
        'message': '텍스트 추출 완료 (RAG 미적용)'
    })

def _handle_rag_upload(request, uploaded_file, language):
    """RAG 시스템을 사용한 파일 업로드 처리"""
    try:
        # 파일 검증
        if not FileHandler.validate_file(uploaded_file):
            return JsonResponse({'error': '지원하지 않는 파일 형식이거나 크기가 너무 큽니다.'}, status=400)
        
        # 안전한 파일명 생성
        safe_filename = FileHandler.generate_safe_filename(uploaded_file.name, request.user.id)
        
        # 파일 저장
        file_path = default_storage.save(
            f'documents/{request.user.id}/{safe_filename}',
            ContentFile(uploaded_file.read())
        )
        
        # Document 객체 생성
        document = Document.objects.create(
            user=request.user,
            title=uploaded_file.name,
            file=file_path,
            file_type=uploaded_file.name.split('.')[-1].lower(),
            file_size=uploaded_file.size,
            text_content=''
        )
        
        # RAG 처리
        from apps.rag.views import DocumentUploadView
        upload_view = DocumentUploadView()
        result = upload_view._process_document(document, language)
        
        if result['success']:
            # 전역 변수에 현재 문서 정보 저장 (세션 개선 가능)
            global current_document_data
            current_document_data[request.user.id] = {
                'document_id': str(document.id),
                'title': document.title,
                'contract_type': result.get('contract_type'),
                'chunk_count': result.get('chunk_count')
            }
            
            return JsonResponse({
                'text': document.text_content,
                'rag_processed': True,
                'document_id': str(document.id),
                'contract_type': result.get('contract_type'),
                'chunk_count': result.get('chunk_count'),
                'vector_indexed': result.get('vector_indexed'),
                'message': f'✅ RAG 처리 완료: {result.get("contract_type", "계약서")} 유형 감지'
            })
        else:
            document.delete()
            return JsonResponse({'error': result['error']}, status=500)
            
    except Exception as e:
        print(f"❌ RAG 업로드 처리 오류: {str(e)}")
        raise e

# === 추가 API 엔드포인트들 ===

@csrf_exempt
@login_required
def get_current_document(request):
    """현재 처리된 문서 정보 반환"""
    global current_document_data
    user_document = current_document_data.get(request.user.id)
    
    if user_document:
        return JsonResponse({
            'success': True,
            'document': user_document
        })
    else:
        return JsonResponse({
            'success': False,
            'message': '현재 처리된 문서가 없습니다.'
        })

@csrf_exempt  
@login_required
def clear_current_document(request):
    """현재 문서 초기화"""
    global current_document_data
    if request.user.id in current_document_data:
        del current_document_data[request.user.id]
    
    return JsonResponse({'success': True, 'message': '문서가 초기화되었습니다.'})

@csrf_exempt
@login_required
def get_user_documents(request):
    """사용자 문서 목록 조회"""
    documents = Document.objects.filter(user=request.user).order_by('-created_at')[:10]
    
    document_list = []
    for doc in documents:
        document_list.append({
            'id': str(doc.id),
            'title': doc.title,
            'contract_type': doc.contract_type,
            'created_at': doc.created_at.strftime('%Y-%m-%d %H:%M'),
            'chunk_count': doc.chunk_count,
            'file_size_mb': doc.file_size_mb
        })
    
    return JsonResponse({
        'success': True,
        'documents': document_list
    })