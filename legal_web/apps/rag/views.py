# apps/rag/views.py
import json
import time
import os
import openai
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_POST
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils.decorators import method_decorator
from django.views import View
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.urls import reverse
from django.conf import settings

from .models import Document, DocumentChunk, ChatSession, ChatMessage, DocumentAnalysis
from .services.document_processor import DocumentProcessor
from .services.rag_engine import RAGEngine
from .services.translator import AnalysisService, IMPROVED_LANGUAGES, TranslationService
from .utils.file_handler import FileHandler

# apps/rag/views.py 상단에 추가할 함수들

def load_api_key():
    """API 키 검증 함수 (Django 환경용)"""
    try:
        from django.conf import settings
        import openai
        
        api_key = getattr(settings, 'OPENAI_API_KEY', None)
        
        if not api_key:
            return "❌ settings.py에 OPENAI_API_KEY가 설정되지 않았습니다."
        
        if not api_key.startswith('sk-'):
            return "❌ 올바르지 않은 API 키 형식입니다."
        
        # API 키 검증을 위한 테스트 호출
        client = openai.OpenAI(api_key=api_key)
        try:
            client.chat.completions.create(
                model="gpt-3.5-turbo", 
                messages=[{"role": "user", "content": "test"}], 
                max_tokens=1
            )
        except openai.AuthenticationError:
            return "❌ 올바르지 않은 API 키입니다."
        except Exception:
            # 다른 오류는 API 키 자체는 유효하다고 판단
            pass
        
        return "✅ API 키 검증 완료!"
        
    except Exception as e:
        return f"❌ API 키 검증 실패: {str(e)}"

def get_openai_client():
    """OpenAI 클라이언트 가져오기"""
    from django.conf import settings
    import openai
    
    api_key = getattr(settings, 'OPENAI_API_KEY', None)
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")
    
    return openai.OpenAI(api_key=api_key)

# API 키 로드용 뷰 추가
@require_http_methods(["POST"])
@login_required  
@csrf_exempt
def api_key_test(request):
    """API 키 테스트"""
    try:
        result = load_api_key()
        
        if result.startswith("✅"):
            return JsonResponse({
                'success': True,
                'message': result
            })
        else:
            return JsonResponse({
                'success': False,
                'error': result
            }, status=400)
            
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'API 키 테스트 중 오류: {str(e)}'
        }, status=500)

class DocumentUploadView(View):
    """문서 업로드 및 처리 뷰"""
    
    @method_decorator(login_required)
    def get(self, request):
        """업로드 페이지 렌더링"""
        user_documents = Document.objects.filter(user=request.user)
        context = {
            'documents': user_documents,
            'supported_languages': list(IMPROVED_LANGUAGES.keys())
    }
    
        return render(request, 'rag/upload.html', context)

@require_http_methods(["POST"])
@login_required
@csrf_exempt
def regenerate_analysis(request, document_id):
    """분석 재생성"""
    try:
        document = get_object_or_404(Document, id=document_id, user=request.user)
        language = request.POST.get('language', '한국어')
        
        # 기존 분석 삭제
        DocumentAnalysis.objects.filter(
            document=document,
            language=language
        ).delete()
        
        # 새 분석 생성
        start_time = time.time()
        analysis_service = AnalysisService()
        
        summary, risk_analysis = analysis_service.unified_analysis_with_translation(
            document.text_content, language
        )
        
        processing_time = time.time() - start_time
        
        # 분석 결과 저장
        DocumentAnalysis.objects.create(
            document=document,
            analysis_type='summary',
            language=language,
            content=summary,
            processing_time=processing_time
        )
        
        DocumentAnalysis.objects.create(
            document=document,
            analysis_type='risk_analysis',
            language=language,
            content=risk_analysis,
            processing_time=processing_time
        )
        
        return JsonResponse({
            'success': True,
            'message': f'{language} 분석이 재생성되었습니다.',
            'redirect_url': reverse('rag:analysis_detail', kwargs={'document_id': document_id}) + f'?language={language}'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'분석 재생성 중 오류 발생: {str(e)}'
        }, status=500)

# === 기존 Chatbot과의 통합을 위한 추가 뷰들 ===

@require_http_methods(["GET"])
@login_required
def dashboard(request):
    """RAG 대시보드 - 사용자의 문서 및 채팅 현황"""
    user_documents = Document.objects.filter(user=request.user)
    recent_sessions = ChatSession.objects.filter(user=request.user)[:5]
    
    # 통계 정보
    stats = {
        'total_documents': user_documents.count(),
        'total_chats': ChatSession.objects.filter(user=request.user).count(),
        'total_messages': ChatMessage.objects.filter(session__user=request.user).count(),
        'contract_types': user_documents.values('contract_type').distinct().count()
    }
    
    context = {
        'documents': user_documents[:5],  # 최근 5개
        'recent_sessions': recent_sessions,
        'stats': stats,
        'supported_languages': list(IMPROVED_LANGUAGES.keys())
    }
    
    return render(request, 'rag/dashboard.html', context)

@require_POST
@login_required
@csrf_exempt
def quick_upload_api(request):
    """빠른 업로드 API - 기존 chatbot에서 호출용"""
    try:
        if 'file' not in request.FILES:
            return JsonResponse({'error': '파일이 선택되지 않았습니다.'}, status=400)
        
        uploaded_file = request.FILES['file']
        language = request.POST.get('language', '한국어')
        
        # 파일 검증
        if not FileHandler.validate_file(uploaded_file):
            return JsonResponse({'error': '지원하지 않는 파일 형식입니다.'}, status=400)
        
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
        
        # 비동기 처리 (실제로는 동기)
        result = DocumentUploadView()._process_document(document, language)
        
        if result['success']:
            return JsonResponse({
                'success': True,
                'document_id': str(document.id),
                'contract_type': result.get('contract_type'),
                'chunk_count': result.get('chunk_count'),
                'text_preview': document.text_content[:500] + '...' if len(document.text_content) > 500 else document.text_content
            })
        else:
            document.delete()
            return JsonResponse({'error': result['error']}, status=500)
            
    except Exception as e:
        return JsonResponse({'error': f'파일 업로드 중 오류 발생: {str(e)}'}, status=500)

@require_POST
@login_required
@csrf_exempt  
def quick_chat_api(request):
    """빠른 채팅 API - 기존 chatbot에서 RAG 기능 사용"""
    try:
        data = json.loads(request.body)
        message = data.get('message', '').strip()
        document_id = data.get('document_id')
        language = data.get('language', '한국어')
        
        if not message:
            return JsonResponse({'error': '메시지가 없습니다.'}, status=400)
        
        if not document_id:
            # 문서 없이 일반 채팅
            return _handle_general_chat(message, language)
        
        # 문서 기반 RAG 채팅
        document = get_object_or_404(Document, id=document_id, user=request.user)
        
        # 채팅 세션 생성 또는 조회
        chat_session, created = ChatSession.objects.get_or_create(
            user=request.user,
            document=document,
            defaults={
                'title': f"{document.title} 빠른상담",
                'language': language
            }
        )
        
        # RAG 응답 생성
        response_data = _generate_rag_response(chat_session, message)
        
        # 메시지 저장 (선택적)
        if data.get('save_history', True):
            ChatMessage.objects.create(
                session=chat_session,
                message_type='user',
                content=message
            )
            
            ChatMessage.objects.create(
                session=chat_session,
                message_type='assistant',
                content=response_data['response'],
                search_results=response_data.get('search_results')
            )
        
        return JsonResponse({
            'success': True,
            'response': response_data['response'],
            'search_info': response_data.get('search_info', ''),
            'document_title': document.title,
            'contract_type': document.contract_type
        })
        
    except Exception as e:
        return JsonResponse({'error': f'채팅 처리 중 오류 발생: {str(e)}'}, status=500)

def _handle_general_chat(message, language):
    """일반 채팅 처리 (문서 없는 경우)"""
    try:
        # OpenAI 클라이언트 직접 사용
        client = get_openai_client()
        
        system_prompts = {
            "한국어": "당신은 법률 전문 AI 어시스턴트입니다. 법률 관련 질문에 정확하고 이해하기 쉽게 답변해주세요.",
            "English": "You are a legal AI assistant. Please provide accurate and easy-to-understand answers to legal questions.",
            "日本語": "あなたは法律専門のAIアシスタントです。法律関連の質問に正確で分かりやすく回答してください。",
            "中文": "您是法律专业AI助手。请对法律相关问题提供准确且易懂的回答。",
            "Español": "Eres un asistente de IA legal. Proporciona respuestas precisas y fáciles de entender a preguntas legales."
        }
        
        system_prompt = system_prompts.get(language, system_prompts["한국어"])
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            max_tokens=1000,
            temperature=0.3
        )
        
        reply = response.choices[0].message.content.strip()
        
        return JsonResponse({
            'success': True,
            'response': reply,
            'search_info': '일반 법률 상담 (문서 기반 아님)',
            'document_title': None,
            'contract_type': None
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'일반 채팅 처리 중 오류: {str(e)}'
        }, status=500)
    
    @method_decorator(login_required)
    @method_decorator(csrf_exempt)
    def post(self, request):
        """문서 업로드 및 처리"""
        try:
            if 'file' not in request.FILES:
                return JsonResponse({'error': '파일이 선택되지 않았습니다.'}, status=400)
            
            uploaded_file = request.FILES['file']
            language = request.POST.get('language', '한국어')
            
            # 파일 검증
            if not FileHandler.validate_file(uploaded_file):
                return JsonResponse({'error': '지원하지 않는 파일 형식입니다.'}, status=400)
            
            # 파일 저장
            file_path = default_storage.save(
                f'documents/{request.user.id}/{uploaded_file.name}',
                ContentFile(uploaded_file.read())
            )
            
            # Document 객체 생성
            document = Document.objects.create(
                user=request.user,
                title=uploaded_file.name,
                file=file_path,
                file_type=uploaded_file.name.split('.')[-1].lower(),
                file_size=uploaded_file.size,
                text_content=''  # 처리 후 업데이트
            )
            
            # 비동기 처리를 위한 태스크 시작 (실제로는 동기 처리)
            result = self._process_document(document, language)
            
            if result['success']:
                return JsonResponse({
                    'success': True,
                    'document_id': str(document.id),
                    'redirect_url': reverse('rag:chat', kwargs={'document_id': document.id})
                })
            else:
                document.delete()  # 처리 실패시 삭제
                return JsonResponse({'error': result['error']}, status=500)
                
        except Exception as e:
            return JsonResponse({'error': f'문서 업로드 중 오류 발생: {str(e)}'}, status=500)
    
    def _process_document(self, document, language):
        """문서 처리 메인 로직"""
        try:
            start_time = time.time()
            
            # 1. 텍스트 추출
            print(f"📄 문서 처리 시작: {document.title}")
            text_content = DocumentProcessor.extract_text_from_file(
                document.file.path, 
                document.title
            )
            
            if text_content.startswith("❌"):
                return {'success': False, 'error': text_content}
            
            # 2. RAG 엔진 초기화 및 처리
            rag_engine = RAGEngine()
            process_result = rag_engine.process_document(text_content)
            
            # 3. 문서 정보 업데이트
            document.text_content = text_content
            document.contract_type = process_result.get('contract_type')
            document.confidence_score = process_result.get('confidence', {}).get('percentage') if process_result.get('confidence') else None
            document.chunk_count = process_result.get('chunk_count', 0)
            document.vector_indexed = process_result.get('vector_index_created', False)
            document.qdrant_collection_name = f"contract_chunks_{document.id}"
            document.save()
            
            # 4. 청크 저장
            self._save_document_chunks(document, rag_engine.document_chunks)
            
            # 5. 분석 수행 및 저장
            analysis_service = AnalysisService()
            summary, risk_analysis = analysis_service.unified_analysis_with_translation(text_content, language)
            
            # 요약 분석 저장
            DocumentAnalysis.objects.create(
                document=document,
                analysis_type='summary',
                language=language,
                content=summary,
                processing_time=time.time() - start_time
            )
            
            # 위험 분석 저장
            DocumentAnalysis.objects.create(
                document=document,
                analysis_type='risk_analysis',
                language=language,
                content=risk_analysis,
                processing_time=time.time() - start_time
            )
            
            # 6. 처리 완료 시간 업데이트
            from django.utils import timezone
            document.processed_at = timezone.now()
            document.save()
            
            print(f"✅ 문서 처리 완료: {document.title} ({time.time() - start_time:.2f}초)")
            
            return {
                'success': True,
                'contract_type': process_result.get('contract_type'),
                'chunk_count': process_result.get('chunk_count'),
                'vector_indexed': process_result.get('vector_index_created')
            }
            
        except Exception as e:
            print(f"❌ 문서 처리 실패: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _save_document_chunks(self, document, chunks):
        """문서 청크들을 DB에 저장"""
        chunk_objects = []
        
        for i, chunk_data in enumerate(chunks):
            chunk_obj = DocumentChunk(
                document=document,
                text=chunk_data['text'],
                chunk_type=chunk_data['type'],
                article_num=chunk_data.get('article_num'),
                article_title=chunk_data.get('article_title', ''),
                chunk_index=i,
                char_count=len(chunk_data['text']),
                vector_id=i  # Qdrant에서의 ID
            )
            chunk_objects.append(chunk_obj)
        
        DocumentChunk.objects.bulk_create(chunk_objects)
        print(f"✅ {len(chunk_objects)}개 청크 DB 저장 완료")

class ChatView(View):
    """RAG 기반 채팅 뷰"""
    
    @method_decorator(login_required)
    def get(self, request, document_id):
        """채팅 페이지 렌더링"""
        document = get_object_or_404(Document, id=document_id, user=request.user)
        
        # 기존 채팅 세션 조회 또는 새로 생성
        chat_session, created = ChatSession.objects.get_or_create(
            user=request.user,
            document=document,
            defaults={
                'title': f"{document.title} 상담",
                'language': request.GET.get('language', '한국어')
            }
        )
        
        # 분석 결과 조회
        summary_analysis = DocumentAnalysis.objects.filter(
            document=document,
            analysis_type='summary',
            language=chat_session.language
        ).first()
        
        risk_analysis = DocumentAnalysis.objects.filter(
            document=document,
            analysis_type='risk_analysis',
            language=chat_session.language
        ).first()
        
        # 채팅 메시지 조회
        messages = ChatMessage.objects.filter(session=chat_session).order_by('created_at')
        
        context = {
            'document': document,
            'chat_session': chat_session,
            'summary_analysis': summary_analysis,
            'risk_analysis': risk_analysis,
            'messages': messages,
            'supported_languages': list(IMPROVED_LANGUAGES.keys())
        }
        
        return render(request, 'rag/chat.html', context)

@require_POST
@login_required
@csrf_exempt
def chat_message(request):
    """채팅 메시지 처리 API"""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        message_content = data.get('message', '').strip()
        
        if not message_content:
            return JsonResponse({'error': '메시지 내용이 없습니다.'}, status=400)
        
        # 채팅 세션 조회
        chat_session = get_object_or_404(ChatSession, id=session_id, user=request.user)
        
        # 사용자 메시지 저장
        user_message = ChatMessage.objects.create(
            session=chat_session,
            message_type='user',
            content=message_content
        )
        
        # RAG 검색 및 응답 생성
        start_time = time.time()
        response_data = _generate_rag_response(chat_session, message_content)
        response_time = time.time() - start_time
        
        # AI 응답 저장
        ai_message = ChatMessage.objects.create(
            session=chat_session,
            message_type='assistant',
            content=response_data['response'],
            search_results=response_data.get('search_results'),
            search_method=response_data.get('search_method'),
            response_time=response_time
        )
        
        # 사용된 청크들 연결
        if response_data.get('used_chunk_ids'):
            used_chunks = DocumentChunk.objects.filter(
                id__in=response_data['used_chunk_ids']
            )
            ai_message.used_chunks.set(used_chunks)
        
        # 세션 메시지 수 업데이트
        chat_session.message_count = chat_session.messages.count()
        chat_session.save()
        
        return JsonResponse({
            'success': True,
            'response': response_data['response'],
            'search_info': response_data.get('search_info', ''),
            'message_id': str(ai_message.id)
        })
        
    except Exception as e:
        print(f"❌ 채팅 메시지 처리 오류: {str(e)}")
        return JsonResponse({'error': f'메시지 처리 중 오류 발생: {str(e)}'}, status=500)

def _generate_rag_response(chat_session, user_message):
    """RAG 기반 응답 생성"""
    try:
        document = chat_session.document
        language = chat_session.language
        
        # RAG 엔진 초기화
        rag_engine = RAGEngine()
        
        # 문서 다시 로드 (메모리에서 처리하기 위해)
        rag_engine.process_document(document.text_content)
        
        # RAG 검색 수행
        search_results = rag_engine.search(user_message, top_k=3)
        
        if not search_results:
            # 문서와 관련 없는 질문
            lang_config = IMPROVED_LANGUAGES.get(language, IMPROVED_LANGUAGES['한국어'])
            return {
                'response': lang_config.get('off_topic_response', 
                    "죄송합니다. 업로드하신 계약서 내용에 대해서만 답변드릴 수 있습니다."),
                'search_results': [],
                'search_method': 'off_topic_check',
                'search_info': '',
                'used_chunk_ids': []
            }
        
        # 컨텍스트 구성
        context_parts = []
        used_chunk_ids = []
        search_methods = []
        
        for i, result in enumerate(search_results):
            chunk = result['chunk']
            if isinstance(chunk, dict):
                article_info = f"제{chunk.get('article_num', '?')}조({chunk.get('article_title', 'Unknown')})"
                chunk_text = chunk.get('text', '')
                # chunk ID 찾기 (실제로는 DocumentChunk에서)
                chunk_obj = DocumentChunk.objects.filter(
                    document=document,
                    article_num=chunk.get('article_num'),
                    text=chunk_text
                ).first()
                if chunk_obj:
                    used_chunk_ids.append(str(chunk_obj.id))
            else:
                article_info = "Unknown"
                chunk_text = str(chunk)
            
            method = result['method']
            search_methods.append(method)
            context_parts.append(f"[{article_info} - {method}로 검색됨]\n{chunk_text}")
        
        context = "\n\n".join(context_parts)
        
        # 응답 생성
        analysis_service = AnalysisService()
        response = analysis_service.generate_document_based_answer(
            user_message, context, language
        )
        
        # 검색 정보 구성
        unique_articles = set()
        for result in search_results:
            chunk = result['chunk']
            if isinstance(chunk, dict) and chunk.get('article_num'):
                unique_articles.add(f"제{chunk['article_num']}조")
        
        article_count = len(unique_articles)
        
        search_info_messages = {
            "한국어": f"🔍 **문서 기반 답변**: {article_count}개 조항 (**100% 계약서 내용 기반**)",
            "日本語": f"🔍 **文書ベース回答**: {article_count}個の条項 (**100%契約書内容ベース**)",
            "中文": f"🔍 **基于文档的回答**: {article_count}个条款 (**100%基于合同内容**)",
            "English": f"🔍 **Document-based Answer**: {article_count} clauses (**100% contract content based**)",
            "Español": f"🔍 **Respuesta basada en documento**: {article_count} cláusulas (**100% basado en contenido del contrato**)"
        }
        
        search_info = search_info_messages.get(language, search_info_messages['한국어'])
        
        # 한국어인 경우 법률 용어 설명 추가
        if language == "한국어":
            translator = TranslationService()
            legal_terms_explanation = translator.extract_legal_terms_from_korean_text(response)
            response += legal_terms_explanation
        
        return {
            'response': response + f"\n\n{search_info}",
            'search_results': [
                {
                    'chunk_text': result['chunk'].get('text', '')[:200] + '...',
                    'method': result['method'],
                    'score': result['score']
                } for result in search_results
            ],
            'search_method': ', '.join(set(search_methods)),
            'search_info': search_info,
            'used_chunk_ids': used_chunk_ids
        }
        
    except Exception as e:
        print(f"❌ RAG 응답 생성 오류: {str(e)}")
        return {
            'response': f"응답 생성 중 오류가 발생했습니다: {str(e)}",
            'search_results': [],
            'search_method': 'error',
            'search_info': '',
            'used_chunk_ids': []
        }

@require_http_methods(["GET"])
@login_required
def document_list(request):
    """사용자 문서 목록"""
    documents = Document.objects.filter(user=request.user).order_by('-created_at')
    
    context = {
        'documents': documents
    }
    
    return render(request, 'rag/document_list.html', context)

@require_http_methods(["POST"])
@login_required
@csrf_exempt
def delete_document(request, document_id):
    """문서 삭제"""
    try:
        document = get_object_or_404(Document, id=document_id, user=request.user)
        document_title = document.title
        
        # 관련 채팅 세션도 함께 삭제됨 (CASCADE)
        document.delete()
        
        return JsonResponse({
            'success': True,
            'message': f'"{document_title}" 문서가 삭제되었습니다.'
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'문서 삭제 중 오류 발생: {str(e)}'
        }, status=500)

@require_http_methods(["GET"])
@login_required  
def analysis_detail(request, document_id):
    """문서 분석 상세 정보"""
    document = get_object_or_404(Document, id=document_id, user=request.user)
    language = request.GET.get('language', '한국어')
    
    # 분석 결과 조회
    analyses = DocumentAnalysis.objects.filter(
        document=document,
        language=language
    )
    
    summary = analyses.filter(analysis_type='summary').first()
    risk_analysis = analyses.filter(analysis_type='risk_analysis').first()
    
    # 청크 정보
    chunks = DocumentChunk.objects.filter(document=document).order_by('chunk_index')
    
    context = {
        'document': document,
        'summary': summary,
        'risk_analysis': risk_analysis,
        'chunks': chunks,
        'language': language,
        'supported_languages': list(IMPROVED_LANGUAGES.keys())
    }

    return render(request, 'rag/upload.html', context)