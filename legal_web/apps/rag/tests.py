# teamproject/legal_web/apps/rag/tests.py

from django.test import TestCase, Client
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
import json

# TestCase는 각 테스트 후 DB를 초기화해주는 등 테스트 환경을 제공합니다.
class RagAPITestCase(TestCase):
    
    def setUp(self):
        """
        모든 테스트 함수가 실행되기 전에 공통적으로 필요한 설정을 합니다.
        여기서는 테스트용 클라이언트를 생성합니다.
        """
        self.client = Client()
        # API URL을 미리 만들어 둡니다.
        self.analyze_url = reverse('rag:analyze') # 'rag:analyze'는 urls.py의 app_name과 path name을 조합한 것
        self.ask_url = reverse('rag:ask')

    def test_analyze_document_view(self):
        """
        /api/rag/analyze/ API가 정상적으로 작동하는지 테스트합니다.
        """
        # 1. 가짜 PDF 파일 내용 (일반 문자열로 작성)
        pdf_string_content = """
        %PDF-1.4
        1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
        2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
        3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
        4 0 obj << /Length 53 >> stream
        BT /F1 12 Tf (제1조 (목적) 이 약관은 사용자의 권리를 보장합니다.) Tj ET
        endstream
        endobj
        trailer << /Root 1 0 R >>
        """
        # 문자열을 utf-8 바이트로 인코딩
        pdf_content = pdf_string_content.encode('utf-8')
        
        # SimpleUploadedFile을 사용하여 Django가 인식할 수 있는 파일 형태로 만듭니다.
        test_pdf_file = SimpleUploadedFile(
            name="test_contract.pdf",
            content=pdf_content,
            content_type="application/pdf"
        )

        # 2. API에 POST 요청 보내기
        response = self.client.post(
            self.analyze_url,
            data={
                'file': test_pdf_file,
                'doc_type': 'terms' # '약관' 유형으로 테스트
            }
        )

        # 3. 응답 검증
        self.assertEqual(response.status_code, 200, "상태 코드가 200이어야 합니다.")
        
        response_data = response.json()
        self.assertIn('summary', response_data, "응답에 'summary' 키가 포함되어야 합니다.")
        self.assertIsInstance(response_data['summary'], str, "'summary'는 문자열이어야 합니다.")
        # 요약 내용에 특정 키워드가 포함되는지 검증할 수도 있습니다.
        self.assertIn('요약', response_data['summary'], "요약 결과에 '요약' 단어가 포함되어야 합니다.")

        # Django 세션에 분석 결과가 저장되었는지 확인
        self.assertIn('rag_index', self.client.session, "세션에 'rag_index'가 저장되어야 합니다.")
        self.assertIn('rag_chunks', self.client.session, "세션에 'rag_chunks'가 저장되어야 합니다.")
        print("\n✅ 'analyze_document' API 테스트 통과")


    def test_ask_question_view(self):
        """
        /api/rag/ask/ API가 정상적으로 작동하는지 테스트합니다.
        이 테스트는 analyze 테스트가 먼저 성공적으로 세션에 데이터를 저장했다는 가정 하에 진행됩니다.
        """
        # 1. 선행 작업: 먼저 /analyze API를 호출하여 세션에 분석 데이터를 저장
        pdf_string_content = "BT /F1 12 Tf (제15조 (손해배상) 회사는 고의 또는 중과실이 없는 한 책임지지 않습니다.) Tj ET"
        pdf_content = pdf_string_content.encode('utf-8') # 문자열을 바이트로 인코딩
        
        test_pdf_file = SimpleUploadedFile("test.pdf", pdf_content, "application/pdf")
        
        # 2. /ask API에 POST 요청 보내기
        question_data = {
            'question': '손해배상에 대해 알려줘',
            'history': []
        }
        
        response = self.client.post(
            self.ask_url,
            data=json.dumps(question_data),
            content_type='application/json'
        )
        
        # 3. 응답 검증
        self.assertEqual(response.status_code, 200)
        
        response_data = response.json()
        self.assertIn('answer', response_data)
        self.assertIsInstance(response_data['answer'], str)
        # 답변 내용에 특정 키워드가 포함되는지 검증
        self.assertIn('손해배상', response_data['answer'], "답변에 '손해배상' 단어가 포함되어야 합니다.")
        print("✅ 'ask_question' API 테스트 통과")

    def test_ask_without_analysis(self):
        """
        문서 분석 없이 바로 질문했을 때, 적절한 에러를 반환하는지 테스트합니다.
        """
        # 1. 세션이 비어있는 상태에서 바로 /ask API 호출
        response = self.client.post(
            self.ask_url,
            data=json.dumps({'question': '이게 되나?'}),
            content_type='application/json'
        )

        # 2. 에러 응답 검증
        self.assertEqual(response.status_code, 400, "상태 코드가 400 (Bad Request)이어야 합니다.")
        
        response_data = response.json()
        self.assertIn('error', response_data)
        self.assertIn('분석된 문서가 없습니다', response_data['error'])
        print("✅ '분석 없이 질문 시 에러 처리' 테스트 통과")