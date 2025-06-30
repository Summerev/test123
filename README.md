<<<<<<< HEAD
# test123
=======
# WEB_PROJECT

AI 기반 법률 문서 해석 웹사이트  
- OpenAI GPT API 사용  
- RAG 기반 질의응답 기능  
- PostgreSQL 기반 DB 저장  
- Django 웹 프레임워크 사용  

## 폴더구조
```
[프로젝트 폴더]/ # runserver시 이 폴더에서 'python legal_web/manage.py runserver'
├── [가상환경]/ # Python 가상환경 폴더 (각자 로컬에)
├── .github/workflows # workflows
├── teamproject/ # GitHub 리포지토리 루트 (지금 여기)
├── ai/ # ai 모델 폴더
├── legal_web/ # Django 프로젝트 디렉토리
│ ├── apps/ # 기능별 Django 앱들
│ ├── config/ # Django 설정 (settings.py 등)
│ ├── static/ # 정적 파일 (CSS, JS 등)
│ ├── templates/ # 전역 HTML 템플릿
│ └── manage.py # Django 실행 파일
│
├── logs/ # 커밋 로그 및 기타 기록 (.log는 제외)
│ └── commit-log.txt
│
├── .github/ # GitHub Actions 설정
│ └── workflows/
│   └── commit-log.yml
│
├── .gitignore # Git 제외 파일 설정
├── .gitattributes # 파일 처리
├── requirements.txt # 프로젝트 의존성 목록
└── README.md # 프로젝트 설명 문서
```
>>>>>>> old_project/main
