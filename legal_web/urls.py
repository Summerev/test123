from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.chatbot.urls')),  # ✅ chatbot.urls로 연결돼 있어야 함
    path('', include('chatbot.urls')),
]