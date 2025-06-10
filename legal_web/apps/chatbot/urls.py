from django.urls import path
from . import views

urlpatterns = [
    path('', views.chat_main, name='chat_main'),
    path('contract/', views.chat_contract, name='chat_contract'),
    path('policy/', views.chat_policy, name='chat_policy'),
    path('chat-api/', views.chat_api, name='chat_api'),  # ✅ 여기 중요
]