# teamproject/legal_web/apps/rag/urls.py

from django.urls import path
from . import views

# 이 앱의 URL들을 구분하기 위한 이름공간(namespace) 설정
app_name = 'rag'

urlpatterns = [
    # API 엔드포인트
    #path('analyze/', views.analyze_document_view, name='analyze'),
    #path('ask/', views.ask_question_view, name='ask'),

    # 기존 테스트용 페이지 URL 
    #path('query/', views.rag_query, name='query_page'),
]