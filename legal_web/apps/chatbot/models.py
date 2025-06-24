# teamproject/legal_web/apps/chatbot/models.py

'''
from django.db import models
from django.conf import settings 


class ChatMessage(models.Model):
    # 각 메시지를 구분하는 고유 ID (자동 생성)
    id = models.AutoField(primary_key=True)

    # 여러 메시지를 하나의 대화로 묶어주는 ID (프론트엔드에서 생성한 session_id)
    session_id = models.CharField(max_length=100, db_index=True)
    
    # 이 메시지를 소유한 사용자.
    # ForeignKey는 다른 테이블(User)과 연결하는 관계를 의미합니다.
    # on_delete=models.CASCADE: 사용자가 삭제되면, 해당 사용자의 채팅 메시지도 함께 삭제됩니다.
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    # 메시지를 보낸 주체 (사용자인지, 봇인지)
    SENDER_CHOICES = [
        ('user', '사용자'),
        ('bot', '봇'),
    ]
    sender = models.CharField(max_length=10, choices=SENDER_CHOICES)
    
    # 실제 메시지 내용
    message = models.TextField()
    
    # 메시지가 생성된 시간 (자동으로 현재 시간이 저장됨)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        # Django 관리자 페이지 등에서 객체가 표시될 때 사용될 이름
        return f"[{self.timestamp.strftime('%y-%m-%d %H:%M')}] {self.user.username} - {self.sender}: {self.message[:20]}..."

    class Meta:
        # DB에서 데이터를 조회할 때 기본 정렬 순서 (오래된 메시지부터)
        ordering = ['timestamp']
'''