# apps/chatbot/urls.py (RAG 통합 업데이트)
from django.urls import path
from . import views

urlpatterns = [
    # 기존 채팅 페이지들
    path('', views.chat_main, name='chat_main'),
    path('contract/', views.chat_contract, name='chat_contract'), 
    path('policy/', views.chat_policy, name='chat_policy'),
    
    # 기존 API들 (RAG 기능 통합)
    path('chat-api/', views.chat_api, name='chat_api'),
    path('upload-file/', views.upload_file, name='upload_file'),
    
    # 새로운 RAG 관련 API들
    path('api/current-document/', views.get_current_document, name='get_current_document'),
    path('api/clear-document/', views.clear_current_document, name='clear_current_document'),
    path('api/user-documents/', views.get_user_documents, name='get_user_documents'),
]