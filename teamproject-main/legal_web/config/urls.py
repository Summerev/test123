
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.main.urls')),
    path('chatbot/', include('apps.chatbot.urls')),
    path('accounts/', include('apps.accounts.urls')),
    path('admin-ui/', include('apps.admin_ui.urls')),
    path('rag/', include('apps.rag.urls')),
]

# 미디어 파일 개발용 서빙
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
