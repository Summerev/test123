# apps/accounts/views.py

# 표준 라이브러리 임포트
import json
import logging

# 서드파티 임포트
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from datetime import timedelta # timedelta 임포트 추가
from django.utils import timezone # timezone 임포트 추가


# 로컬 애플리케이션 임포트
from .forms import CustomUserCreationForm, CustomAuthenticationForm


logger = logging.getLogger(__name__)


def login_view(request):
    """
    로그인 페이지 및 처리
    """
    if request.method == 'POST':
        form = CustomAuthenticationForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            
            # 폼의 cleaned_data에서 remember_me 값을 가져옵니다.
            # get('remember_me', False)는 remember_me 필드가 없거나 False이면 False를 반환합니다.
            remember_me = form.cleaned_data.get('remember_me', False) 

            login(request, user) # 먼저 로그인 처리

            if remember_me:
                # 30일 동안 세션 유지 (초 단위로 설정: 30일 * 24시간 * 60분 * 60초)
                # settings.py의 SESSION_COOKIE_AGE보다 긴 시간을 설정할 수 있습니다.
                request.session.set_expiry(60 * 60 * 24 * 30) 
                print("Session set to 30 days expiry.") # 디버깅용
            else:
                # 브라우저 종료 시 세션 만료
                # settings.py의 SESSION_EXPIRE_AT_BROWSER_CLOSE = True 와 동일하게 작동합니다.
                request.session.set_expiry(0) 
                print("Session set to expire at browser close.") # 디버깅용

            messages.success(request, f"{user.name}님, 안녕하세요!")

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f"{user.name}님, 로그인되었습니다!",
                    'user': {
                        'name': user.name,
                        'email': user.email
                    }
                })

            next_url = request.GET.get('next', '/')
            return redirect(next_url)
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                errors = {}
                for field, error_list in form.errors.items():
                    # 폼 오류 메시지를 더 깔끔하게 처리
                    errors[field] = error_list[0] if error_list else ""
                return JsonResponse({
                    'success': False,
                    'errors': errors,
                    'message': '로그인에 실패했습니다. 입력값을 확인해주세요.' # 더 명확한 메시지
                }, status=400) # Bad Request 상태 코드 추가
    else:
        form = CustomAuthenticationForm()

    return render(request, 'accounts/login.html', {'form': form})


def signup_view(request):
    """
    회원가입 페이지 및 처리
    """
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            # 회원가입 후 자동 로그인 시에는 로그인 유지 설정을 하지 않습니다.
            # 필요하다면 여기에 기본 로그인 유지 설정을 추가할 수 있습니다.
            login(request, user)
            messages.success(request, f"{user.name}님, 회원가입을 환영합니다!")

            # AJAX 요청인 경우
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f"{user.name}님, 회원가입이 완료되었습니다!",
                    'user': {
                        'name': user.name,
                        'email': user.email
                    }
                })

            # 일반 폼 제출인 경우
            return redirect('/')
        else:
            # AJAX 요청인 경우 에러 반환
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                errors = {}
                for field, error_list in form.errors.items():
                    errors[field] = error_list[0] if error_list else ""
                return JsonResponse({
                    'success': False,
                    'errors': errors,
                    'message': '회원가입에 실패했습니다.'
                })
    else:
        form = CustomUserCreationForm()

    return render(request, 'accounts/signup.html', {'form': form})


@require_http_methods(["POST"])
@csrf_exempt  # API 엔드포인트이므로 CSRF 면제 (실제 운영시에는 적절한 CSRF 보호 필요)
def api_login(request):
    """
    AJAX 로그인 API 엔드포인트
    """
    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        # remember_me 값을 JSON 데이터에서 가져옵니다.
        remember_me = data.get('remember_me', False) 

        if not email or not password:
            return JsonResponse({
                'success': False,
                'error': '이메일과 비밀번호를 모두 입력해주세요.'
            })

        # 이메일로 사용자 찾기
        user_model = get_user_model()

        try:
            user_obj = user_model.objects.get(email=email)

            authenticated_user = authenticate(
                request,
                username=user_obj.username,
                password=password
            )

            if authenticated_user:
                # remember_me 값에 따라 세션 만료 시간 설정
                if remember_me:
                    # 30일 동안 세션 유지
                    request.session.set_expiry(60 * 60 * 24 * 30) 
                else:
                    # 브라우저 종료 시 세션 만료
                    request.session.set_expiry(0) # 0 또는 False로 설정하면 브라우저 종료 시 만료

                login(request, authenticated_user)
                return JsonResponse({
                    'success': True,
                    'message': '로그인 성공!',
                    'user': {
                        'name': authenticated_user.name,
                        'email': authenticated_user.email
                    }
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': '비밀번호가 올바르지 않습니다.'
                })

        except user_model.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': '존재하지 않는 이메일입니다.'
            })

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': '잘못된 요청 형식입니다.'
        })
    except Exception as e:
        logger.error("Login API error: %s", str(e))
        return JsonResponse({
            'success': False,
            'error': '서버 오류가 발생했습니다.'
        })


@require_http_methods(["POST"])
@csrf_exempt  # API 엔드포인트이므로 CSRF 면제
def api_signup(request):
    """
    AJAX 회원가입 API 엔드포인트
    """
    try:
        data = json.loads(request.body)
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirmPassword')

        # 기본 유효성 검사
        if not all([name, email, password, confirm_password]):
            return JsonResponse({
                'success': False,
                'error': '모든 필드를 입력해주세요.'
            })

        if password != confirm_password:
            return JsonResponse({
                'success': False,
                'error': '비밀번호가 일치하지 않습니다.'
            })

        # 폼을 사용하여 유효성 검사 및 사용자 생성
        form_data = {
            'name': name,
            'email': email,
            'password1': password,
            'password2': confirm_password
        }

        form = CustomUserCreationForm(form_data)
        if form.is_valid():
            user = form.save()
            # 회원가입 후 자동 로그인
            # 회원가입 시에는 '로그인 유지' 옵션을 기본적으로 적용하지 않습니다.
            # 필요하면 여기서 request.session.set_expiry(0) 또는 원하는 기간 설정 가능.
            login(request, user)

            return JsonResponse({
                'success': True,
                'message': f"{user.name}님, 회원가입이 완료되었습니다!",
                'user': {
                    'name': user.name,
                    'email': user.email
                }
            })
        else:
            # 폼 에러 처리
            errors = []
            for field, error_list in form.errors.items():
                for error in error_list:
                    errors.append(error)

            return JsonResponse({
                'success': False,
                'error': errors[0] if errors else '회원가입에 실패했습니다.'
            })

    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': '잘못된 요청 형식입니다.'
        })
    except Exception as e:
        logger.error("Signup API error: %s", e, exc_info=True)
        return JsonResponse({
            'success': False,
            'error': '서버 오류가 발생했습니다.'
        })

@csrf_exempt
def logout_view(request):
    """
    로그아웃 처리
    """
    # 사용자가 인증되었는지 먼저 확인
    if request.user.is_authenticated:
        username = request.user.username # 로그아웃 전 사용자 이름 저장
        logout(request)
        messages.info(request, f"{username}님, 로그아웃되었습니다.")
        # AJAX 요청 처리
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True, 'message': '로그아웃되었습니다.'})
        # 일반 요청 처리
        return redirect('/')
    else:
        # 이미 로그아웃된 상태이거나 세션이 만료된 경우
        messages.warning(request, "로그인 세션이 유효하지 않습니다. 다시 로그인해주세요.")
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            # 401 Unauthorized 또는 403 Forbidden 상태 코드를 반환하여 클라이언트에게 세션이 없음을 알림
            return JsonResponse({'success': False, 'message': '로그인 세션이 만료되었을 수 있습니다.'}, status=401)
        return redirect('/') # 또는 로그인 페이지로 리디렉션

def check_login_status(request):
    """
    현재 사용자의 로그인 상태를 JSON으로 반환하는 뷰
    """
    if request.user.is_authenticated:
        # Custom User 모델에 'name' 필드가 있다고 가정합니다.
        # 만약 'name' 필드가 없다면, request.user.username 이나 request.user.email 등을 사용하세요.
        return JsonResponse({
            'is_authenticated': True,
            'user': {
                'name': request.user.name if hasattr(request.user, 'name') else request.user.username,
                'email': request.user.email,
            }
        })
    else:
        return JsonResponse({
            'is_authenticated': False
        })

@login_required
def profile_view(request):
    """
    사용자 프로필 페이지
    """
    return render(request, 'accounts/profile.html', {
        'user': request.user
    })