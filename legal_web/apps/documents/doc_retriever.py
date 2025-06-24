# teamproject/legal_web/apps/documents/doc_retriever.py

import re
import textwrap
import numpy as np
import faiss

import fitz  
import docx  

from django.conf import settings
from qdrant_client import QdrantClient, models

import uuid

# --- 파일에서 텍스트 추출 ---
def get_document_text(uploaded_file):
    print(f"🔄 get_document_text 함수 시작: {uploaded_file.name}")
    
    filename = uploaded_file.name
    ext = filename.split('.')[-1].lower()
    text = ""

    try:
        if ext == 'pdf':
            doc = fitz.open(stream=uploaded_file.read(), filetype='pdf')
            text = "\n".join(page.get_text() for page in doc)
        elif ext == 'docx':
            document = docx.Document(uploaded_file)
            text = "\n".join(p.text for p in document.paragraphs)
        elif ext == 'txt':
            text = uploaded_file.read().decode('utf-8')
        else:
            raise ValueError(f"지원하지 않는 파일 형식입니다: {ext}")
    except Exception as e:
        print(f"❌ get_document_text 함수 오류 발생: {e}")
        raise ValueError(f"파일 처리 중 오류가 발생했습니다: {e}")
    
    print(f"✅ 파일 '{filename}'에서 텍스트 추출 완료 ({len(text)}자)")
    print(f"🏁 get_document_text 함수 종료: {filename}")
    return text


# --- 텍스트 처리 및 벡터화 ---
def split_text_into_chunks(text: str, max_tokens=1500):
    """
    텍스트를 의미 있는 단위(조항) 또는 길이로 자릅니다.
    """
    print(f"🔄 split_text_into_chunks 함수 시작: 텍스트 길이 {len(text)}자, max_tokens={max_tokens}")
    
    # '제N조' 패턴으로 우선 분할 시도
    pattern = r"(제\d+조[^\n]*\n(?:.|\n)*?(?=\n제\d+조|\Z))"
    matches = re.findall(pattern, text)
    
    if matches:
        chunks = [m.strip() for m in matches if m.strip()]
        print(f"📄 조항 기반 분할 완료: {len(chunks)}개 조항")
    else:
        # 패턴이 없으면 길이 기반으로 분할
        chunks = textwrap.wrap(text, max_tokens, break_long_words=False, replace_whitespace=False)
        print(f"📄 길이 기반 분할 완료: {len(chunks)}개 청크")
    
    print(f"🏁 split_text_into_chunks 함수 종료: {len(chunks)}개 청크 생성")
    return chunks


def get_embeddings(client, texts: list[str]): 
    """
    OpenAI 임베딩 API를 호출하여 텍스트 목록에 대한 벡터를 가져옵니다.
    """
    print(f"🔄 get_embeddings 함수 시작: {len(texts)}개 텍스트")
    
    try:
        response = client.embeddings.create(
            input=texts,
            model="text-embedding-3-small"
        )
        embeddings = [np.array(embedding.embedding, dtype='float32') for embedding in response.data]
        print(f"🤖 OpenAI 임베딩 API 호출 성공: {len(embeddings)}개 벡터 생성")
        print(f"🏁 get_embeddings 함수 종료: 벡터 차원 {len(embeddings[0]) if embeddings else 0}")
        return embeddings
    except Exception as e:
        print(f"❌ get_embeddings 함수 오류 발생: {e}")
        raise


#  Qdrant 관련 함수 (회원용)
# ======================================================================

def get_qdrant_client():
    """Qdrant 클라이언트를 초기화하여 반환합니다."""
    print("🔄 get_qdrant_client 함수 시작")
    
    try:
        # settings.py에 정의된 값을 사용하여 클라이언트 생성
        client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY,
        )
        print("🔗 Qdrant 클라이언트 연결 성공")
        print("🏁 get_qdrant_client 함수 종료")
        return client
    except Exception as e:
        print(f"❌ get_qdrant_client 함수 오류 발생: {e}")
        raise

def upsert_document_to_qdrant(client: QdrantClient, chunks: list[str], embedding_client, user_id: int, session_id: str):
    """
    문서 조각과 메타데이터를 Qdrant에 저장(upsert)합니다.
    """
    print(f"🔄 upsert_document_to_qdrant 함수 시작: user_id={user_id}, session_id={session_id}, chunks={len(chunks)}개")
    
    if not chunks:
        print("⚠️ 저장할 청크가 없어 함수를 종료합니다")
        print("🏁 upsert_document_to_qdrant 함수 종료: 청크 없음")
        return
        
    collection_name = "legal_documents" # 모든 문서를 하나의 컬렉션에 저장
    
    # 1. 컬렉션이 없으면 생성
    try:
        client.get_collection(collection_name=collection_name)
        print(f"📁 기존 컬렉션 '{collection_name}' 확인 완료")
    except Exception: # 존재하지 않으면 에러 발생
        print(f"📁 컬렉션 '{collection_name}' 생성 중...")
        client.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=1536,  # text-embedding-3-small의 벡터 차원
                distance=models.Distance.COSINE
            )
        )
        # 메타데이터 필터링을 위한 인덱스 생성
        client.create_payload_index(collection_name=collection_name, field_name="user_id", field_schema="integer")
        client.create_payload_index(collection_name=collection_name, field_name="session_id", field_schema="keyword")
        print(f"📁 컬렉션 '{collection_name}' 및 인덱스 생성 완료")

    # 2. 텍스트 조각을 벡터로 변환
    print("🤖 텍스트 조각을 벡터로 변환 중...")
    vectors = get_embeddings(embedding_client, chunks)
    
    # 3. Qdrant에 저장할 포인트(Point) 생성
    print("📦 포인트 데이터 생성 중...")
    points = []
    for i, chunk in enumerate(chunks):
        points.append(
            models.PointStruct(
                id=str(uuid.uuid4()), # 각 포인트마다 고유 ID 생성
                vector=vectors[i].tolist(), # 벡터를 list 형태로 변환
                payload={
                    "text": chunk,
                    "user_id": user_id,
                    "session_id": session_id
                }
            )
        )
        
    # 4. 데이터 업서트(Upsert)
    if points:
        print(f"💾 Qdrant에 {len(points)}개 포인트 업서트 중...")
        client.upsert(collection_name=collection_name, points=points, wait=True)
        print(f"✅ Qdrant에 {len(points)}개의 포인트를 저장했습니다. (user: {user_id}, session: {session_id})")

    print(f"🏁 upsert_document_to_qdrant 함수 종료: {len(points)}개 포인트 저장 완료")

def search_qdrant(client: QdrantClient, embedding_client, query: str, user_id: int, session_id: str, top_k=3):
    """
    Qdrant에서 특정 사용자의 특정 세션 문서를 대상으로 검색을 수행합니다.
    """
    print(f"🔄 search_qdrant 함수 시작: query='{query[:50]}...', user_id={user_id}, session_id={session_id}, top_k={top_k}")
    
    collection_name = "legal_documents"
    
    # 1. 질문을 벡터로 변환
    print("🔍 검색 쿼리를 벡터로 변환 중...")
    query_vector = get_embeddings(embedding_client, [query])[0].tolist()
    
    # 2. 필터(Filter) 생성: user_id와 session_id가 모두 일치하는 문서만 검색
    print("🎯 검색 필터 생성 중...")
    query_filter = models.Filter(
        must=[
            models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
            models.FieldCondition(key="session_id", match=models.MatchValue(value=session_id)),
        ]
    )
    
    # 3. 검색 수행
    print(f"🔍 Qdrant 검색 수행 중... (컬렉션: {collection_name})")
    try:
        hits = client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=top_k
        )
        
        # 검색 결과에서 텍스트만 추출하여 반환
        results = [hit.payload['text'] for hit in hits]
        print(f"✅ 검색 완료: {len(results)}개 결과 반환")
        print(f"🏁 search_qdrant 함수 종료: {len(results)}개 문서 검색 완료")
        return results
    except Exception as e:
        print(f"❌ search_qdrant 함수 오류 발생: {e}")
        raise


# --- FAISS 인덱스 생성 (비회원용) ---
def create_faiss_index(client, chunks: list[str]):
    """
    텍스트 조각 목록을 받아 메모리에 FAISS 인덱스를 생성합니다.
    """
    print(f"🔄 create_faiss_index 함수 시작: {len(chunks)}개 청크")
    
    if not chunks:
        print("⚠️ 청크가 없어 인덱스를 생성할 수 없습니다")
        print("🏁 create_faiss_index 함수 종료: 빈 결과 반환")
        return None, []
    
    print("🤖 청크를 임베딩으로 변환 중...")
    embeddings = get_embeddings(client, chunks)
    if not embeddings:
        print("⚠️ 임베딩 생성 실패")
        print("🏁 create_faiss_index 함수 종료: 빈 결과 반환")
        return None, []
        
    print(f"🔧 FAISS 인덱스 생성 중... (차원: {len(embeddings[0])})")
    dimension = len(embeddings[0])
    index = faiss.IndexFlatL2(dimension)
    index.add(np.array(embeddings))
    
    print(f"✅ FAISS 인덱스 생성 완료: {index.ntotal}개 벡터 추가")
    print(f"🏁 create_faiss_index 함수 종료: 인덱스 생성 완료")
    return index, chunks


# --- FAISS 인덱스 검색 (비회원용) ---
def search_faiss_index(index: faiss.Index, chunks: list[str], client, query: str, top_k=3):
    """
    메모리의 FAISS 인덱스에서 관련 문서를 검색합니다.
    """
    print(f"🔄 search_faiss_index 함수 시작: query='{query[:50]}...', top_k={top_k}, 총 {len(chunks)}개 청크")
    
    try:
        print("🔍 검색 쿼리를 임베딩으로 변환 중...")
        query_embedding = get_embeddings(client, [query])[0]
        
        print("🔍 FAISS 인덱스에서 검색 수행 중...")
        distances, indices = index.search(np.array([query_embedding]), top_k)
        
        results = [chunks[i] for i in indices[0]]
        print(f"✅ FAISS 검색 완료: {len(results)}개 결과 반환")
        print(f"📊 검색 거리: {distances[0].tolist()}")
        print(f"🏁 search_faiss_index 함수 종료: {len(results)}개 문서 검색 완료")
        return results
    except Exception as e:
        print(f"❌ search_faiss_index 함수 오류 발생: {e}")
        raise