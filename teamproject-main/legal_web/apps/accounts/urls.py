# apps/accounts/urls.py
from django.urls import path
from . import views

APP_NAME = 'accounts'

urlpatterns = [
    # 기존 템플릿 기반 뷰 (필요시 사용)
    path('login/', views.login_view, name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),

    # AJAX API 엔드포인트
    path('api/login/', views.api_login, name='api_login'),
    path('api/signup/', views.api_signup, name='api_signup'),
]
