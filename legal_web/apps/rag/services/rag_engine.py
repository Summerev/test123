# apps/rag/services/rag_engine.py
import re
from typing import List, Dict, Any, Optional, Tuple
from .qdrant_client import QdrantVectorStore, EmbeddingService
from .document_processor import DocumentProcessor, CONTRACT_TYPES_TERMS

class RAGEngine:
    """강화된 RAG 검색 엔진"""
    
    def __init__(self):
        self.vector_store = QdrantVectorStore()
        self.embedding_service = EmbeddingService()
        self.document_chunks = []
        self.keyword_index = {}
        self.detected_contract_type = None
        
    def process_document(self, text: str) -> Dict[str, Any]:
        """문서 전체 처리 파이프라인"""
        print("📄 문서 처리 파이프라인 시작...")
        
        # 1. 계약서 유형 감지
        self.detected_contract_type, confidence, type_info = DocumentProcessor.detect_contract_type(text)
        
        # 2. 조항별 추출
        self.document_chunks = DocumentProcessor.extract_articles_with_content(text)
        
        # 3. 키워드 인덱스 생성
        self.keyword_index = self._create_enhanced_keyword_index(self.document_chunks, self.detected_contract_type)
        
        # 4. 벡터 인덱스 생성
        vector_success = self._create_vector_index(self.document_chunks)
        
        return {
            'contract_type': self.detected_contract_type,
            'confidence': confidence,
            'chunk_count': len(self.document_chunks),
            'vector_index_created': vector_success,
            'keyword_groups': len(self.keyword_index)
        }
    
    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """강화된 RAG 검색"""
        print(f"\n🔍 강화된 RAG 검색 시작: '{query}'")
        
        # 1. 문서 관련성 검사
        is_relevant, reason = self._enhanced_strict_document_relevance_check(query)
        if not is_relevant:
            print(f"❌ 문서 관련성 검사 실패: {reason}")
            return []
        
        print(f"✅ 문서 관련성 확인: {reason}")
        
        all_matches = []
        
        # 2. 조항 번호 직접 검색 (최우선)
        article_matches = self._search_specific_articles(query)
        if article_matches:
            print(f"📋 조항 직접 검색 성공: {len(article_matches)}개 조항 발견")
            for match in article_matches:
                all_matches.append({
                    'chunk': match,
                    'score': 100,
                    'method': f'조항검색(제{match["article_num"]}조)',
                    'index': match.get('index', 0)
                })
        
        # 3. 문서 내 키워드 정확 매칭
        exact_matches = self._search_exact_keywords(query)
        if exact_matches:
            print(f"🎯 문서 내 키워드 정확 매칭: {len(exact_matches)}개")
            for match in exact_matches:
                all_matches.append({
                    'chunk': match['chunk'],
                    'score': 80 + (match['total_count'] * 2),
                    'method': f'정확매칭({match["keyword"]}:{match["total_count"]}회)',
                    'index': match['index']
                })
        
        # 4. 계약서 유형별 특화 검색
        if self.detected_contract_type and self.detected_contract_type in CONTRACT_TYPES_TERMS:
            specialized_terms = CONTRACT_TYPES_TERMS[self.detected_contract_type]
            query_lower = query.lower()
            
            for term in specialized_terms:
                if term in query_lower:
                    for i, chunk in enumerate(self.document_chunks):
                        if term in chunk['text']:
                            all_matches.append({
                                'chunk': chunk,
                                'score': 70,
                                'method': f'특화검색({term})',
                                'index': i
                            })
                            print(f"🎯 특화 검색 매칭: {term}")
        
        # 5. 키워드 그룹 검색
        keyword_mapping = {
            '해지_종료': ['해지', '해제', '종료', '중단', '끝내', '파기'],
            '의무_책임': ['의무', '책임', '이행', '준수', '완수'],
            '손해_배상': ['손해', '배상', '피해', '보상', '변상'],
            '지급_결제': ['지급', '지불', '납부', '결제', '돈', '비용', '대금'],
            '기간_기한': ['기간', '기한', '일자', '날짜', '시점', '시기'],
        }
        
        query_lower = query.lower()
        for keyword_group, search_keywords in keyword_mapping.items():
            matched_keywords = [kw for kw in search_keywords if kw in query_lower]
            if matched_keywords and keyword_group in self.keyword_index:
                for match in self.keyword_index[keyword_group][:1]:
                    chunk = self.document_chunks[match['chunk_idx']]
                    all_matches.append({
                        'chunk': chunk,
                        'score': match['score'] + 30,
                        'method': f'키워드그룹({keyword_group})',
                        'index': match['chunk_idx']
                    })
                    print(f"🔍 키워드 그룹 매칭: {keyword_group}")
        
        # 6. 벡터 검색 (최후 수단)
        if len(all_matches) < 2:
            print("🔢 벡터 검색 시도 (최후 수단)")
            vector_matches = self._perform_vector_search(query, top_k)
            all_matches.extend(vector_matches)
        else:
            print("✅ 충분한 매칭 결과로 벡터 검색 생략")
        
        # 중복 제거 및 점수순 정렬
        unique_results = {}
        for match in all_matches:
            chunk_idx = match['index']
            if chunk_idx not in unique_results or unique_results[chunk_idx]['score'] < match['score']:
                unique_results[chunk_idx] = match
        
        final_results = sorted(unique_results.values(), key=lambda x: x['score'], reverse=True)[:top_k]
        
        print(f"📊 최종 RAG 검색 결과: {len(final_results)}개 조항 선택")
        for i, result in enumerate(final_results):
            chunk = result['chunk']
            if isinstance(chunk, dict):
                article_info = f"제{chunk.get('article_num', '?')}조({chunk.get('article_title', 'Unknown')})"
            else:
                article_info = f"제{chunk.article_num}조({chunk.article_title})" if hasattr(chunk, 'article_num') else "Unknown"
            print(f"   {i+1}. {article_info} - {result['method']} (점수: {result['score']:.1f})")
        
        return final_results
    
    def _enhanced_strict_document_relevance_check(self, query: str) -> Tuple[bool, str]:
        """강화된 문서 관련성 검사"""
        print(f"🔍 강화된 문서 관련성 검사: '{query}'")
        
        query_lower = query.lower().strip()
        
        # 1. 명백히 문서와 무관한 질문들
        off_topic_patterns = [
            r'(날씨|기상|온도|비|눈|맑음|흐림)',
            r'(뉴스|신문|방송|언론|기사)',
            r'(요리|음식|식당|맛집|레시피)',
            r'(영화|드라마|노래|음악|엔터테인먼트)',
            r'(게임|스포츠|축구|야구|농구)',
            r'(정치|선거|대통령|국회|정당)',
            r'(안녕|생일|나이|결혼|가족)',
            r'(여행|휴가|관광|호텔|항공)',
            r'(건강|병원|의사|약|치료)',
            r'(학교|공부|시험|성적|교육)',
            r'(컴퓨터|프로그래밍|인터넷|소프트웨어)',
            r'(수학|과학|물리|화학|생물)',
            r'(역사|지리|문화|예술|철학)',
            r'(너는|당신은|ai는|인공지능)',
            r'(어떻게|왜|언제) (생각|느끼|판단)',
            r'(좋아하|싫어하|선호하|추천)',
            r'^(안녕|hello|hi|헬로|하이)$',
            r'^(고마워|감사|thanks|thank you)$',
            r'^(응|네|예|yes|no|아니오)$',
            r'(몇시|언제|지금|오늘|어제|내일)',
            r'(시간|시각|날짜|요일)',
            r'(어떻게 해|방법|하는법)(?!.*계약)',
        ]
        
        for pattern in off_topic_patterns:
            if re.search(pattern, query_lower):
                print(f"❌ 문서 무관 패턴 감지: {pattern}")
                return False, f"off_topic_pattern: {pattern}"
        
        # 2. 너무 짧거나 의미없는 질문
        if len(query.strip()) < 2:
            print("❌ 질문이 너무 짧음")
            return False, "too_short"
        
        if query_lower in ['?', '??', '???', '.', '..', '...', 'ㅎ', 'ㅋ', 'ㅠ']:
            print("❌ 의미없는 질문")
            return False, "meaningless"
        
        # 3. 조항 번호 직접 언급 (최고 우선순위)
        article_patterns = [
            r'제\s*\d+\s*조',
            r'\d+\s*조',
            r'제\s*\d+',
            r'조항\s*\d+',
            r'article\s*\d+',
            r'section\s*\d+',
            r'clause\s*\d+'
        ]
        
        for pattern in article_patterns:
            if re.search(pattern, query_lower):
                print(f"✅ 조항 패턴 감지: {pattern} (최고 우선순위)")
                return True, f"article_pattern: {pattern}"
        
        # 4. 계약서 관련 핵심 키워드 체크
        contract_keywords = [
            '계약', '조항', '조', '항', '계약서', '협약', '약정', '협정',
            '당사자', '발주자', '수급인', '임대인', '임차인', '갑', '을',
            '의무', '책임', '권리', '권한', '이행', '준수', '완수',
            '위반', '위배', '불이행', '미이행', '어김',
            '대금', '비용', '요금', '수수료', '보증금', '계약금', '잔금',
            '위약금', '연체료', '지체상금', '손해배상', '배상', '보상',
            '급여', '임금', '월급', '보수', '수당',
            '기간', '기한', '일자', '날짜', '시점', '완료', '종료', '만료',
            '연장', '갱신', '연기', '지연',
            '해지', '해제', '변경', '수정', '갱신', '연장', '파기',
            '통지', '고지', '신고', '승인', '합의', '동의',
            '조건', '기준', '방법', '절차', '과정', '내용', '범위',
            '사항', '세부', '구체', '명시', '규정', '정함',
            '법적', '법률', '소송', '분쟁', '중재', '판결',
            '관할', '준거법', '효력', '무효',
            '납품', '인도', '검수', '하자', '보증', '담보',
            '면책', '귀책', '과실', '고의'
        ]
        
        # 5. 문서에 실제 포함된 단어 확인
        query_words = [word for word in query.split() if len(word) >= 2]
        document_text_lower = ' '.join([chunk['text'] for chunk in self.document_chunks]).lower()
        
        # 계약 키워드 확인
        found_keywords = [kw for kw in contract_keywords if kw in query_lower]
        
        # 문서 내 단어 확인
        found_in_document = []
        for word in query_words:
            if word in document_text_lower:
                found_in_document.append(word)
        
        # 6. 관련성 점수 계산
        relevance_score = 0
        relevance_score += len(found_keywords) * 10
        relevance_score += len(found_in_document) * 5
        
        # 7. 최종 판단
        is_relevant = False
        reason = ""
        
        if found_keywords:
            is_relevant = True
            reason = f"contract_keywords: {found_keywords[:3]}"
            print(f"✅ 계약 관련 키워드 발견: {found_keywords[:3]}")
        elif len(found_in_document) >= 2:
            is_relevant = True
            reason = f"document_words: {found_in_document[:3]}"
            print(f"✅ 문서 내 단어 발견: {found_in_document[:3]}")
        else:
            print(f"❌ 문서와 관련성 낮음 (키워드: {len(found_keywords)}, 문서단어: {len(found_in_document)}, 점수: {relevance_score})")
            reason = f"low_relevance: keywords={len(found_keywords)}, doc_words={len(found_in_document)}"
        
        print(f"🔍 관련성 점수: {relevance_score}, 판정: {'관련' if is_relevant else '무관'}")
        return is_relevant, reason
    
    def _search_specific_articles(self, query: str) -> List[Dict]:
        """조항 번호 직접 검색"""
        print(f"🎯 조항 검색 시작: '{query}'")
        
        patterns = [
            r'제\s*(\d+)\s*조',
            r'(\d+)\s*조',
            r'제\s*(\d+)\s*항',
            r'(\d+)\s*항',
            r'제\s*(\d+)',
            r'조항\s*(\d+)',
            r'article\s*(\d+)',
            r'section\s*(\d+)',
            r'clause\s*(\d+)',
            r'paragraph\s*(\d+)'
        ]
        
        found_articles = []
        query_lower = query.lower()
        
        for pattern in patterns:
            matches = re.findall(pattern, query_lower)
            for match in matches:
                article_num = int(match)
                print(f"🔍 조항 검색: 제{article_num}조")
                
                for i, chunk in enumerate(self.document_chunks):
                    if chunk.get('article_num') == article_num:
                        chunk_with_index = chunk.copy()
                        chunk_with_index['index'] = i
                        found_articles.append(chunk_with_index)
                        print(f"✅ 제{article_num}조 발견: {chunk['article_title']}")
                        break
                else:
                    print(f"❌ 제{article_num}조를 찾을 수 없습니다")
        
        return found_articles
    
    def _search_exact_keywords(self, query: str) -> List[Dict]:
        """문서 내 키워드 정확 매칭"""
        print(f"🔍 키워드 검색: '{query}'")
        
        exact_matches = []
        query_words = query.split()
        
        # 의미있는 단어 필터링
        stop_words = ['그게', '그건', '뭐야', '뭔가', '어떤', '어디', '언제', '왜',
                      '그리고', '그런데', '하지만', '그러나', '또는', '아니면',
                      '이것', '그것', '저것', '이거', '그거', '저거',
                      '무엇', '어느', '누구', '어떻게', '얼마나',
                      '의', '가', '이', '을', '를', '에', '에서', '로', '으로',
                      '은', '는', '과', '와', '도', '라', '라서']
        
        meaningful_words = [word for word in query_words
                           if len(word) >= 2 and word not in stop_words]
        
        print(f"🔍 의미있는 검색 단어: {meaningful_words}")
        
        for word in meaningful_words:
            matches_for_word = []
            
            for i, chunk in enumerate(self.document_chunks):
                chunk_text = chunk['text']
                
                # 정확 매칭
                exact_count = chunk_text.count(word)
                
                # 유사 매칭 (어간 변화 고려)
                word_pattern = word + r'[은는이가을를의에서로부터까지와과도나며으로써에게에서부터]*'
                similar_matches = len(re.findall(word_pattern, chunk_text))
                
                total_count = exact_count + similar_matches
                
                if total_count > 0:
                    matches_for_word.append({
                        'chunk': chunk,
                        'keyword': word,
                        'index': i,
                        'exact_count': exact_count,
                        'similar_count': similar_matches,
                        'total_count': total_count,
                        'article_info': f"제{chunk.get('article_num', '?')}조({chunk.get('article_title', 'Unknown')})"
                    })
            
            # 해당 단어의 매칭 결과를 빈도순으로 정렬
            matches_for_word.sort(key=lambda x: x['total_count'], reverse=True)
            
            # 상위 3개만 선택
            for match in matches_for_word[:3]:
                exact_matches.append(match)
                print(f"🎯 '{word}' 발견: {match['article_info']} (정확:{match['exact_count']}, 유사:{match['similar_count']})")
        
        # 전체 매칭 결과를 빈도순으로 정렬
        exact_matches.sort(key=lambda x: x['total_count'], reverse=True)
        
        return exact_matches[:5]
    
    def _perform_vector_search(self, query: str, top_k: int) -> List[Dict]:
        """벡터 검색 수행"""
        print(f"🔢 벡터 검색 수행: '{query}'")
        
        vector_matches = []
        
        if self.vector_store.client and self.embedding_service.model:
            try:
                query_embedding = self.embedding_service.encode([query])
                results = self.vector_store.search(query_embedding[0], top_k=top_k)
                
                for result in results:
                    if result.score > 0.5:  # 임계값
                        vector_matches.append({
                            'chunk': result.payload,
                            'score': result.score * 20,
                            'method': f'벡터검색({result.score:.3f})',
                            'index': result.id
                        })
                        print(f"🔢 Qdrant 매칭: 점수 {result.score:.3f}")
            except Exception as e:
                print(f"⚠️ Qdrant 검색 실패: {e}")
        
        print(f"🔢 벡터 검색 결과: {len(vector_matches)}개")
        return vector_matches
    
    def _create_enhanced_keyword_index(self, chunks: List[Dict], detected_contract_type: Optional[str] = None) -> Dict:
        """강화된 키워드 인덱스 생성"""
        print("🔍 강화된 키워드 인덱스 생성 중...")
        
        keyword_index = {}
        
        # 기존 범용 키워드
        universal_keywords = {
            '해지_종료': ['해지', '해제', '종료', '중단', '파기'],
            '의무_책임': ['의무', '책임', '이행', '준수'],
            '권리_자격': ['권리', '권한', '자격'],
            '계약_약정': ['계약', '협약', '약정'],
            '위반_어김': ['위반', '위배', '어김'],
            '손해_배상': ['손해', '배상', '피해', '손실'],
            '지급_결제': ['지급', '지불', '납부', '결제'],
            '기간_기한': ['기간', '기한', '일자', '날짜'],
            '사유_이유': ['사유', '이유', '원인', '근거'],
            '위험_주의': ['위험', '주의', '경고', '위험요소']
        }
        
        # 감지된 계약서 유형별 특화 키워드 추가
        specialized_keywords = {}
        if detected_contract_type and detected_contract_type in CONTRACT_TYPES_TERMS:
            contract_terms = CONTRACT_TYPES_TERMS[detected_contract_type]
            
            for term in contract_terms:
                key = f"특화_{term}"
                specialized_keywords[key] = [term]
                
                # 유사 용어 추가
                if '계약' in term:
                    specialized_keywords[key].extend(['계약서', '약정서', '협약서'])
                if '기간' in term:
                    specialized_keywords[key].extend(['기한', '일정', '날짜'])
                if '금' in term and term != '금지':
                    specialized_keywords[key].extend(['대금', '비용', '요금'])
            
            print(f"📋 {detected_contract_type} 특화 키워드 {len(specialized_keywords)}개 추가")
        
        # 전체 키워드 결합
        all_keywords = {**universal_keywords, **specialized_keywords}
        
        # 인덱싱
        for chunk_idx, chunk in enumerate(chunks):
            chunk_text = chunk['text'].lower()
            chunk_title = chunk['article_title'].lower()
            
            for keyword_group, keywords in all_keywords.items():
                score = 0
                found_keywords = []
                
                for keyword in keywords:
                    title_count = chunk_title.count(keyword)
                    text_count = chunk_text.count(keyword)
                    
                    if title_count > 0:
                        score += title_count * 15
                        found_keywords.append(f"{keyword}(제목)")
                    
                    if text_count > 0:
                        score += text_count * 3
                        found_keywords.append(f"{keyword}(본문)")
                
                if score > 0:
                    if keyword_group not in keyword_index:
                        keyword_index[keyword_group] = []
                    
                    keyword_index[keyword_group].append({
                        'chunk_idx': chunk_idx,
                        'score': score,
                        'found_keywords': found_keywords,
                        'article_info': f"제{chunk['article_num']}조({chunk['article_title']})" if chunk['article_num'] else chunk['article_title']
                    })
        
        # 점수순으로 정렬
        for keyword_group in keyword_index:
            keyword_index[keyword_group].sort(key=lambda x: x['score'], reverse=True)
        
        print(f"✅ 총 {len(keyword_index)}개 키워드 그룹 생성")
        return keyword_index
    
    def _create_vector_index(self, chunks: List[Dict]) -> bool:
        """벡터 인덱스 생성"""
        try:
            print(f"🔢 {len(chunks)}개 청크에 대한 벡터 인덱스 생성 중...")
            
            # 텍스트 강화
            enhanced_texts = []
            payloads = []
            
            for chunk in chunks:
                title = chunk['article_title']
                text = chunk['text']
                enhanced_text = f"{title} {title} {title} {text}"
                enhanced_texts.append(enhanced_text)
                
                # Qdrant용 페이로드
                payload = {
                    'article_num': chunk['article_num'],
                    'article_title': chunk['article_title'],
                    'text': chunk['text'],
                    'type': chunk['type']
                }
                payloads.append(payload)
            
            # 임베딩 생성
            embeddings = self.embedding_service.encode(enhanced_texts, show_progress_bar=True)
            print(f"📊 임베딩 완료: {embeddings.shape}")
            
            # Qdrant에 저장
            if self.vector_store.client:
                if self.vector_store.create_collection(vector_size=embeddings.shape[1]):
                    if self.vector_store.add_vectors(embeddings, payloads):
                        print("✅ Qdrant 벡터 인덱스 생성 완료")
                        return True
            
            print("❌ 벡터 인덱스 생성 실패")
            return False
            
        except Exception as e:
            print(f"❌ 벡터 인덱스 생성 실패: {str(e)}")
            return False
        
    # rag/services/rag_engine.py에 추가할 메소드들

    def validate_document_based_answer(self, answer: str) -> bool:
        """답변이 문서 기반인지 검증"""
        # 문서 기반 답변의 특징
        document_indicators = [
            '제', '조', '항', '계약서', '조항', '명시', '규정', '정함',
            '따르면', '의하면', '기재', '포함', '내용', '문서'
        ]
        
        # 일반 지식 기반 답변의 특징 (금지)
        general_indicators = [
            '일반적으로', '보통', '대개', '통상', '법률에서', '법적으로',
            '일반적인', '통상적인', '법률상', '일반론'
        ]
        
        # 문서 기반 지표 확인
        doc_score = sum(1 for indicator in document_indicators if indicator in answer)
        
        # 일반 지식 지표 확인 (패널티)
        general_score = sum(1 for indicator in general_indicators if indicator in answer)
        
        print(f"🔍 답변 검증: 문서기반({doc_score}) vs 일반지식({general_score})")
        
        # 문서 기반 지표가 2개 이상이고, 일반 지식 지표가 1개 이하여야 통과
        return doc_score >= 2 and general_score <= 1

    def generate_document_only_answer(self, question: str, context: str) -> str:
        """문서만을 기반으로 한 답변 생성 (폴백)"""
        from .translator import AnalysisService
        
        print("🔄 문서 전용 답변 생성 중...")
        
        prompt = f"""아래 계약서 조항들만을 바탕으로 질문에 답변하세요.

    질문: {question}

    계약서 조항들:
    {context}

    **절대 규칙**:
    - 위 조항들에 없는 내용은 절대 답변하지 마세요
    - "일반적으로", "보통", "법률상" 같은 표현 사용 금지
    - 반드시 "제○조에 따르면" 형식으로 인용하세요
    - 조항에 없으면 "해당 내용이 계약서에 명시되지 않았습니다"라고 하세요

    조항의 내용만으로 답변하세요."""

        try:
            analysis_service = AnalysisService()
            response = analysis_service.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "계약서 조항만을 인용하는 전문가. 일반 지식은 절대 사용하지 않음."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=800,
                temperature=0.01
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            return f"계약서 내용을 확인할 수 없습니다. 오류: {str(e)}"