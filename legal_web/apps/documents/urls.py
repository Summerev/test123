# apps/documents/urls.py

from django.urls import path
from . import views

app_name = 'documents'
urlpatterns = [
    path('analyze/', views.analyze_document_view, name='analyze'),
]