
# apps/rag/urls.py
from django.urls import path
from . import views

app_name = 'rag'

urlpatterns = [
    # 문서 업로드 및 처리
    path('upload/', views.DocumentUploadView.as_view(), name='upload'),
    
    # 문서 목록 및 관리
    path('documents/', views.document_list, name='document_list'),
    path('documents/<uuid:document_id>/delete/', views.delete_document, name='delete_document'),
    
    # 채팅 및 질의응답
    path('chat/<uuid:document_id>/', views.ChatView.as_view(), name='chat'),
    path('api/chat/message/', views.chat_message, name='chat_message'),
    
    # 분석 결과
    path('analysis/<uuid:document_id>/', views.analysis_detail, name='analysis_detail'),
    path('analysis/<uuid:document_id>/regenerate/', views.regenerate_analysis, name='regenerate_analysis'),

    # API 키 테스트
    path('api/test-key/', views.api_key_test, name='api_key_test'),
    
    # 대시보드 (추가하면 좋을 것)
    path('dashboard/', views.dashboard, name='dashboard'),
    
    # 빠른 API들 (기존 chatbot 연동용)
    path('api/quick-upload/', views.quick_upload_api, name='quick_upload_api'),
    path('api/quick-chat/', views.quick_chat_api, name='quick_chat_api'),
]