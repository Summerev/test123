from django.urls import path
from . import views

urlpatterns = [
    path('', views.rag_query, name='rag_query'),
]
