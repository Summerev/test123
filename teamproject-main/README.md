# LegalBot - 법률 AI 어시스턴트

GPT 기반 법률 문서 해석 웹사이트 ✍️  
복잡한 계약서, 약관, 법률 문서를 쉽게 해석하고 요약해주는 AI 시스템입니다.

## 🔍 주요 기능
- OpenAI GPT API 기반 질의응답
- 계약서/약관 해석 모드 전환
- 탭 기반 대화 인터페이스 (복수 세션 지원)
- 다국어 UI 지원 (한국어, 영어, 일본어 등)
- 대화 저장/내보내기 (.txt, .csv, .xlsx 등 지원 예정)
- 로그인 / 회원가입 / 세션 관리

## 🛠️ 사용 기술
- Django 웹 프레임워크
- PostgreSQL (DB 설계 예정)
- OpenAI GPT API
- HTML/CSS/JavaScript (Vanilla 기반 + 모듈화)
- GitHub Actions (commit log 기록 등 자동화)

## 📁 폴더 구조

```
teamproject/                # GitHub 리포지토리 루트
├── ai/                     # AI 응답 처리 모듈
├── legal_web/             # Django 프로젝트
│   ├── apps/              # Django 앱들 (chatbot, accounts, main 등)
│   ├── config/            # 프로젝트 설정
│   ├── static/            # CSS, JS, 이미지 등 정적 파일
│   ├── templates/         # 전역 템플릿 HTML 파일
│   └── manage.py          # Django 실행 파일
│
├── logs/                  # 커밋 로그
│   └── commit-log.txt
│
├── .github/               # GitHub Actions 설정
│   └── workflows/
│       └── commit-log.yml
│
├── .gitignore             # Git 제외 파일
├── .gitattributes         # Git 속성 정의
├── requirements.txt       # 의존성 목록
└── README.md              # 프로젝트 설명 문서
```

## 🌱 현재 브랜치

- `main`: 초기 베이스 코드
- `Summerev`: ✅ **주 개발 브랜치 (현재 진행 중)**

## ✅ 앞으로 추가될 기능
1. 네비게이션 중앙 문구 배치 ("법률 AI 어시스턴트 - 복잡한 법률 문서를 쉽게 이해하세요")
2. 언어 선택기 → 로그인 왼쪽 배치
3. 대화 탭에 점 3개 메뉴 추가 → 이름 변경 및 삭제 기능
4. 사이드바 항목 재배치 → 주요 기능은 유지, 나머지는 네비게이션으로 이동
5. 지원문서/주의사항 클릭 시 모달 설명 제공
6. 왼쪽/오른쪽/중앙 채팅창 높이 통일
7. 언어 선택 시 레이아웃 깨짐 현상 제거
8. 대화 내보내기 포맷 선택 (CSV, 엑셀, 한글 등)

---

> ⚠️ 주의: 이 프로젝트는 아직 개발 중이며, 기능 일부는 구현 예정 상태입니다.

