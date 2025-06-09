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
            login(request, user)
            messages.success(request, f"{user.name}님, 안녕하세요!")

            # AJAX 요청인 경우
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f"{user.name}님, 로그인되었습니다!",
                    'user': {
                        'name': user.name,
                        'email': user.email
                    }
                })

            # 일반 폼 제출인 경우
            next_url = request.GET.get('next', '/')
            return redirect(next_url)
        else:
            # AJAX 요청인 경우 에러 반환
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                errors = {}
                for field, error_list in form.errors.items():
                    errors[field] = error_list[0] if error_list else ""
                return JsonResponse({
                    'success': False,
                    'errors': errors,
                    'message': '로그인에 실패했습니다.'
                })
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
            # 회원가입 후 자동 로그인
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

        if not email or not password:
            return JsonResponse({
                'success': False,
                'error': '이메일과 비밀번호를 모두 입력해주세요.'
            })

        # 이메일로 사용자 찾기
        # get_user_model()은 최상단에 임포트되었으므로 직접 호출하여 사용합니다.
        # 변수 이름은 snake_case 규칙을 따르도록 'user_model'로 변경했습니다.
        user_model = get_user_model()

        try:
            # email을 사용하여 사용자 객체 조회
            user_obj = user_model.objects.get(email=email)

            # 인증 시도 시 user_obj.username을 사용
            authenticated_user = authenticate(
                request,
                username=user_obj.username,
                password=password
            )

            if authenticated_user:
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
        # "lazy % formatting"을 사용하여 로깅합니다.
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
        # "Catching too general exception Exception" 경고는 여전히 뜰 수 있지만,
        # API의 최종 에러 핸들러로서는 용인되는 경우가 많습니다.
        # 가장 중요한 것은 아래처럼 exc_info=True를 사용하여 상세한 스택 트레이스를 로깅하는 것입니다.
        logger.error("Signup API error: %s", e, exc_info=True)
        return JsonResponse({
            'success': False,
            'error': '서버 오류가 발생했습니다.'
        })

@csrf_exempt
def logout_view(request):
    """
    AJAX 또는 일반 요청에 따른 로그아웃 처리
    """
    if request.method != "POST":
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)
        return redirect('/')

    if request.user.is_authenticated:
        user_name = getattr(request.user, 'name', '사용자')
        logout(request)
        messages.success(request, f"{user_name}님, 로그아웃되었습니다.")

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True, 'message': '로그아웃되었습니다.'})
        else:
            return redirect('/')
    else:
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': False, 'error': '로그인된 사용자가 아닙니다.'}, status=401)
        else:
            return redirect('/accounts/login/')


@login_required
def profile_view(request):
    """
    사용자 프로필 페이지
    """
    return render(request, 'accounts/profile.html', {
        'user': request.user
    })
