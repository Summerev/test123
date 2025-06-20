# apps/rag/config.py
"""RAG 시스템 설정 및 상수"""

# 계약서 유형별 전문 용어는 document_processor.py에서 import
from .services.document_processor import CONTRACT_TYPES_TERMS, CONTRACT_TYPE_DESCRIPTIONS

# 언어별 설정은 translator.py에서 import  
from .services.translator import IMPROVED_LANGUAGES

# RAG 검색 관련 설정
RAG_SEARCH_CONFIG = {
    'DEFAULT_TOP_K': 3,
    'VECTOR_SIMILARITY_THRESHOLD': 0.5,
    'KEYWORD_MATCH_WEIGHT': 10,
    'DOCUMENT_MATCH_WEIGHT': 5,
    'ARTICLE_SEARCH_PRIORITY': 100,
    'EXACT_MATCH_PRIORITY': 80,
    'SPECIALIZED_SEARCH_PRIORITY': 70,
    'KEYWORD_GROUP_PRIORITY': 30,
    'VECTOR_SEARCH_PRIORITY': 20,
}

# 파일 처리 설정
FILE_CONFIG = {
    'ALLOWED_EXTENSIONS': ['pdf', 'docx', 'txt'],
    'MAX_FILE_SIZE_MB': 10,
    'UPLOAD_PATH_TEMPLATE': 'documents/{user_id}/{year}/{month}/',
}

# 분석 관련 설정
ANALYSIS_CONFIG = {
    'MAX_TEXT_LENGTH': 10000,
    'MIN_CHUNK_LENGTH': 10,
    'MAX_CHUNKS': 50,
    'SUMMARY_MAX_TOKENS': 1200,
    'RISK_ANALYSIS_MAX_TOKENS': 1500,
    'RESPONSE_MAX_TOKENS': 1000,
}

# OpenAI 모델 설정
OPENAI_CONFIG = {
    'DEFAULT_MODEL': 'gpt-3.5-turbo',
    'TEMPERATURE_ANALYSIS': 0.1,
    'TEMPERATURE_RISK': 0.05,
    'TEMPERATURE_RESPONSE': 0.03,
    'TEMPERATURE_TRANSLATION': 0.1,
}

# Qdrant 설정
QDRANT_CONFIG = {
    'DEFAULT_COLLECTION_NAME': 'contract_chunks',
    'VECTOR_SIZE': 384,
    'DISTANCE_METRIC': 'COSINE',
    'BATCH_SIZE': 100,
}

# 에러 메시지
ERROR_MESSAGES = {
    'API_KEY_MISSING': "OpenAI API 키가 설정되지 않았습니다.",
    'FILE_TOO_LARGE': "파일 크기가 너무 큽니다. (최대 {max_size}MB)",
    'UNSUPPORTED_FORMAT': "지원하지 않는 파일 형식입니다.",
    'DOCUMENT_NOT_FOUND': "문서를 찾을 수 없습니다.",
    'ANALYSIS_FAILED': "문서 분석 중 오류가 발생했습니다.",
    'SEARCH_FAILED': "검색 중 오류가 발생했습니다.",
}

# 성공 메시지
SUCCESS_MESSAGES = {
    'DOCUMENT_UPLOADED': "문서가 성공적으로 업로드되었습니다.",
    'ANALYSIS_COMPLETED': "문서 분석이 완료되었습니다.", 
    'SEARCH_COMPLETED': "검색이 완료되었습니다.",
    'TRANSLATION_COMPLETED': "번역이 완료되었습니다.",
}