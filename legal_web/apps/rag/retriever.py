# teamproject/legal_web/apps/rag/retriever.py

import re
import textwrap
import numpy as np
import faiss

import fitz  
import docx  



# --- 파일에서 텍스트 추출 ---
def get_document_text(uploaded_file):
    """
    Django의 UploadedFile 객체를 받아 파일 형식에 맞게 텍스트를 추출합니다.
    """
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
        # 실제 운영에서는 로깅을 하는 것이 좋습니다.
        print(f"Error reading file {filename}: {e}")
        raise ValueError(f"파일 처리 중 오류가 발생했습니다: {e}")

    return text


# --- 텍스트 처리 및 벡터화 ---
def split_text_into_chunks(text: str, max_tokens=1500):
    """
    텍스트를 의미 있는 단위(조항) 또는 길이로 자릅니다.
    """
    # '제N조' 패턴으로 우선 분할 시도
    pattern = r"(제\d+조[^\n]*\n(?:.|\n)*?(?=\n제\d+조|\Z))"
    matches = re.findall(pattern, text)
    if matches:
        return [m.strip() for m in matches if m.strip()]
    
    # 패턴이 없으면 길이 기반으로 분할
    return textwrap.wrap(text, max_tokens, break_long_words=False, replace_whitespace=False)




def get_embeddings(client, texts: list[str]): 
    """
    OpenAI 임베딩 API를 호출하여 텍스트 목록에 대한 벡터를 가져옵니다.
    """
    response = client.embeddings.create(
        input=texts,
        model="text-embedding-3-small"
    )
    return [np.array(embedding.embedding, dtype='float32') for embedding in response.data]


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
def search_faiss_index(index: faiss.Index, chunks: list[str], client, query: str, top_k=3):
    """
    메모리의 FAISS 인덱스에서 관련 문서를 검색합니다.
    """
    query_embedding = get_embeddings(client, [query])[0]
    distances, indices = index.search(np.array([query_embedding]), top_k)
    return [chunks[i] for i in indices[0]]
