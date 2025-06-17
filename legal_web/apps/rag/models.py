# apps/rag/models.py
from django.db import models
from django.contrib.auth import get_user_model
import uuid
import os

User = get_user_model()

class Document(models.Model):
    """업로드된 계약서 문서 모델"""
    
    CONTRACT_TYPES = [
        ('근로계약서', '근로계약서'),
        ('용역계약서', '용역계약서'),
        ('매매계약서', '매매계약서'),
        ('임대차계약서', '임대차계약서'),
        ('비밀유지계약서', '비밀유지계약서'),
        ('공급계약서', '공급계약서'),
        ('프랜차이즈 계약서', '프랜차이즈 계약서'),
        ('MOU', 'MOU'),
        ('주식양도계약서', '주식양도계약서'),
        ('라이선스 계약서', '라이선스 계약서'),
        ('합작투자계약서', '합작투자계약서'),
        ('위임계약서', '위임계약서'),
        ('기술이전계약서', '기술이전계약서'),
        ('하도급계약서', '하도급계약서'),
        ('광고대행계약서', '광고대행계약서'),
        ('컨설팅계약서', '컨설팅계약서'),
        ('출판계약서', '출판계약서'),
        ('건설공사계약서', '건설공사계약서'),
        ('임의규약계약서', '임의규약계약서'),
        ('투자계약서', '투자계약서'),
        ('기타', '기타'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255, verbose_name='문서 제목')
    file = models.FileField(upload_to='documents/%Y/%m/%d/', verbose_name='파일')
    file_type = models.CharField(max_length=10, verbose_name='파일 형식')
    file_size = models.PositiveIntegerField(verbose_name='파일 크기 (bytes)')
    
    # 계약서 분석 결과
    contract_type = models.CharField(
        max_length=50, 
        choices=CONTRACT_TYPES, 
        null=True, 
        blank=True,
        verbose_name='계약서 유형'
    )
    confidence_score = models.FloatField(null=True, blank=True, verbose_name='유형 감지 신뢰도')
    
    # 문서 내용
    text_content = models.TextField(verbose_name='추출된 텍스트')
    chunk_count = models.PositiveIntegerField(default=0, verbose_name='청크 개수')
    
    # 벡터 인덱스 정보
    vector_indexed = models.BooleanField(default=False, verbose_name='벡터 인덱스 생성 여부')
    qdrant_collection_name = models.CharField(max_length=100, null=True, blank=True)
    
    # 메타데이터
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일시')
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name='처리 완료일시')

    class Meta:
        verbose_name = '계약서 문서'
        verbose_name_plural = '계약서 문서들'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.contract_type or '미분류'})"

    def delete(self, *args, **kwargs):
        """파일 삭제 시 실제 파일도 함께 삭제"""
        if self.file and os.path.isfile(self.file.path):
            os.remove(self.file.path)
        super().delete(*args, **kwargs)

    @property
    def file_size_mb(self):
        """파일 크기를 MB 단위로 반환"""
        return round(self.file_size / (1024 * 1024), 2)

class DocumentChunk(models.Model):
    """문서 청크 모델 (조항별 분할된 내용)"""
    
    CHUNK_TYPES = [
        ('article', '조항'),
        ('paragraph', '문단'),
        ('section', '섹션'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chunks')
    
    # 청크 내용
    text = models.TextField(verbose_name='청크 텍스트')
    chunk_type = models.CharField(max_length=20, choices=CHUNK_TYPES, default='paragraph')
    
    # 조항 정보 (조항인 경우)
    article_num = models.PositiveIntegerField(null=True, blank=True, verbose_name='조항 번호')
    article_title = models.CharField(max_length=255, null=True, blank=True, verbose_name='조항 제목')
    
    # 청크 메타데이터
    chunk_index = models.PositiveIntegerField(verbose_name='청크 순서')
    char_count = models.PositiveIntegerField(verbose_name='문자 수')
    
    # 벡터 임베딩 정보
    vector_id = models.PositiveIntegerField(null=True, blank=True, verbose_name='벡터 DB ID')
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = '문서 청크'
        verbose_name_plural = '문서 청크들'
        ordering = ['document', 'chunk_index']
        unique_together = ['document', 'chunk_index']

    def __str__(self):
        if self.article_num:
            return f"제{self.article_num}조: {self.article_title}"
        return f"{self.document.title} - 청크 {self.chunk_index}"

class ChatSession(models.Model):
    """채팅 세션 모델"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions')
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='chat_sessions')
    
    # 세션 정보
    title = models.CharField(max_length=255, verbose_name='세션 제목')
    language = models.CharField(max_length=10, default='한국어', verbose_name='사용 언어')
    
    # 메타데이터
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    message_count = models.PositiveIntegerField(default=0, verbose_name='메시지 수')

    class Meta:
        verbose_name = '채팅 세션'
        verbose_name_plural = '채팅 세션들'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} - {self.document.title}"

class ChatMessage(models.Model):
    """채팅 메시지 모델"""
    
    MESSAGE_TYPES = [
        ('user', '사용자'),
        ('assistant', 'AI 어시스턴트'),
        ('system', '시스템'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    
    # 메시지 내용
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES)
    content = models.TextField(verbose_name='메시지 내용')
    
    # RAG 검색 정보 (AI 응답인 경우)
    search_results = models.JSONField(null=True, blank=True, verbose_name='RAG 검색 결과')
    used_chunks = models.ManyToManyField(DocumentChunk, blank=True, verbose_name='사용된 청크들')
    search_method = models.CharField(max_length=100, null=True, blank=True, verbose_name='검색 방법')
    
    # 메타데이터
    created_at = models.DateTimeField(auto_now_add=True)
    response_time = models.FloatField(null=True, blank=True, verbose_name='응답 시간(초)')

    class Meta:
        verbose_name = '채팅 메시지'
        verbose_name_plural = '채팅 메시지들'
        ordering = ['session', 'created_at']

    def __str__(self):
        return f"{self.get_message_type_display()}: {self.content[:50]}..."

class DocumentAnalysis(models.Model):
    """문서 분석 결과 모델"""
    
    ANALYSIS_TYPES = [
        ('summary', '요약'),
        ('risk_analysis', '위험 분석'),
        ('full_analysis', '전체 분석'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='analyses')
    
    # 분석 정보
    analysis_type = models.CharField(max_length=20, choices=ANALYSIS_TYPES)
    language = models.CharField(max_length=10, default='한국어', verbose_name='분석 언어')
    
    # 분석 결과
    content = models.TextField(verbose_name='분석 내용')
    key_findings = models.JSONField(null=True, blank=True, verbose_name='주요 발견사항')
    risk_score = models.FloatField(null=True, blank=True, verbose_name='위험 점수')
    
    # 메타데이터
    created_at = models.DateTimeField(auto_now_add=True)
    processing_time = models.FloatField(null=True, blank=True, verbose_name='처리 시간(초)')

    class Meta:
        verbose_name = '문서 분석'
        verbose_name_plural = '문서 분석들'
        ordering = ['-created_at']
        unique_together = ['document', 'analysis_type', 'language']

    def __str__(self):
        return f"{self.document.title} - {self.get_analysis_type_display()} ({self.language})"

class UserPreference(models.Model):
    """사용자 설정 모델"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='rag_preference')
    
    # 언어 설정
    preferred_language = models.CharField(max_length=10, default='한국어', verbose_name='선호 언어')
    
    # RAG 검색 설정
    search_top_k = models.PositiveIntegerField(default=3, verbose_name='검색 결과 수')
    enable_vector_search = models.BooleanField(default=True, verbose_name='벡터 검색 사용')
    
    # UI 설정
    show_search_details = models.BooleanField(default=False, verbose_name='검색 상세 정보 표시')
    auto_translate = models.BooleanField(default=True, verbose_name='자동 번역')
    
    # 메타데이터
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = '사용자 설정'
        verbose_name_plural = '사용자 설정들'

    def __str__(self):
        return f"{self.user.username}의 RAG 설정"