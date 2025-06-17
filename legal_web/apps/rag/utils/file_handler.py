# apps/rag/utils/file_handler.py
import os
from typing import Union
from django.core.files.uploadedfile import UploadedFile

class FileHandler:
    """파일 처리 유틸리티 클래스"""
    
    # 지원하는 파일 형식
    SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt']
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    @classmethod
    def validate_file(cls, uploaded_file: UploadedFile) -> bool:
        """파일 유효성 검사"""
        try:
            # 파일 확장자 검사
            file_ext = os.path.splitext(uploaded_file.name)[1].lower()
            if file_ext not in cls.SUPPORTED_EXTENSIONS:
                return False
            
            # 파일 크기 검사
            if uploaded_file.size > cls.MAX_FILE_SIZE:
                return False
            
            # MIME 타입 검사 (추가 보안)
            allowed_content_types = {
                '.pdf': ['application/pdf'],
                '.docx': [
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-word.document.macroEnabled.12'
                ],
                '.txt': ['text/plain', 'text/csv']
            }
            
            expected_types = allowed_content_types.get(file_ext, [])
            if expected_types and uploaded_file.content_type not in expected_types:
                # content_type이 정확하지 않을 수 있으므로 경고만 출력
                print(f"⚠️ 예상과 다른 content_type: {uploaded_file.content_type}")
            
            return True
            
        except Exception as e:
            print(f"❌ 파일 검증 중 오류: {str(e)}")
            return False
    
    @classmethod
    def get_file_info(cls, uploaded_file: UploadedFile) -> dict:
        """파일 정보 추출"""
        try:
            file_ext = os.path.splitext(uploaded_file.name)[1].lower()
            file_size_mb = round(uploaded_file.size / (1024 * 1024), 2)
            
            return {
                'name': uploaded_file.name,
                'extension': file_ext,
                'size_bytes': uploaded_file.size,
                'size_mb': file_size_mb,
                'content_type': uploaded_file.content_type,
                'is_valid': cls.validate_file(uploaded_file)
            }
            
        except Exception as e:
            print(f"❌ 파일 정보 추출 중 오류: {str(e)}")
            return {
                'name': uploaded_file.name if uploaded_file else 'Unknown',
                'extension': 'unknown',
                'size_bytes': 0,
                'size_mb': 0,
                'content_type': 'unknown',
                'is_valid': False
            }
    
    @classmethod
    def generate_safe_filename(cls, original_filename: str, user_id: int) -> str:
        """안전한 파일명 생성"""
        try:
            import uuid
            from datetime import datetime
            
            # 파일 확장자 추출
            name, ext = os.path.splitext(original_filename)
            
            # 안전한 파일명 생성 (한글 등 특수문자 처리)
            safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()
            
            # 너무 긴 이름 제한
            if len(safe_name) > 50:
                safe_name = safe_name[:50]
            
            # 고유 식별자 추가
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            
            safe_filename = f"{user_id}_{timestamp}_{unique_id}_{safe_name}{ext}"
            
            return safe_filename
            
        except Exception as e:
            print(f"❌ 안전한 파일명 생성 중 오류: {str(e)}")
            # 폴백: UUID 기반 파일명
            import uuid
            ext = os.path.splitext(original_filename)[1]
            return f"{user_id}_{uuid.uuid4()}{ext}"