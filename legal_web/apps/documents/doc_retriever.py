# teamproject/legal_web/apps/documents/doc_retriever.py

# 표준 라이브러리
import re
import uuid

# 서드파티 라이브러리
import numpy as np
import faiss
import fitz
import docx
from django.conf import settings
from qdrant_client import QdrantClient, models

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

def split_text_into_chunks_terms(text: str, chunk_size: int = 1500):
    """
    1. '제N조'로 텍스트를 나눕니다.
    2. 각 조항이 너무 길면 chunk_size에 맞춰 다시 자릅니다.
    3. 모든 최종 청크에 출처(조항 제목)를 메타데이터로 추가합니다.
    """
    if not text:
        return []

    print(f"--- 'split_text_into_chunks_terms' 함수 실행 시작 (최대 청크 크기: {chunk_size}자) ---")

    # '제N조' 패턴으로 문서를 (제목, 내용) 쌍으로 분리
    pattern = r'(제\s*\d+\s*조[^\n]*)'
    split_parts = re.split(pattern, text)

    articles = []
    # 첫 부분(조항 시작 전)이 비어있지 않다면 '서문' 등으로 처리
    if split_parts[0].strip():
        articles.append(("서문", split_parts[0].strip()))

    for i in range(1, len(split_parts), 2):
        article_title = split_parts[i].strip()
        article_content = split_parts[i+1].strip() if (i + 1) < len(split_parts) else ""
        articles.append((article_title, article_content))

    if not articles and text:
        articles = [("문서 전체", text)]

    print(f"  - '제N조' 패턴을 기준으로 문서를 {len(articles)}개의 조항/부분으로 1차 분할했습니다.")

    # 각 조항을 재분할하며, 모든 청크에 메타데이터 추가
    final_chunks = []
    for article_title, article_content in articles:
        if not article_content.strip():
            continue

        if len(article_content) > chunk_size:
            print(f"  - 정보: 긴 조항 '{article_title}' (길이: {len(article_content)})을/를 재분할합니다.")
            for i in range(0, len(article_content), chunk_size):
                sub_chunk_content = article_content[i : i + chunk_size]
                final_chunks.append(f"참고 조항: {article_title}\n\n내용:\n{sub_chunk_content}")
        else:
            final_chunks.append(f"참고 조항: {article_title}\n\n내용:\n{article_content}")

    final_chunk_list = [chunk for chunk in final_chunks if chunk.strip()]
    print(f"--- 'split_text_into_chunks' 함수 종료. 최종 반환 청크 개수: {len(final_chunk_list)}개 ---")

    return final_chunk_list

def get_embeddings(client, texts: list[str]):
    # ... (배치 처리 로직이 포함된 안정적인 버전)
    BATCH_SIZE = 100
    all_embeddings = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        response = client.embeddings.create(input=batch, model="text-embedding-3-small")
        all_embeddings.extend([np.array(e.embedding, dtype='float32') for e in response.data])
    return all_embeddings

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

def upsert_vectors_to_qdrant(client: QdrantClient, chunks: list[str], vectors: list, user_id: int, session_id: str):
    """
    문서 조각과 벡터를 Qdrant에 저장(upsert)합니다. (순수 저장 로직만 담당)
    
    Args:
        client: Qdrant 클라이언트
        chunks: 텍스트 조각 리스트
        vectors: 미리 계산된 벡터 리스트
        user_id: 사용자 ID
        session_id: 세션 ID
    """
    print(f"🔄 upsert_vectors_to_qdrant 함수 시작: user_id={user_id}, session_id={session_id}, chunks={len(chunks)}개")

    if not chunks:
        print("⚠️ 저장할 청크가 없어 함수를 종료합니다")
        print("🏁 upsert_vectors_to_qdrant 함수 종료: 청크 없음")
        return

    if len(chunks) != len(vectors):
        raise ValueError(f"청크 개수({len(chunks)})와 벡터 개수({len(vectors)})가 일치하지 않습니다.")

    collection_name = "legal_documents"  # 모든 문서를 하나의 컬렉션에 저장

    # 1. 컬렉션이 없으면 생성
    try:
        client.get_collection(collection_name=collection_name)
        print(f"📁 기존 컬렉션 '{collection_name}' 확인 완료")
    except Exception:  # 존재하지 않으면 에러 발생
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

    # 2. Qdrant에 저장할 포인트(Point) 생성
    print("📦 포인트 데이터 생성 중...")
    points = []
    for i, chunk in enumerate(chunks):
        points.append(
            models.PointStruct(
                id=str(uuid.uuid4()),  # 각 포인트마다 고유 ID 생성
                vector=vectors[i].tolist(),  # 미리 계산된 벡터를 list 형태로 변환
                payload={
                    "text": chunk,
                    "user_id": user_id,
                    "session_id": session_id
                }
            )
        )

    # 3. 데이터 업서트(Upsert)
    if points:
        print(f"💾 Qdrant에 {len(points)}개 포인트 업서트 중...")
        client.upsert(collection_name=collection_name, points=points, wait=True)
        print(f"✅ Qdrant에 {len(points)}개의 포인트를 저장했습니다. (user: {user_id}, session: {session_id})")

    print(f"🏁 upsert_vectors_to_qdrant 함수 종료: {len(points)}개 포인트 저장 완료")

def search_qdrant(client: QdrantClient, embedding_client, query: str, user_id: int, session_id: str, top_k=5):
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
def create_faiss_index_from_vectors(vectors: list[np.ndarray]):
    """
    벡터 리스트를 받아 FAISS 인덱스를 생성합니다.
    """
    if not vectors:
        print("⚠️ 벡터가 없어 인덱스를 생성할 수 없습니다")
        return None

    print(f"🔧 FAISS 인덱스 생성 중... (차원: {len(vectors[0])})")
    vector_array = np.stack(vectors).astype(np.float32)
    dimension = vector_array.shape[1]

    index = faiss.IndexFlatL2(dimension)
    index.add(vector_array)  # type: ignore # pylint: disable=no-value-for-parameter
    print(f"✅ FAISS 인덱스 생성 완료: {index.ntotal}개 벡터 추가")
    return index

# --- FAISS 인덱스 검색 (비회원용) ---
def search_faiss_index(index: faiss.Index, chunks: list[str], client, query: str, top_k=5):
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
