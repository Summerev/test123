from django.urls import path
from . import views

urlpatterns = [
    path('', views.chatbot_view, name='chatbot'),  # 루트로 접속 시 chatbot.html 띄움
]