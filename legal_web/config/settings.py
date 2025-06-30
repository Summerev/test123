from pathlib import Path
import os
from dotenv import load_dotenv
from openai import OpenAI, APIError


# 기본 경로 설정
BASE_DIR = Path(__file__).resolve().parent.parent

# .env(환경 변수) 로드
load_dotenv(os.path.join(BASE_DIR, ".env"))

# 시크릿 키 불러오기(없으면 디폴트)
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key-if-not-set")

# 디버그 환경변수
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")



# DEBUG가 False일 때, Django 애플리케이션이 응답할 수 있는 호스트를 정의. 개발 환경에서는 'localhost'와 '127.0.0.1'을 포함.
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# 앱 설정
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'debug_toolbar',
    'apps.main',		# 메인
    'apps.chatbot',		# 
    'apps.accounts',	# 계정
    'apps.admin_ui',	# 어드민(아직 x)
    'apps.documents',	# 문서 처리 관련된건 여기로

    'apps.rag',
]

MIDDLEWARE = [
    'debug_toolbar.middleware.DebugToolbarMiddleware', # 디버그 툴바
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

INTERNAL_IPS = [
    "127.0.0.1", # 디버그 툴바는 INTERNAL_IPS에 지정된 주소에서 표시
    # "192.168.1.100", # 만약 다른 기기에서 접근할 경우 해당 IP도 추가
]

# 디버그 툴 바 설정
DEBUG_TOOLBAR_CONFIG = {
    "SHOW_TOOLBAR_CALLBACK": lambda request: True, # 모든 요청에 툴바 표시 (임시)
    "INTERCEPT_REDIRECTS": True,
    "ENABLE_STACKTRACES": True,
    "RESULTS_CACHE_SIZE": 100,
    "SHOW_PRIVATE_PROFILERS": True,
    "ROOT_TAG_ATTRS": 'class="dbt"',
    "AJAX_REQUESTS": True,
}

# 루트 URL 설정
ROOT_URLCONF = 'config.urls'

# 템플릿 설정
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],  # 전역 base.html
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# WSGI 설정
WSGI_APPLICATION = 'config.wsgi.application'

# DB 설정
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv("DB_NAME"),
        'USER': os.getenv("DB_USER"),
        'PASSWORD': os.getenv("DB_PASSWORD"),
        'HOST': os.getenv("DB_HOST", "localhost"),
        'PORT': os.getenv("DB_PORT", "5432"),
    }
}

# 비밀번호 검증기
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# 국제화 설정
LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"
USE_I18N = True
USE_TZ = False

# 🔹 정적 파일 설정: 전역 static/ + 각 앱 static 포함 가능
STATIC_URL = 'static/'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'), # main.js가 프로젝트 루트의 static 폴더에 있다면 이 경로가 있어야 함
    # 다른 앱의 static 폴더가 있다면 추가
]

# collectstatic 명령어가 정적 파일을 모을 최종 경로 (DEBUG=False일 때 Nginx/Apache 등 웹 서버가 서빙)
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles') # 최종 모아질 디렉토리

# 미디어 파일 설정
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# 기본 PK 필드 설정
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# 사용자 모델 설정
AUTH_USER_MODEL = 'accounts.CustomUser' # '앱이름.모델이름' 형식


# 세션 관련 설정
# 브라우저가 닫힐 때 세션 쿠키가 만료되도록 설정
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
