# apps/rag/management/commands/test_rag_quality.py
from django.core.management.base import BaseCommand
from apps.rag.services.rag_engine import RAGEngine

class Command(BaseCommand):
    help = 'RAG 검색 품질 테스트'

    def add_arguments(self, parser):
        parser.add_argument('--document-id', type=str, help='테스트할 문서 ID')

    def handle(self, *args, **options):
        document_id = options.get('document_id')
        
        if not document_id:
            self.stdout.write(self.style.ERROR('--document-id 옵션이 필요합니다.'))
            return

        # 테스트 쿼리들
        test_queries = [
            "제5조 설명해줘",
            "손해배상 조건은?", 
            "날씨 어때요?",  # 관련성 체크 테스트
            "계약해지 사유는?"
        ]

        self.stdout.write("🧪 RAG 검색 품질 테스트 시작...")
        
        try:
            from apps.rag.models import Document
            document = Document.objects.get(id=document_id)
            
            # RAG 엔진 초기화
            rag_engine = RAGEngine()
            rag_engine.process_document(document.text_content)
            
            for query in test_queries:
                self.stdout.write(f"\n🔍 테스트 쿼리: '{query}'")
                
                # 관련성 체크
                is_relevant, reason = rag_engine._enhanced_strict_document_relevance_check(query)
                status = "✅" if is_relevant else "❌"
                self.stdout.write(f"   관련성: {status} ({reason})")
                
                if is_relevant:
                    # 검색 수행
                    results = rag_engine.search(query, top_k=3)
                    self.stdout.write(f"   검색 결과: {len(results)}개")
                    
                    for i, result in enumerate(results[:2]):
                        chunk = result['chunk']
                        article_info = f"제{chunk.get('article_num', '?')}조"
                        self.stdout.write(f"     {i+1}. {article_info} - {result['method']} (점수: {result['score']:.1f})")
            
            self.stdout.write(self.style.SUCCESS('\n✅ RAG 테스트 완료'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ 테스트 실패: {str(e)}'))