# apps/rag/services/qdrant_client.py
import os
from django.conf import settings
from sentence_transformers import SentenceTransformer
import numpy as np

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models
    QDRANT_AVAILABLE = True
    print("✅ Qdrant 클라이언트 사용 가능")
except ImportError:
    QDRANT_AVAILABLE = False
    print("⚠️ Qdrant 미설치")

class QdrantVectorStore:
    """Qdrant 벡터 저장소 클래스"""
    
    def __init__(self, collection_name="contract_chunks"):
        self.collection_name = collection_name
        self.client = None
        
        if QDRANT_AVAILABLE:
            try:
                # .env에서 설정 읽기
                url = os.getenv('QDRANT_URL')
                api_key = os.getenv('QDRANT_API_KEY')
                
                if url and api_key:
                    self.client = QdrantClient(url=url, api_key=api_key)
                    print(f"✅ Qdrant Cloud 연결 성공: {url}")
                else:
                    print("❌ Qdrant 설정이 없습니다")
            except Exception as e:
                print(f"❌ Qdrant 연결 실패: {e}")

    def create_collection(self, vector_size=384):
        """컬렉션 생성"""
        if not self.client:
            return False

        try:
            self.client.recreate_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=vector_size,
                    distance=models.Distance.COSINE
                )
            )
            print(f"✅ Qdrant 컬렉션 '{self.collection_name}' 생성 완료")
            return True
        except Exception as e:
            print(f"❌ Qdrant 컬렉션 생성 실패: {e}")
            return False

    def add_vectors(self, vectors, payloads):
        """벡터 추가"""
        if not self.client:
            return False

        try:
            points = [
                models.PointStruct(
                    id=idx,
                    vector=vector.tolist(),
                    payload=payload
                )
                for idx, (vector, payload) in enumerate(zip(vectors, payloads))
            ]

            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            print(f"✅ {len(points)}개 벡터 Qdrant에 추가 완료")
            return True
        except Exception as e:
            print(f"❌ Qdrant 벡터 추가 실패: {e}")
            return False

    def search(self, query_vector, top_k=5):
        """벡터 검색"""
        if not self.client:
            return []

        try:
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector.tolist(),
                limit=top_k
            )
            return results
        except Exception as e:
            print(f"❌ Qdrant 검색 실패: {e}")
            return []

class EmbeddingService:
    """임베딩 서비스"""
    
    def __init__(self):
        self.model = None
        self.initialize_model()
    
    def initialize_model(self):
        """임베딩 모델 초기화"""
        try:
            print("🔧 임베딩 모델 로딩 중...")
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            print("✅ 임베딩 모델 로딩 완료")
            return True
        except Exception as e:
            print(f"❌ 임베딩 모델 로딩 실패: {str(e)}")
            return False
    
    def encode(self, texts, show_progress_bar=False):
        """텍스트를 벡터로 변환"""
        if not self.model:
            raise Exception("임베딩 모델이 초기화되지 않았습니다")
        
        return self.model.encode(texts, show_progress_bar=show_progress_bar)