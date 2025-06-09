# apps/accounts/forms.py
import re
from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError


User = get_user_model()


class CustomUserCreationForm(UserCreationForm):
    """
    회원가입 폼
    """
    name = forms.CharField(
        max_length=100,
        required=True,
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': '이름을 입력하세요',
            'id': 'signup-name'
        }),
        label="이름"
    )

    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'form-input',
            'placeholder': 'example@email.com',
            'id': 'signup-email'
        }),
        label="이메일"
    )

    password1 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-input',
            'placeholder': '8자 이상 입력하세요',
            'id': 'signup-password1'
        }),
        label="비밀번호"
    )

    password2 = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-input',
            'placeholder': '비밀번호를 다시 입력하세요',
            'id': 'signup-password2'
        }),
        label="비밀번호 확인"
    )

    class Meta:
        model = User
        fields = ('name', 'email', 'password1', 'password2')

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if User.objects.filter(email=email).exists():
            raise ValidationError("이미 사용 중인 이메일입니다.")
        return email

    def clean_password1(self):
        password1 = self.cleaned_data.get('password1')

        # 비밀번호 길이 검증
        if len(password1) < 8:
            raise ValidationError("비밀번호는 8자 이상이어야 합니다.")

        # 비밀번호 복잡성 검증 (선택사항)
        if not re.search(r'[A-Za-z]', password1):
            raise ValidationError("비밀번호에는 최소 하나의 영문자가 포함되어야 합니다.")

        if not re.search(r'[0-9]', password1):
            raise ValidationError("비밀번호에는 최소 하나의 숫자가 포함되어야 합니다.")

        return password1

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        user.name = self.cleaned_data['name']
        # username을 email과 동일하게 설정
        user.username = self.cleaned_data['email']

        if commit:
            user.save()
        return user


class CustomAuthenticationForm(AuthenticationForm):
    """
    로그인 폼
    """
    username = forms.EmailField(
        widget=forms.EmailInput(attrs={
            'class': 'form-input',
            'placeholder': 'example@email.com',
            'id': 'login-email'
        }),
        label="이메일"
    )

    password = forms.CharField(
        widget=forms.PasswordInput(attrs={
            'class': 'form-input',
            'placeholder': '비밀번호를 입력하세요',
            'id': 'login-password'
        }),
        label="비밀번호"
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # username 필드의 라벨을 이메일로 변경
        self.fields['username'].label = '이메일'

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if username:
            # 이메일 형식으로 입력받았지만 실제로는 해당 이메일을 가진 사용자의 username을 찾아서 반환
            try:
                user = User.objects.get(email=username)
                return user.username
            except User.DoesNotExist:
                pass  # 원본 값을 그대로 반환하여 인증 과정에서 처리
        return username
