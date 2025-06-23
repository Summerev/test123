# teamproject/legal_web/apps/rag/urls.py

from django.urls import path
from . import views


app_name = 'rag'

urlpatterns = [
    # 기존 테스트용 페이지 URL 
    #path('query/', views.rag_query, name='query_page'),
]