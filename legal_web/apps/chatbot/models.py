# apps/chatbot/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class ChatHistory(models.Model):
    """기존 채팅 기록 모델 (RAG와 별도)"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    session_id = models.CharField(max_length=255, null=True, blank=True)
    message = models.TextField()
    response = models.TextField()
    mode = models.CharField(max_length=50, default='default')  # contract, policy, default
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = '채팅 기록'
        verbose_name_plural = '채팅 기록들'
    
    def __str__(self):
        return f"{self.user or '익명'} - {self.message[:50]}..."

class UploadedFile(models.Model):
    """기존 파일 업로드 기록 (RAG와 별도)"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10)
    file_size = models.IntegerField()
    text_content = models.TextField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = '업로드 파일'
        verbose_name_plural = '업로드 파일들'
    
    def __str__(self):
        return f"{self.filename} ({self.user or '익명'})"