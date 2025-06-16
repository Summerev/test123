from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# DEBUG가 False일 때 정적 파일을 서빙하기 위해 필요한 임포트
from django.views.static import serve
from django.urls import re_path # re_path를 사용하여 정규 표현식 경로 정의

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.main.urls')),
    path('chatbot/', include('apps.chatbot.urls')),
    path('accounts/', include('apps.accounts.urls')),
    path('admin-ui/', include('apps.admin_ui.urls')),
    path('rag/', include('apps.rag.urls')),
]

# DEBUG 모드일 때만 Debug Toolbar URL을 추가.
if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [
        path('__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns

# 미디어 파일 개발용 서빙
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


# 중요: DEBUG가 False일 때 개발 서버에서 정적 파일을 서빙하기 위한 추가 설정 (절대 프로덕션용 아님!)
# 프로덕션 환경에서는 Nginx, Apache와 같은 웹 서버가 정적 파일을 서빙합니다.
if not settings.DEBUG:
    urlpatterns += [
        re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
    ]
