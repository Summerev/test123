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

def recursive_split(text, separators, chunk_size):
    """재귀적으로 텍스트를 나누는 헬퍼 함수"""
    if len(text) <= chunk_size:
        return [text]
    
    # 가장 우선순위 높은 구분자부터 시도
    current_separator = separators[0]
    next_separators = separators[1:]
    
    # 현재 구분자로 나눌 수 없으면, 다음 구분자로 시도
    if current_separator == "" or not next_separators:
        # 더 이상 나눌 구분자가 없으면, 글자 수로 강제 분할
        return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

    # 구분자로 분할 시도
    try:
        parts = re.split(f'({current_separator})', text)
    except re.error:
        # 정규식이 아닌 일반 문자열로 분할
        parts = text.split(current_separator)

    chunks = []
    current_chunk = ""
    for part in parts:
        if len(current_chunk) + len(part) <= chunk_size:
            current_chunk += part
        else:
            # 현재 청크가 너무 길면, 더 작은 구분자로 다시 나눔
            if current_chunk:
                chunks.extend(recursive_split(current_chunk, next_separators, chunk_size))
            current_chunk = part
    if current_chunk:
        chunks.extend(recursive_split(current_chunk, next_separators, chunk_size))
        
    return chunks

def split_text_into_chunks_terms(text: str, chunk_size: int = 1500):
    """
    LangChain의 RecursiveCharacterTextSplitter와 유사한 방식으로,
    여러 구분자를 사용하여 텍스트를 안정적으로 분할합니다.
    """
    if not text or not text.strip():
        return []

    print(f"🔄 [최종 청킹 함수] 시작: chunk_size={chunk_size}")

    # 구분자 우선순위: 조항 > 문단 > 문장 > 공백
    separators = [
        r'\n제\s*\d+\s*조',  # 조항 (가장 큰 단위)
        '\n\n',            # 문단
        '\n',              # 줄바꿈
        '. ',              # 문장
        ' ',               # 단어
        ''                 # 마지막 강제 분할
    ]
    
    # 1. 재귀적 분할 수행
    initial_chunks = recursive_split(text, separators, chunk_size)
    
    # 2. 메타데이터 추가 (각 청크가 어떤 조항에 속하는지 파악)
    final_chunks = []
    current_article_title = "서문"
    article_pattern = r'(제\s*\d+\s*조[^\n]*)'

    for chunk in initial_chunks:
        match = re.search(article_pattern, chunk)
        if match:
            # 청크에서 새로운 조항 제목이 발견되면, 현재 조항 제목을 업데이트
            current_article_title = match.group(1).strip()
        
        final_chunks.append(f"참고 조항: {current_article_title}\n\n내용:\n{chunk.strip()}")
        
    print(f"🏁 [최종 청킹 함수] 종료: {len(final_chunks)}개 청크 생성")
    return final_chunks




import time 

def get_embeddings(client, texts: list[str]): 
    """
    텍스트 목록을 여러 배치로 나누어 OpenAI 임베딩 API를 호출합니다.
    """
    BATCH_SIZE = 100 
    
    all_embeddings = []
    
    print(f"🔄 get_embeddings 함수 시작: {len(texts)}개 텍스트")
    
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        batch_num = i//BATCH_SIZE + 1
        print(f"    - 배치 #{batch_num} 처리 중 ({len(batch)}개 청크)...")
        
        try:
            response = client.embeddings.create(
                input=batch,
                model="text-embedding-3-small"
            )           
            # 결과 저장
            batch_embeddings = [np.array(embedding.embedding, dtype='float32') for embedding in response.data]
            all_embeddings.extend(batch_embeddings)

        except Exception as e:
            print(f"❌ get_embeddings 함수 오류 발생: {e}")
            raise

    print(f"🤖 OpenAI 임베딩 API 호출 성공: {len(all_embeddings)}개 벡터 생성")
    print(f"🏁 get_embeddings 함수 종료: 벡터 차원 {len(all_embeddings[0]) if all_embeddings else 0}")
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

def upsert_vectors_to_qdrant(client: QdrantClient, chunks: list[str], vectors: list, user_id: int, session_id: str, payloads: list[dict] = None):
    """
    문서 조각과 벡터를 Qdrant에 저장(upsert)합니다. (순수 저장 로직만 담당)
    
    Args:
        client: Qdrant 클라이언트
        chunks: 텍스트 조각 리스트 (기본 페이로드용)
        vectors: 미리 계산된 벡터 리스트
        user_id: 사용자 ID
        session_id: 세션 ID
        payloads: 사전 정의된 페이로드 리스트 (선택적, 계약서용)
    """
    print(f"🔄 upsert_vectors_to_qdrant 함수 시작: user_id={user_id}, session_id={session_id}, chunks={len(chunks)}개")

    if not chunks:
        print("⚠️ 저장할 청크가 없어 함수를 종료합니다")
        print("🏁 upsert_vectors_to_qdrant 함수 종료: 청크 없음")
        return

    if len(chunks) != len(vectors):
        raise ValueError(f"청크 개수({len(chunks)})와 벡터 개수({len(vectors)})가 일치하지 않습니다.")
    
    # payloads가 제공된 경우 길이 검증
    if payloads and len(chunks) != len(payloads):
        raise ValueError(f"청크 개수({len(chunks)})와 페이로드 개수({len(payloads)})가 일치하지 않습니다.")

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

        # 계약서용 추가 인덱스 (있어도 오류 안남)
        try:
            client.create_payload_index(collection_name=collection_name, field_name="article_num", field_schema="integer")
            client.create_payload_index(collection_name=collection_name, field_name="type", field_schema="keyword")
        except:
            pass  # 이미 존재하면 무시
                
            print(f"📁 컬렉션 '{collection_name}' 및 인덱스 생성 완료")

    # 2. Qdrant에 저장할 포인트(Point) 생성
    print("📦 포인트 데이터 생성 중...")
    points = []

    for i, chunk in enumerate(chunks):
        # 페이로드 결정: 사전 정의된 것이 있으면 사용, 없으면 기본 생성
        if payloads:
            # 계약서: 사전 정의된 페이로드 + 공통 메타데이터
            payload = {
                **payloads[i],  # 기존 페이로드 (article_num, article_title, text, type 등)
                "user_id": user_id,
                "session_id": session_id
            }
        else:
            # 약관: 기본 페이로드
            payload = {
                "text": chunk,
                "user_id": user_id,
                "session_id": session_id
            }

        points.append(
            models.PointStruct(
                id=str(uuid.uuid4()),  # 각 포인트마다 고유 ID 생성
                vector=vectors[i].tolist(),  # 미리 계산된 벡터를 list 형태로 변환
                payload=payload
            )
        )

    # 3. 데이터 업서트(Upsert)
    if points:
        try: # 전체 upsert 시도를 try 블록으로 감싸는 것이 좋습니다.
            print(f"💾 Qdrant에 {len(points)}개 포인트 업서트 중...")
            client.upsert(collection_name=collection_name, points=points, wait=True)
            print(f"✅ Qdrant에 {len(points)}개의 포인트를 저장했습니다. (user: {user_id}, session: {session_id})")
            print(f"🏁 upsert_vectors_to_qdrant 함수 종료: {len(points)}개 포인트 저장 완료")
            return True
        except Exception as e:
            print(f"❌ Qdrant 저장 실패: {str(e)}")
            print(f"🏁 upsert_vectors_to_qdrant 함수 종료: 오류 발생")
            return False
    else: # points가 비어있을 경우 (chunks가 비어있으면 이미 종료되었지만, 혹시 모를 상황 대비)
        print("⚠️ 저장할 포인트가 없어 업서트 작업을 건너뜁니다.")
        print("🏁 upsert_vectors_to_qdrant 함수 종료: 저장할 포인트 없음")
        return True # 저장이 필요 없었으므로 성공으로 간주

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



def get_all_chunks_from_qdrant(client: QdrantClient, user_id: int, session_id: str):
    """특정 사용자와 세션에 해당하는 모든 청크를 Qdrant에서 가져옵니다."""
    print(f"🔄 Qdrant에서 모든 청크 로딩 시작: user_id={user_id}, session_id={session_id}")
    try:
        # scroll API를 사용하여 모든 포인트를 가져옵니다.
        # 실제 운영에서는 데이터가 매우 클 경우 성능 문제가 있을 수 있습니다.
        scrolled_points = client.scroll(
            collection_name="legal_documents",
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
                    models.FieldCondition(key="session_id", match=models.MatchValue(value=session_id)),
                ]
            ),
            limit=1000, # 한 번에 가져올 개수
            with_payload=True,
            with_vectors=False
        )
        all_chunks = [point.payload['text'] for point in scrolled_points[0]]
        print(f"✅ Qdrant에서 {len(all_chunks)}개 청크 로딩 완료.")
        return all_chunks
    except Exception as e:
        print(f"❌ Qdrant에서 모든 청크 로딩 실패: {e}")
        return []