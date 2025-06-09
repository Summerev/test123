# apps/accounts/models.py
from django.contrib.auth.models import AbstractUser, Group, Permission # Group, Permission 임포트 추가
from django.db import models


class CustomUser(AbstractUser):
    """
    기본 Django User 모델을 확장한 커스텀 사용자 모델
    """
    email = models.EmailField(unique=True, verbose_name="이메일")
    name = models.CharField(max_length=100, verbose_name="이름")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="가입일")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일")
    is_email_verified = models.BooleanField(default=False, verbose_name="이메일 인증 여부")

    # 이메일을 username으로 사용 (AbstractUser는 username 필드를 가지고 있음)
    USERNAME_FIELD = 'email'
    # `username`이 REQUIRED_FIELDS에 있으면 에러가 발생할 수 있습니다.
    # `AbstractUser`는 `username`을 가지고 있고, `USERNAME_FIELD`를 `email`로 설정했으므로
    # `REQUIRED_FIELDS`에는 `email` 외에 사용자에게 필수적으로 입력받을 필드만 나열합니다.
    # 예를 들어 'name'만 필수라면:
    REQUIRED_FIELDS = ['name'] # 'username' 필드는 AbstractUser가 제공하므로 중복될 필요 없습니다.


    # --- 관련 이름(related_name) 충돌 해결 부분 ---
    # AbstractUser가 가진 groups 필드를 명시적으로 오버라이드하고 related_name을 추가합니다.
    groups = models.ManyToManyField(
        Group,
        verbose_name=('groups'),
        blank=True,
        help_text=(
            'The groups this user belongs to. A user will get all permissions '
            'granted to each of their groups.'
        ),
        related_name="custom_user_groups", # 충돌 방지를 위한 고유한 related_name
        related_query_name="custom_user",
    )

    # AbstractUser가 가진 user_permissions 필드를 명시적으로 오버라이드하고 related_name을 추가합니다.
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name=('user permissions'),
        blank=True,
        help_text=('Specific permissions for this user.'),
        related_name="custom_user_permissions", # 충돌 방지를 위한 고유한 related_name
        related_query_name="custom_user_permission",
    )
    # --- 관련 이름(related_name) 충돌 해결 부분 끝 ---


    class Meta:
        verbose_name = "사용자"
        verbose_name_plural = "사용자들"
        db_table = 'accounts_user' # 데이터베이스 테이블 이름

    def __str__(self):
        return f"{self.name} ({self.email})"
