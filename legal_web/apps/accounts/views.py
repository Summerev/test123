# apps/accounts/views.py

# 표준 라이브러리 임포트
import json
import logging

# 서드파티 임포트
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

# 로컬 애플리케이션 임포트
from .forms import CustomUserCreationForm, CustomAuthenticationForm


logger = logging.getLogger(__name__)


def login_view(request):
    """
    로그인 페이지 및 처리 (웹 폼 제출용)
    """
    if request.method == 'POST':
        form = CustomAuthenticationForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            remember_me = form.cleaned_data.get('remember_me', False)

            login(request, user) # 먼저 로그인 처리

            if remember_me:
                request.session.set_expiry(60 * 60 * 24 * 30) # 30일 동안 세션 유지
                logger.info("Session set to 30 days expiry for user: %s", user.email)
            else:
                request.session.set_expiry(0) # 브라우저 종료 시 세션 만료
                logger.info("Session set to expire at browser close for user: %s", user.email)

            # user.name은 Custom User 모델에 'name' 필드가 있을 때 작동합니다.
            # 없다면 user.get_full_name() 또는 user.username 등을 사용하세요.
            messages.success(request, f"{user.name if hasattr(user, 'name') else user.username}님, 안녕하세요!")

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f"{user.name if hasattr(user, 'name') else user.username}님, 로그인되었습니다!",
                    'user': {
                        'name': user.name if hasattr(user, 'name') else user.username,
                        'email': user.email
                    }
                })

            next_url = request.GET.get('next', '/')
            return redirect(next_url)
        else:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                errors = {}
                for _field, error_list in form.errors.items(): # 'field' 대신 '_' 사용
                    # 폼 오류 메시지를 더 깔끔하게 처리
                    errors[_field] = error_list[0] if error_list else ""
                return JsonResponse({
                    'success': False,
                    'errors': errors,
                    'message': '로그인에 실패했습니다. 입력값을 확인해주세요.'
                }, status=400) # Bad Request 상태 코드 추가
    else:
        form = CustomAuthenticationForm()

    return render(request, 'accounts/login.html', {'form': form})


def signup_view(request):
    """
    회원가입 페이지 및 처리 (웹 폼 제출용)
    """
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            # 회원가입 후 자동 로그인 시에는 로그인 유지 설정을 하지 않습니다.
            # 필요하다면 여기에 기본 로그인 유지 설정을 추가할 수 있습니다.
            login(request, user)
            messages.success(request, f"{user.name if hasattr(user, 'name') else user.username}님, 회원가입을 환영합니다!")

            # AJAX 요청인 경우
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': f"{user.name if hasattr(user, 'name') else user.username}님, 회원가입이 완료되었습니다!",
                    'user': {
                        'name': user.name if hasattr(user, 'name') else user.username,
                        'email': user.email
                    }
                })

            # 일반 폼 제출인 경우
            return redirect('/')
        else:
            # AJAX 요청인 경우 에러 반환
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                errors = {}
                for _field, error_list in form.errors.items(): # 'field' 대신 '_' 사용
                    errors[_field] = error_list[0] if error_list else ""
                return JsonResponse({
                    'success': False,
                    'errors': errors,
                    'message': '회원가입에 실패했습니다.'
                }, status=400) # Bad Request 상태 코드 추가
    else:
        form = CustomUserCreationForm()

    return render(request, 'accounts/signup.html', {'form': form})


@require_http_methods(["POST"])
@csrf_exempt  # API 엔드포인트이므로 CSRF 면제 (실제 운영시에는 적절한 CSRF 보호 필요)
def api_login(request):
    """
    AJAX 로그인 API 엔드포인트
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            remember_me = data.get('remember_me', False)

            user = authenticate(request, username=email, password=password)

            if user is not None:
                login(request, user)

                if not remember_me:
                    request.session.set_expiry(0)
                else:
                    request.session.set_expiry(None)

                # 주의: user.name은 기본 User 모델에 없습니다. 커스텀 User 모델에 'name' 필드가 있을 때만 작동합니다.
                # 없다면 user.get_full_name() 또는 user.username, user.email 등을 사용하세요.
                return JsonResponse({'success': True, 'message': f"{user.name if hasattr(user, 'name') else user.username}님 환영합니다!",
                                     'user': {'name': user.name if hasattr(user, 'name') else user.username, 'email': user.email}})
            else:
                return JsonResponse({'success': False, 'error': '이메일 또는 비밀번호가 올바르지 않습니다.'}, status=400)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'error': '잘못된 JSON 형식입니다.'}, status=400)
        except Exception as e:
            # 이 경고를 명시적으로 무시하려면 # pylint: disable=broad-except 주석 추가
            logger.error("Unexpected error in api_login: %s", e, exc_info=True)
            return JsonResponse({'success': False, 'error': f'서버 오류: {str(e)}'}, status=500)

    return JsonResponse({'success': False, 'error': 'POST 요청만 허용됩니다.'}, status=405)


@require_http_methods(["POST"])
@csrf_exempt  # API 엔드포인트이므로 CSRF 면제
def api_signup(request):
    """
    AJAX 회원가입 API 엔드포인트
    """
    if request.method != 'POST': # POST 요청이 아닐 경우 미리 처리
        return JsonResponse({
            'success': False,
            'error': 'POST 요청만 허용됩니다.'
        }, status=405)

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
            }, status=400) # 누락된 필드는 400 Bad Request

        if password != confirm_password:
            return JsonResponse({
                'success': False,
                'error': '비밀번호가 일치하지 않습니다.'
            }, status=400) # 비밀번호 불일치는 400 Bad Request

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
                'message': f"{user.name if hasattr(user, 'name') else user.username}님, 회원가입이 완료되었습니다!",
                'user': {
                    'name': user.name if hasattr(user, 'name') else user.username,
                    'email': user.email
                }
            })
        else:
            # 폼 에러 처리
            errors = {}
            for _field, error_list in form.errors.items(): # 'field' 대신 '_' 사용
                errors[_field] = error_list[0] if error_list else ""

            return JsonResponse({
                'success': False,
                'errors': errors,
                'message': '회원가입에 실패했습니다.'
            }, status=400) # Bad Request 상태 코드 추가

    except json.JSONDecodeError:
        logger.error("JSON decode error in api_signup", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': '잘못된 요청 형식입니다.'
        }, status=400)
    except Exception as e:
        logger.error("Signup API error: %s", e, exc_info=True)
        return JsonResponse({
            'success': False,
            'error': '서버 오류가 발생했습니다.'
        }, status=500)


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

# # 개발/디버깅 목적으로만 사용하고, 프로덕션 배포 시에는 제거하거나 별도의 파일로 옮기세요.
# from django.http import HttpResponse
# from django.contrib.auth import get_user_model
# def test_db_query(request):
#     User = get_user_model()
#     # 간단한 쿼리 실행
#     user_count = User.objects.count()
#     return HttpResponse(f"Total users: {user_count}")
