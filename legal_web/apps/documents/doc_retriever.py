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
from openai import OpenAI, APIError



# --- 파일에서 텍스트 추출 ---
def get_document_text(uploaded_file):

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
        print(f"Error reading file {filename}: {e}")
        raise ValueError(f"파일 처리 중 오류가 발생했습니다: {e}")

    return text


# --- 텍스트 처리 및 벡터화 ---
import re

def split_text_into_chunks(text: str, chunk_size: int = 1500):
    """
    1. '제N조'로 텍스트를 나눕니다.
    2. 각 조항이 너무 길면 chunk_size에 맞춰 다시 자릅니다.
    3. 모든 최종 청크에 출처(조항 제목)를 메타데이터로 추가합니다.
    """
    if not text:
        return []

    print(f"--- 'split_text_into_chunks' 함수 실행 시작 (최대 청크 크기: {chunk_size}자) ---")
    
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




import time # ★★★ time 모듈 import 추가 (API 호출 사이에 휴식을 주기 위함)

def get_embeddings(client, texts: list[str]): 
    """
    텍스트 목록을 여러 배치로 나누어 OpenAI 임베딩 API를 호출합니다.
    """
    # ★★★★★ 배치 크기를 훨씬 작게 줄입니다. 100~200 정도가 안정적입니다. ★★★★★
    BATCH_SIZE = 100 
    
    all_embeddings = []
    
    print(f"  - 임베딩 시작: 총 {len(texts)}개의 청크를 {BATCH_SIZE}개씩 나누어 처리합니다.")
    
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        batch_num = i//BATCH_SIZE + 1
        print(f"    - 배치 #{batch_num} 처리 중 ({len(batch)}개 청크)...")
        
        try:
            # 실제 API 호출
            response = client.embeddings.create(
                input=batch,
                model="text-embedding-3-small"
            )
            
            # 결과 저장
            batch_embeddings = [np.array(embedding.embedding, dtype='float32') for embedding in response.data]
            all_embeddings.extend(batch_embeddings)
            print(f"    - 배치 #{batch_num} 처리 완료.")

            # ★★★ API의 분당 요청 제한(Rate Limit)을 피하기 위해 잠시 대기 ★★★
            if len(texts) > BATCH_SIZE:
                time.sleep(1) # 1초 대기

        except APIError as e:
            print(f"    - !!!! 배치 #{batch_num} 처리 중 API 오류 발생: {e} !!!!")
            # 특정 배치에서 오류가 나더라도 일단 계속 진행하거나, 여기서 멈출 수 있습니다.
            # 일단은 오류를 출력하고 계속 진행하도록 둡니다.
            pass
        except Exception as e:
            print(f"    - !!!! 배치 #{batch_num} 처리 중 예상치 못한 오류 발생: {e} !!!!")
            pass

    print(f"  - 임베딩 완료: 총 {len(all_embeddings)}개의 벡터 생성.")
    return all_embeddings


#  Qdrant 관련 함수 (회원용)
# ======================================================================

def get_qdrant_client():
    """Qdrant 클라이언트를 초기화하여 반환합니다."""
    # settings.py에 정의된 값을 사용하여 클라이언트 생성
    client = QdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY,
    )
    return client

def upsert_document_to_qdrant(client: QdrantClient, chunks: list[str], embedding_client, user_id: int, session_id: str):
    """
    문서 조각과 메타데이터를 Qdrant에 저장(upsert)합니다.
    """
    if not chunks:
        return
        
    collection_name = "legal_documents" # 모든 문서를 하나의 컬렉션에 저장
    
    # 1. 컬렉션이 없으면 생성
    try:
        client.get_collection(collection_name=collection_name)
    except Exception: # 존재하지 않으면 에러 발생
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

    # 2. 텍스트 조각을 벡터로 변환
    vectors = get_embeddings(embedding_client, chunks)
    
    # 3. Qdrant에 저장할 포인트(Point) 생성
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
        client.upsert(collection_name=collection_name, points=points, wait=True)
    print(f"✅ Qdrant에 {len(points)}개의 포인트를 저장했습니다. (user: {user_id}, session: {session_id})")

def search_qdrant(client: QdrantClient, embedding_client, query: str, user_id: int, session_id: str, top_k=5):
    """
    Qdrant에서 특정 사용자의 특정 세션 문서를 대상으로 검색을 수행합니다.
    """
    collection_name = "legal_documents"
    
    # 1. 질문을 벡터로 변환
    query_vector = get_embeddings(embedding_client, [query])[0].tolist()
    
    # 2. 필터(Filter) 생성: user_id와 session_id가 모두 일치하는 문서만 검색
    query_filter = models.Filter(
        must=[
            models.FieldCondition(key="user_id", match=models.MatchValue(value=user_id)),
            models.FieldCondition(key="session_id", match=models.MatchValue(value=session_id)),
        ]
    )
    
    # 3. 검색 수행
    hits = client.search(
        collection_name=collection_name,
        query_vector=query_vector,
        query_filter=query_filter,
        limit=top_k
    )
    
    # 검색 결과에서 텍스트만 추출하여 반환
    return [hit.payload['text'] for hit in hits]




# --- FAISS 인덱스 생성 (비회원용) ---
def create_faiss_index(client, chunks: list[str]):
    """
    텍스트 조각 목록을 받아 메모리에 FAISS 인덱스를 생성합니다.
    """
    if not chunks:
        return None, []
    
    embeddings = get_embeddings(client, chunks)
    if not embeddings:
        return None, []
        
    dimension = len(embeddings[0])
    index = faiss.IndexFlatL2(dimension)
    index.add(np.array(embeddings))
    
    return index, chunks


# --- FAISS 인덱스 검색 (비회원용) ---
def search_faiss_index(index: faiss.Index, chunks: list[str], client, query: str, top_k=5):
    """
    메모리의 FAISS 인덱스에서 관련 문서를 검색합니다.
    """
    query_embedding = get_embeddings(client, [query])[0]
    distances, indices = index.search(np.array([query_embedding]), top_k)
    return [chunks[i] for i in indices[0]]
