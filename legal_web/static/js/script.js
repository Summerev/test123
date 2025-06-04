// Language Translation
const translations = {
  ko: {
    logoText: 'LegalBot',
    mainFeatures: '📋 주요 기능',
    language: '🌐 언어',
    featureContractAnalysis: '계약서 조항 해석',
    featureLegalTermExplain: '법률 용어 설명',
    featureDocSummary: '문서 요약',
    featureConditionAnalysis: '조건 분석',
    featureRiskIdentification: '위험 요소 식별',
    login: '로그인',
    signup: '회원가입',
    recentChatsMenu: '💬 최근 대화',
    interpretationModeLabel: '해석 모드 선택', // Added
    defaultModeLabel: '기본 모드',
    easyModeLabel: '쉬운 해석 모드',
    exportChatBtnText: '대화 내보내기',
    clearChatBtnText: '대화 전체 삭제',
    chatHeaderTitle: '법률 AI 어시스턴트',
    chatHeaderSubtitle: '복잡한 법률 문서를 쉽게 이해하세요',
    welcomeTitle: '안녕하세요! 법률 AI 어시스턴트입니다',
    welcomeDesc:
      '법률 문서의 복잡한 내용을 쉽게 설명해드립니다. 계약서, 약관, 법률 조항 등 어떤 내용이든 물어보세요.',
    promptExample1New: '"이 계약서의 핵심 내용을 요약해주세요"',
    promptExample2New: '"특약 조항이 무엇을 의미하는지 설명해주세요"',
    promptExample3New: '"이 조건이 나에게 불리한지 알려주세요"',
    promptExample4New: '"법률 용어를 쉽게 설명해주세요"',
    chatPlaceholder: '법률 문서나 조항을 입력하거나, 질문을 입력하세요...',
    sendButton: '전송',
    botName: 'LegalBot',
    aiStatus: 'AI 서비스 정상 운영중',
    usageTipsTitle: '💡 사용 팁',
    tipCopyPaste: '문서 전체를 복사해서 붙여넣기 하세요',
    tipSpecificQuestions: '구체적인 질문일수록 정확한 답변을 받을 수 있어요',
    tipClauseFormat: '"계약서이름 제X조" 형식으로 질문해보세요',
    tipEasierExplanation: '이해가 안 되면 더 쉽게 설명해달라고 요청하세요',
    supportedDocsTitle: '📄 지원 문서',
    docTypeContracts: '계약서 (임대차, 근로, 매매, 용역 등)',
    docTypeTerms: '이용약관 및 개인정보처리방침',
    docTypeLegalClauses: '법률 조항 및 규정',
    docTypeOfficialDocs: '공문서 및 신청서 (일부 조항 중심)',
    precautionsTitle: '⚠️ 주의사항',
    precautionReferenceOnly: '참고용으로만 활용해주세요',
    precautionConsultExpert: '중요한 결정은 전문가와 상담하세요',
    precautionNoPersonalInfo: '개인정보는 입력하지 마세요',
    aiDisclaimer:
      '⚠️ 본 해석은 AI가 생성한 참고용 문장입니다. 법적 자문으로 간주하지 마십시오.',
    loginModalTitle: '로그인',
    loginModalWelcome: 'LegalBot에 오신 것을 환영합니다',
    googleLogin: 'Google',
    kakaoLogin: 'Kakao',
    orDivider: '또는',
    emailLabel: '이메일',
    emailPlaceholder: 'example@email.com',
    passwordLabel: '비밀번호',
    passwordPlaceholderLogin: '비밀번호를 입력하세요',
    loginButton: '로그인',
    noAccount: '계정이 없으신가요?',
    signupLink: '회원가입',
    signupModalTitle: '회원가입',
    signupModalStart: 'LegalBot과 함께 시작하세요',
    googleSignup: 'Google',
    kakaoSignup: 'Kakao',
    nameLabel: '이름',
    namePlaceholder: '이름을 입력하세요',
    passwordPlaceholderSignup: '8자 이상 입력하세요',
    passwordConfirmLabel: '비밀번호 확인',
    passwordConfirmPlaceholder: '비밀번호를 다시 입력하세요',
    signupButton: '회원가입',
    alreadyAccount: '이미 계정이 있으신가요?',
    loginLink: '로그인',
    feedbackQuestion: '이 해석이 도움이 되었나요?',
    feedbackYes: '👍',
    feedbackNo: '👎',
    feedbackModalTitle: '피드백 제공',
    feedbackModalSubtitle: '해석에 대한 의견을 알려주세요.',
    feedbackReasonLabel: '오류 사유',
    reasonInaccurate: '오역/부정확',
    reasonOutOfContext: '문맥 불일치',
    reasonUnnatural: '부자연스러운 표현',
    reasonOther: '기타',
    feedbackCommentLabel: '추가 의견 (선택)',
    feedbackCommentPlaceholder: '자세한 내용을 입력해주세요...',
    submitFeedbackButton: '피드백 제출',
    alertLoginNotImplemented: '로그인 기능은 구현 예정입니다!',
    alertSignupNotImplemented: '회원가입 기능은 구현 예정입니다!',
    alertFeatureNavigation: (feature) => `"${feature}" 기능으로 안내합니다. (구현 예정)`,
    alertFeedbackSubmitted: '소중한 피드백 감사합니다!',
    sampleBotResponse: (userInput) =>
      `"${userInput}"에 대해 설명드리겠습니다. 이 내용은 다음과 같이 이해할 수 있습니다. 구체적인 계약서명과 조항을 알려주시면 더 자세히 설명드릴 수 있습니다. (예: 근로계약서 제1조)`,
    sampleEasyModeResponse: (userInput) =>
      `"${userInput}"에 대한 아주 쉬운 설명입니다! 예를 들어 어린아이에게 설명하듯이 말하자면... (이해를 돕기 위해 비유를 사용합니다.)`,
    sampleDefaultModeResponse: (userInput) =>
      `"${userInput}"에 대한 기본 설명입니다. 원문의 의미를 최대한 살리면서, 필요한 경우 법률 용어에 대한 부가 설명을 제공합니다.`,
    clauseResponseFormat: (clauseTitle, clauseContent) =>
      `📜 ${clauseTitle}의 내용은 다음과 같습니다:\n"${clauseContent}"`,
    clauseNotFound: (contractName, clauseNum) =>
      `죄송합니다. ${contractName}에서 ${clauseNum}을 찾을 수 없거나, 해당 계약서 정보가 아직 준비되지 않았습니다.`,
    contractNotFound: (contractName) =>
      `죄송합니다. "${contractName}"에 대한 정보가 아직 준비되지 않았습니다. 다른 계약서에 대해 질문해주세요.`,
    easyModePrefix: '쉽게 설명드리자면, ',
    defaultModePrefix: '',
    noRecentChats: '최근 대화 기록이 없습니다.',
    chatItemPrefix: 'Q: ',
    longTextPlaceholder:
      '입력하신 내용이 깁니다. 계약서로 보입니다. 어떤 부분이 궁금하신가요? (예: 제3조 내용, 위험 요소)',
    generalLegalQueryInfo:
      '법률 용어나 일반적인 법률 질문에 대해서도 답변해 드릴 수 있습니다. 궁금한 점을 물어보세요!',
    koreanTerm: '한국어',
    englishTerm: '영어',
    japaneseTerm: '일본어',
    chineseTerm: '중국어',
    spanishTerm: '스페인어',
    themeToggleLight: '라이트 모드',
    themeToggleDark: '다크 모드',
    exportChatTooltip: '대화 내보내기',
    clearChatTooltip: '대화 삭제',
    confirmClearChat: '모든 대화 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    chatCleared: '대화 기록이 삭제되었습니다.',
    enterKeySettingLabel: 'Enter키로 전송',
    contractQueryPrompt: (contractName) =>
      `"${contractName}"에 대해 무엇이 궁금하신가요? 특정 조항(예: 제3조)이나 내용에 대해 질문해주세요.`,
    articleKeywordRegex: '제?(\\d+)조',
    termQuerySuffixRegex:
      '이란|이란 무엇인가요|에 대해 알려줘|설명해줘|means|とは|是什么意思|significa',
    termDefinitionConnective: '은(는)',
    termDefinitionEnd: '을 의미합니다.',
    sampleEasyExplanationForTerm: (term) =>
      `쉽게 말해, ${term}은(는) 이럴 때 쓰는 말이에요...`,
    greetingKeyword: '안녕',
  },
  en: {
    logoText: 'LegalBot',
    mainFeatures: '📋 Features',
    language: '🌐 Language',
    featureContractAnalysis: 'Contract Clause Analysis',
    featureLegalTermExplain: 'Legal Term Explanation',
    featureDocSummary: 'Document Summary',
    featureConditionAnalysis: 'Condition Analysis',
    featureRiskIdentification: 'Risk Identification',
    login: 'Login',
    signup: 'Sign Up',
    recentChatsMenu: '💬 Recent Chats',
    interpretationModeLabel: 'Interpretation Mode', // Added
    defaultModeLabel: 'Default Mode',
    easyModeLabel: 'Easy Mode',
    exportChatBtnText: 'Export Conversation',
    clearChatBtnText: 'Clear All Chats',
    chatHeaderTitle: 'Legal AI Assistant',
    chatHeaderSubtitle: 'Understand complex legal documents easily',
    welcomeTitle: "Hello! I'm the Legal AI Assistant",
    welcomeDesc:
      'I explain complex legal documents simply. Ask about contracts, terms, legal clauses, etc.',
    promptExample1New: '"Summarize the key points of this contract"',
    promptExample2New: '"Explain what this special clause means"',
    promptExample3New: '"Is this condition unfavorable to me?"',
    promptExample4New: '"Explain this legal term in simple language"',
    chatPlaceholder: 'Enter legal documents, clauses, or your questions...',
    sendButton: 'Send',
    botName: 'LegalBot',
    aiStatus: 'AI Service Operating Normally',
    usageTipsTitle: '💡 Usage Tips',
    tipCopyPaste: 'Copy and paste the entire document.',
    tipSpecificQuestions: 'Specific questions get more accurate answers.',
    tipClauseFormat: 'Ask in the format: "ContractName Article X"',
    tipEasierExplanation: "If you don't understand, ask for a simpler explanation.",
    supportedDocsTitle: '📄 Supported Documents',
    docTypeContracts: 'Contracts (lease, labor, sales, service, etc.)',
    docTypeTerms: 'Terms of Service & Privacy Policies',
    docTypeLegalClauses: 'Legal Clauses & Regulations',
    docTypeOfficialDocs: 'Official Documents & Forms (clause-focused)',
    precautionsTitle: '⚠️ Precautions',
    precautionReferenceOnly: 'Use for reference purposes only.',
    precautionConsultExpert: 'Consult with an expert for important decisions.',
    precautionNoPersonalInfo: 'Do not enter personal information.',
    aiDisclaimer:
      '⚠️ This interpretation is generated by AI for reference purposes. Do not consider it as legal advice.',
    loginModalTitle: 'Login',
    loginModalWelcome: 'Welcome to LegalBot',
    googleLogin: 'Google',
    kakaoLogin: 'Kakao',
    orDivider: 'or',
    emailLabel: 'Email',
    emailPlaceholder: 'example@email.com',
    passwordLabel: 'Password',
    passwordPlaceholderLogin: 'Enter your password',
    loginButton: 'Login',
    noAccount: "Don't have an account?",
    signupLink: 'Sign Up',
    signupModalTitle: 'Sign Up',
    signupModalStart: 'Get started with LegalBot',
    googleSignup: 'Google',
    kakaoSignup: 'Kakao',
    nameLabel: 'Name',
    namePlaceholder: 'Enter your name',
    passwordPlaceholderSignup: 'Enter 8+ characters',
    passwordConfirmLabel: 'Confirm Password',
    passwordConfirmPlaceholder: 'Re-enter your password',
    signupButton: 'Sign Up',
    alreadyAccount: 'Already have an account?',
    loginLink: 'Login',
    feedbackQuestion: 'Was this interpretation helpful?',
    feedbackYes: '👍',
    feedbackNo: '👎',
    feedbackModalTitle: 'Provide Feedback',
    feedbackModalSubtitle: 'Let us know your thoughts on the interpretation.',
    feedbackReasonLabel: 'Reason for Error',
    reasonInaccurate: 'Inaccurate/Mistranslation',
    reasonOutOfContext: 'Out of Context',
    reasonUnnatural: 'Unnatural Phrasing',
    reasonOther: 'Other',
    feedbackCommentLabel: 'Additional Comments (Optional)',
    feedbackCommentPlaceholder: 'Enter details here...',
    submitFeedbackButton: 'Submit Feedback',
    alertLoginNotImplemented: 'Login feature is under development!',
    alertSignupNotImplemented: 'Sign up feature is under development!',
    alertFeatureNavigation: (feature) => `Navigating to "${feature}" (To be implemented).`,
    alertFeedbackSubmitted: 'Thank you for your valuable feedback!',
    sampleBotResponse: (userInput) =>
      `Regarding "${userInput}", here's an explanation: This content can be understood as follows... For more details, please specify the contract name and article number (e.g., Labor Contract Article 1).`,
    sampleEasyModeResponse: (userInput) =>
      `Here's a very simple explanation for "${userInput}"! For example, if I were to explain it to a child... (Uses analogies for better understanding.)`,
    sampleDefaultModeResponse: (userInput) =>
      `Here's the default explanation for "${userInput}". It preserves the original meaning as much as possible, providing additional explanations for legal terms if necessary.`,
    clauseResponseFormat: (clauseTitle, clauseContent) =>
      `📜 The content of ${clauseTitle} is as follows:\n"${clauseContent}"`,
    clauseNotFound: (contractName, clauseNum) =>
      `Sorry, I couldn't find ${clauseNum} in ${contractName}, or the information for this contract is not yet available.`,
    contractNotFound: (contractName) =>
      `Sorry, information about "${contractName}" is not yet available. Please ask about another contract.`,
    easyModePrefix: 'To put it simply, ',
    defaultModePrefix: '',
    noRecentChats: 'No recent chat history.',
    chatItemPrefix: 'Q: ',
    longTextPlaceholder:
      'The text you entered is quite long. It seems to be a contract. What specific part are you curious about? (e.g., Article 3 content, risk factors)',
    generalLegalQueryInfo:
      'I can also answer questions about legal terms or general legal queries. Feel free to ask!',
    koreanTerm: 'Korean',
    englishTerm: 'English',
    japaneseTerm: 'Japanese',
    chineseTerm: 'Chinese',
    spanishTerm: 'Spanish',
    themeToggleLight: 'Light Mode',
    themeToggleDark: 'Dark Mode',
    exportChatTooltip: 'Export Chat',
    clearChatTooltip: 'Clear Chat',
    confirmClearChat:
      'Are you sure you want to delete all chat history? This action cannot be undone.',
    chatCleared: 'Chat history has been cleared.',
    enterKeySettingLabel: 'Send with Enter key',
    contractQueryPrompt: (contractName) =>
      `What would you like to know about "${contractName}"? Ask about a specific article (e.g., Article 3) or its content.`,
    articleKeywordRegex: 'Article\\s*(\\d+)',
    termQuerySuffixRegex: 'means|what is|explain|define',
    termDefinitionConnective: ' means ',
    termDefinitionEnd: '.',
    sampleEasyExplanationForTerm: (term) => `In simple terms, ${term} is like when...`,
    greetingKeyword: 'hello',
  },
  ja: {
    logoText: 'リーガルボット',
    mainFeatures: '📋 主な機能',
    language: '🌐 言語',
    featureContractAnalysis: '契約条項の解釈',
    featureLegalTermExplain: '法律用語の説明',
    featureDocSummary: '文書の要約',
    featureConditionAnalysis: '条件分析',
    featureRiskIdentification: 'リスク要素の特定',
    login: 'ログイン',
    signup: '会員登録',
    recentChatsMenu: '💬 最近のチャット',
    interpretationModeLabel: '解釈モード', // Added
    defaultModeLabel: '基本モード',
    easyModeLabel: '簡単解釈モード',
    exportChatBtnText: '会話をエクスポート',
    clearChatBtnText: 'すべてのチャットを削除',
    chatHeaderTitle: '法律AIアシスタント',
    chatHeaderSubtitle: '複雑な法律文書を簡単に理解',
    welcomeTitle: 'こんにちは！法律AIアシスタントです',
    welcomeDesc:
      '法律文書の複雑な内容を分かりやすく説明します。契約書、規約、法律条項など、何でも聞いてください。',
    promptExample1New: '"この契約書の主要内容を要約してください"',
    promptExample2New: '"特約条項が何を意味するのか説明してください"',
    promptExample3New: '"この条件は私に不利ですか？"',
    promptExample4New: '"法律用語を簡単に説明してください"',
    chatPlaceholder: '法律文書や条項を入力するか、質問を入力してください...',
    sendButton: '送信',
    botName: 'リーガルボット',
    aiStatus: 'AIサービス正常稼働中',
    usageTipsTitle: '💡 利用のヒント',
    tipCopyPaste: '文書全体をコピー＆ペーストしてください。',
    tipSpecificQuestions: '具体的な質問ほど正確な回答が得られます。',
    tipClauseFormat: '「契約書名 第X条」形式で質問してください',
    tipEasierExplanation: '理解できない場合は、もっと簡単な説明を求めてください。',
    supportedDocsTitle: '📄 対応文書',
    docTypeContracts: '契約書（賃貸、労働、売買、業務委託など）',
    docTypeTerms: '利用規約および個人情報処理方針',
    docTypeLegalClauses: '法律条項および規制',
    docTypeOfficialDocs: '公文書および申請書（一部条項中心）',
    precautionsTitle: '⚠️ 注意事項',
    precautionReferenceOnly: '参考用としてのみ活用してください。',
    precautionConsultExpert: '重要な決定は専門家と相談してください。',
    precautionNoPersonalInfo: '個人情報は入力しないでください。',
    aiDisclaimer:
      '⚠️ この解釈はAIによって生成された参考文です。法的助言とは見なさないでください。',
    loginModalTitle: 'ログイン',
    loginModalWelcome: 'LegalBotへようこそ',
    googleLogin: 'Google',
    kakaoLogin: 'カカオ',
    orDivider: 'または',
    emailLabel: 'メールアドレス',
    emailPlaceholder: 'example@email.com',
    passwordLabel: 'パスワード',
    passwordPlaceholderLogin: 'パスワードを入力してください',
    loginButton: 'ログイン',
    noAccount: 'アカウントをお持ちではありませんか？',
    signupLink: '会員登録',
    signupModalTitle: '会員登録',
    signupModalStart: 'LegalBotを始めましょう',
    googleSignup: 'Google',
    kakaoSignup: 'カカオ',
    nameLabel: '名前',
    namePlaceholder: '名前を入力してください',
    passwordPlaceholderSignup: '8文字以上で入力してください',
    passwordConfirmLabel: 'パスワード確認',
    passwordConfirmPlaceholder: 'パスワードを再入力してください',
    signupButton: '会員登録',
    alreadyAccount: '既にアカウントをお持ちですか？',
    loginLink: 'ログイン',
    feedbackQuestion: 'この解釈は役に立ちましたか？',
    feedbackYes: '👍',
    feedbackNo: '👎',
    feedbackModalTitle: 'フィードバック提供',
    feedbackModalSubtitle: '解釈に関するご意見をお聞かせください。',
    feedbackReasonLabel: 'エラー事由',
    reasonInaccurate: '誤訳/不正確',
    reasonOutOfContext: '文脈不一致',
    reasonUnnatural: '不自然な表現',
    reasonOther: 'その他',
    feedbackCommentLabel: '追加コメント（任意）',
    feedbackCommentPlaceholder: '詳細を入力してください...',
    submitFeedbackButton: 'フィードバック送信',
    alertLoginNotImplemented: 'ログイン機能は開発中です！',
    alertSignupNotImplemented: '会員登録機能は開発中です！',
    alertFeatureNavigation: (feature) => `「${feature}」機能へご案内します。（実装予定）`,
    alertFeedbackSubmitted: '貴重なご意見ありがとうございます！',
    sampleBotResponse: (userInput) =>
      `「${userInput}」についてご説明します。この内容は次のように理解できます。詳細については、契約書名と条項番号を指定してください（例：労働契約書 第1条）。`,
    sampleEasyModeResponse: (userInput) =>
      `「${userInput}」についての非常に簡単な説明です！例えば子供に説明するように言うと...（理解を助けるために例え話を使います。）`,
    sampleDefaultModeResponse: (userInput) =>
      `「${userInput}」についての基本説明です。原文の意味を最大限に活かし、必要に応じて法律用語の補足説明を提供します。`,
    clauseResponseFormat: (clauseTitle, clauseContent) =>
      `📜 ${clauseTitle}の内容は以下の通りです：\n「${clauseContent}」`,
    clauseNotFound: (contractName, clauseNum) =>
      `申し訳ありませんが、${contractName}の${clauseNum}が見つからないか、この契約書の情報はまだ利用できません。`,
    contractNotFound: (contractName) =>
      `申し訳ありません、「${contractName}」に関する情報はまだ利用できません。他の契約書について質問してください。`,
    easyModePrefix: '簡単に言いますと、',
    defaultModePrefix: '',
    noRecentChats: '最近のチャット履歴はありません。',
    chatItemPrefix: '質: ',
    longTextPlaceholder:
      '入力された内容が長文です。契約書のようです。どの部分についてお知りになりたいですか？ (例: 第3条の内容, リスク要因)',
    generalLegalQueryInfo:
      '法律用語や一般的な法律に関する質問にもお答えできます。お気軽にご質問ください！',
    koreanTerm: '韓国語',
    englishTerm: '英語',
    japaneseTerm: '日本語',
    chineseTerm: '中国語',
    spanishTerm: 'スペイン語',
    themeToggleLight: 'ライトモード',
    themeToggleDark: 'ダークモード',
    exportChatTooltip: 'チャット履歴をエクスポート',
    clearChatTooltip: 'チャット履歴を削除',
    confirmClearChat: 'すべてのチャット履歴を削除しますか？この操作は元に戻せません。',
    chatCleared: 'チャット履歴が削除されました。',
    enterKeySettingLabel: 'Enterキーで送信',
    contractQueryPrompt: (contractName) =>
      `「${contractName}」について何を知りたいですか？ 特定の条項（例: 第3条）や内容について質問してください。`,
    articleKeywordRegex: '第(\\d+)条',
    termQuerySuffixRegex: 'とは|意味|教えて|説明して',
    termDefinitionConnective: 'とは、',
    termDefinitionEnd: 'という意味です。',
    sampleEasyExplanationForTerm: (term) =>
      `簡単に言うと、${term}はこういう時に使う言葉です...`,
    greetingKeyword: 'こんにちは',
  },
  zh: {
    logoText: '法律机器人',
    mainFeatures: '📋 主要功能',
    language: '🌐 语言',
    featureContractAnalysis: '合同条款分析',
    featureLegalTermExplain: '法律术语解释',
    featureDocSummary: '文件摘要',
    featureConditionAnalysis: '条件分析',
    featureRiskIdentification: '风险识别',
    login: '登录',
    signup: '注册',
    recentChatsMenu: '💬 最近聊天',
    interpretationModeLabel: '解释模式', // Added
    defaultModeLabel: '默认模式',
    easyModeLabel: '简易模式',
    exportChatBtnText: '导出对话',
    clearChatBtnText: '清除所有聊天',
    chatHeaderTitle: '法律AI助手',
    chatHeaderSubtitle: '轻松理解复杂的法律文件',
    welcomeTitle: '你好！我是法律AI助手',
    welcomeDesc: '我用简单的方式解释复杂的法律文件。询问有关合同、条款、法律条文等任何内容。',
    promptExample1New: '"请总结这份合同的核心内容"',
    promptExample2New: '"请解释这个特别条款是什么意思"',
    promptExample3New: '"这个条件对我不利吗？"',
    promptExample4New: '"请用简单的语言解释法律术语"',
    chatPlaceholder: '输入法律文件、条款或您的问题...',
    sendButton: '发送',
    botName: '法律机器人',
    aiStatus: 'AI服务运行正常',
    usageTipsTitle: '💡 使用技巧',
    tipCopyPaste: '复制并粘贴整个文档。',
    tipSpecificQuestions: '具体问题能得到更准确的答案。',
    tipClauseFormat: '请按格式提问：“合同名称 第X条”',
    tipEasierExplanation: '如果不懂，请请求更简单的解释。',
    supportedDocsTitle: '📄 支持文件',
    docTypeContracts: '合同（租赁、劳动、买卖、服务等）',
    docTypeTerms: '服务条款和隐私政策',
    docTypeLegalClauses: '法律条款和规定',
    docTypeOfficialDocs: '官方文件和表格（以条款为中心）',
    precautionsTitle: '⚠️ 注意事项',
    precautionReferenceOnly: '仅供参考。',
    precautionConsultExpert: '重要决策请咨询专家。',
    precautionNoPersonalInfo: '请勿输入个人信息。',
    aiDisclaimer: '⚠️ 此解释由AI生成，仅供参考，不应视为法律建议。',
    loginModalTitle: '登录',
    loginModalWelcome: '欢迎来到 LegalBot',
    googleLogin: 'Google 登录',
    kakaoLogin: 'Kakao 登录',
    orDivider: '或',
    emailLabel: '电子邮件',
    emailPlaceholder: 'example@email.com',
    passwordLabel: '密码',
    passwordPlaceholderLogin: '输入您的密码',
    loginButton: '登录',
    noAccount: '没有账户？',
    signupLink: '注册',
    signupModalTitle: '注册',
    signupModalStart: '开始使用 LegalBot',
    googleSignup: '使用 Google 注册',
    kakaoSignup: '使用 Kakao 注册',
    nameLabel: '名称',
    namePlaceholder: '输入您的名称',
    passwordPlaceholderSignup: '输入8个以上字符',
    passwordConfirmLabel: '确认密码',
    passwordConfirmPlaceholder: '重新输入您的密码',
    signupButton: '注册',
    alreadyAccount: '已有账户？',
    loginLink: '登录',
    feedbackQuestion: '此解释有帮助吗？',
    feedbackYes: '👍',
    feedbackNo: '👎',
    feedbackModalTitle: '提供反馈',
    feedbackModalSubtitle: '请告诉我们您对解释的看法。',
    feedbackReasonLabel: '错误原因',
    reasonInaccurate: '不准确/翻译错误',
    reasonOutOfContext: '脱离上下文',
    reasonUnnatural: '表达不自然',
    reasonOther: '其他',
    feedbackCommentLabel: '补充评论（可选）',
    feedbackCommentPlaceholder: '在此输入详细信息...',
    submitFeedbackButton: '提交反馈',
    alertLoginNotImplemented: '登录功能正在开发中！',
    alertSignupNotImplemented: '注册功能正在开发中！',
    alertFeatureNavigation: (feature) => `导航到 "${feature}" (待实现)。`,
    alertFeedbackSubmitted: '感谢您的宝贵反馈！',
    sampleBotResponse: (userInput) =>
      `关于 "${userInput}"，解释如下：此内容可理解为... 如需更多详细信息，请指明合同名称和条款编号（例如：劳动合同 第1条）。`,
    sampleEasyModeResponse: (userInput) =>
      `这是关于 "${userInput}" 的一个非常简单的解释！例如，如果我要向孩子解释...（使用类比以更好地理解。）`,
    sampleDefaultModeResponse: (userInput) =>
      `这是关于 "${userInput}" 的默认解释。它尽可能保留原始含义，并在必要时为法律术语提供额外解释。`,
    clauseResponseFormat: (clauseTitle, clauseContent) =>
      `📜 ${clauseTitle} 的内容如下：\n"${clauseContent}"`,
    clauseNotFound: (contractName, clauseNum) =>
      `抱歉，我在 ${contractName} 中找不到 ${clauseNum}，或者此合同的信息尚不可用。`,
    contractNotFound: (contractName) =>
      `抱歉，关于 "${contractName}" 的信息尚不可用。请询问其他合同。`,
    easyModePrefix: '简单来说，',
    defaultModePrefix: '',
    noRecentChats: '最近没有聊天记录。',
    chatItemPrefix: '问: ',
    longTextPlaceholder:
      '您输入的文本很长。它似乎是一份合同。您对哪个具体部分感兴趣？（例如：第3条内容，风险因素）',
    generalLegalQueryInfo: '我也可以回答有关法律术语或一般法律查询的问题。请随时提问！',
    koreanTerm: '韩语',
    englishTerm: '英语',
    japaneseTerm: '日语',
    chineseTerm: '中文',
    spanishTerm: '西班牙语',
    themeToggleLight: '浅色模式',
    themeToggleDark: '深色模式',
    exportChatTooltip: '导出聊天记录',
    clearChatTooltip: '清除聊天记录',
    confirmClearChat: '您确定要删除所有聊天记录吗？此操作无法撤销。',
    chatCleared: '聊天记录已清除。',
    enterKeySettingLabel: '使用Enter键发送',
    contractQueryPrompt: (contractName) =>
      `您想了解关于“${contractName}”的什么信息？请询问具体条款（例如：第3条）或其内容。`,
    articleKeywordRegex: '第(\\d+)条',
    termQuerySuffixRegex: '是什么意思|解释一下|定义',
    termDefinitionConnective: '是指',
    termDefinitionEnd: '。',
    sampleEasyExplanationForTerm: (term) => `简单来说，${term}就像是当...`,
    greetingKeyword: '你好',
  },
  es: {
    logoText: 'LegalBot',
    mainFeatures: '📋 Funciones',
    language: '🌐 Idioma',
    featureContractAnalysis: 'Análisis de Cláusulas Contractuales',
    featureLegalTermExplain: 'Explicación de Términos Legales',
    featureDocSummary: 'Resumen de Documentos',
    featureConditionAnalysis: 'Análisis de Condiciones',
    featureRiskIdentification: 'Identificación de Riesgos',
    login: 'Iniciar Sesión',
    signup: 'Registrarse',
    recentChatsMenu: '💬 Chats Recientes',
    interpretationModeLabel: 'Modo de Interpretación', // Added
    defaultModeLabel: 'Modo Predeterminado',
    easyModeLabel: 'Modo Fácil',
    exportChatBtnText: 'Exportar Conversación',
    clearChatBtnText: 'Borrar Todos los Chats',
    chatHeaderTitle: 'Asistente Legal IA',
    chatHeaderSubtitle: 'Comprenda fácilmente documentos legales complejos',
    welcomeTitle: '¡Hola! Soy el Asistente Legal IA',
    welcomeDesc:
      'Explico documentos legales complejos de forma sencilla. Pregunte sobre contratos, términos, cláusulas legales, etc.',
    promptExample1New: '"Resume los puntos clave de este contrato"',
    promptExample2New: '"Explica qué significa esta cláusula especial"',
    promptExample3New: '"¿Es esta condición desfavorable para mí?"',
    promptExample4New: '"Explica este término legal en un lenguaje sencillo"',
    chatPlaceholder: 'Ingrese documentos legales, cláusulas o sus preguntas...',
    sendButton: 'Enviar',
    botName: 'LegalBot',
    aiStatus: 'Servicio IA Operando Normalmente',
    usageTipsTitle: '💡 Consejos de Uso',
    tipCopyPaste: 'Copie y pegue el documento completo.',
    tipSpecificQuestions: 'Las preguntas específicas obtienen respuestas más precisas.',
    tipClauseFormat: 'Pregunte en el formato: "NombreContrato Artículo X"',
    tipEasierExplanation: 'Si no entiende, pida una explicación más sencilla.',
    supportedDocsTitle: '📄 Documentos Soportados',
    docTypeContracts: 'Contratos (arrendamiento, laboral, compraventa, servicios, etc.)',
    docTypeTerms: 'Términos de Servicio y Políticas de Privacidad',
    docTypeLegalClauses: 'Cláusulas Legales y Regulaciones',
    docTypeOfficialDocs: 'Documentos Oficiales y Formularios (enfocado en cláusulas)',
    precautionsTitle: '⚠️ Precauciones',
    precautionReferenceOnly: 'Úselo solo como referencia.',
    precautionConsultExpert: 'Consulte con un experto para decisiones importantes.',
    precautionNoPersonalInfo: 'No ingrese información personal.',
    aiDisclaimer:
      '⚠️ Esta interpretación es generada por IA con fines de referencia. No la considere como asesoramiento legal.',
    loginModalTitle: 'Iniciar Sesión',
    loginModalWelcome: 'Bienvenido a LegalBot',
    googleLogin: 'Iniciar Sesión con Google',
    kakaoLogin: 'Iniciar Sesión con Kakao',
    orDivider: 'o',
    emailLabel: 'Correo Electrónico',
    emailPlaceholder: 'ejemplo@correo.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholderLogin: 'Ingrese su contraseña',
    loginButton: 'Iniciar Sesión',
    noAccount: '¿No tiene una cuenta?',
    signupLink: 'Registrarse',
    signupModalTitle: 'Registrarse',
    signupModalStart: 'Comience con LegalBot',
    googleSignup: 'Registrarse con Google',
    kakaoSignup: 'Registrarse con Kakao',
    nameLabel: 'Nombre',
    namePlaceholder: 'Ingrese su nombre',
    passwordPlaceholderSignup: 'Ingrese más de 8 caracteres',
    passwordConfirmLabel: 'Confirmar Contraseña',
    passwordConfirmPlaceholder: 'Reingrese su contraseña',
    signupButton: 'Registrarse',
    alreadyAccount: '¿Ya tiene una cuenta?',
    loginLink: 'Iniciar Sesión',
    feedbackQuestion: '¿Fue útil esta interpretación?',
    feedbackYes: '👍',
    feedbackNo: '👎',
    feedbackModalTitle: 'Proporcionar Comentarios',
    feedbackModalSubtitle: 'Háganos saber su opinión sobre la interpretación.',
    feedbackReasonLabel: 'Motivo del Error',
    reasonInaccurate: 'Incorrecto/Error de Traducción',
    reasonOutOfContext: 'Fuera de Contexto',
    reasonUnnatural: 'Redacción Poco Natural',
    reasonOther: 'Otro',
    feedbackCommentLabel: 'Comentarios Adicionales (Opcional)',
    feedbackCommentPlaceholder: 'Ingrese detalles aquí...',
    submitFeedbackButton: 'Enviar Comentarios',
    alertLoginNotImplemented: '¡La función de inicio de sesión está en desarrollo!',
    alertSignupNotImplemented: '¡La función de registro está en desarrollo!',
    alertFeatureNavigation: (feature) => `Navegando a "${feature}" (Por implementar).`,
    alertFeedbackSubmitted: '¡Gracias por sus valiosos comentarios!',
    sampleBotResponse: (userInput) =>
      `Con respecto a "${userInput}", aquí hay una explicación: Este contenido se puede entender de la siguiente manera... Para más detalles, especifique el nombre del contrato y el número de artículo (por ejemplo, Contrato Laboral Artículo 1).`,
    sampleEasyModeResponse: (userInput) =>
      `¡Aquí hay una explicación muy simple para "${userInput}"! Por ejemplo, si tuviera que explicárselo a un niño... (Usa analogías para una mejor comprensión.)`,
    sampleDefaultModeResponse: (userInput) =>
      `Aquí está la explicación predeterminada para "${userInput}". Conserva el significado original tanto como sea posible, proporcionando explicaciones adicionales para los términos legales si es necesario.`,
    clauseResponseFormat: (clauseTitle, clauseContent) =>
      `📜 El contenido de ${clauseTitle} es el siguiente:\n"${clauseContent}"`,
    clauseNotFound: (contractName, clauseNum) =>
      `Lo siento, no pude encontrar ${clauseNum} en ${contractName}, o la información para este contrato aún no está disponible.`,
    contractNotFound: (contractName) =>
      `Lo siento, la información sobre "${contractName}" aún no está disponible. Pregunte sobre otro contrato.`,
    easyModePrefix: 'En pocas palabras, ',
    defaultModePrefix: '',
    noRecentChats: 'No hay historial de chat reciente.',
    chatItemPrefix: 'P: ',
    longTextPlaceholder:
      'El texto que ingresó es bastante largo. Parece ser un contrato. ¿Sobre qué parte específica tiene curiosidad? (por ejemplo, contenido del Artículo 3, factores de riesgo)',
    generalLegalQueryInfo:
      'También puedo responder preguntas sobre términos legales o consultas legales generales. ¡No dude en preguntar!',
    koreanTerm: 'Coreano',
    englishTerm: 'Inglés',
    japaneseTerm: 'Japonés',
    chineseTerm: 'Chino',
    spanishTerm: 'Español',
    themeToggleLight: 'Modo Claro',
    themeToggleDark: 'Modo Oscuro',
    exportChatTooltip: 'Exportar Chat',
    clearChatTooltip: 'Borrar Chat',
    confirmClearChat:
      '¿Está seguro de que desea eliminar todo el historial de chat? Esta acción no se puede deshacer.',
    chatCleared: 'El historial de chat ha sido borrado.',
    enterKeySettingLabel: 'Enviar con la tecla Enter',
    contractQueryPrompt: (contractName) =>
      `¿Qué le gustaría saber sobre "${contractName}"? Pregunte sobre un artículo específico (p. ej., Artículo 3) o su contenido.`,
    articleKeywordRegex: 'Artículo\\s*(\\d+)',
    termQuerySuffixRegex: 'significa|qué es|explica|define',
    termDefinitionConnective: ' significa ',
    termDefinitionEnd: '.',
    sampleEasyExplanationForTerm: (term) => `En términos simples, ${term} es como cuando...`,
    greetingKeyword: 'hola',
  },
};

// Legal Terms Dictionary
const legalTerms = {
  ko: {
    계약: {
      term: '계약',
      explanation: '둘 이상의 당사자 간의 법적 효력이 있는 합의',
      en_term: 'Contract',
      ja_term: '契約 (けいやく)',
      zh_term: '合同',
      es_term: 'Contrato',
    },
    특약: {
      term: '특약',
      explanation: '계약 당사자가 본계약 외에 추가로 합의한 특별한 약속',
      en_term: 'Special Condition/Rider',
      ja_term: '特約 (とくやく)',
      zh_term: '特别条款',
      es_term: 'Cláusula Especial',
    },
    갑: {
      term: '갑 (甲)',
      explanation: '계약에서 주로 권리자나 발주자 등 첫 번째 당사자를 지칭',
      en_term: 'Party A',
      ja_term: '甲 (こう)',
      zh_term: '甲方',
      es_term: 'Parte A',
    },
    을: {
      term: '을 (乙)',
      explanation: '계약에서 주로 의무자나 수주자 등 두 번째 당사자를 지칭',
      en_term: 'Party B',
      ja_term: '乙 (おつ)',
      zh_term: '乙方',
      es_term: 'Parte B',
    },
    손해배상: {
      term: '손해배상',
      explanation: '위법행위로 타인에게 입힌 손해를 돈으로 물어주는 것',
      en_term: 'Damages/Compensation for Damages',
      ja_term: '損害賠償 (そんがいばいしょう)',
      zh_term: '损害赔偿',
      es_term: 'Indemnización por Daños y Perjuicios',
    },
    보증금: {
      term: '보증금',
      explanation: '임대차 계약 시 임차인이 임대인에게 지급하는 일정 금액 (채무 담보 목적)',
      en_term: 'Security Deposit',
      ja_term: '保証金 (ほしょうきん)/敷金 (しききん)',
      zh_term: '保证金',
      es_term: 'Depósito de Garantía',
    },
    지식재산권: {
      term: '지식재산권',
      explanation: '발명, 상표, 디자인 등 지적 창작물에 대한 권리',
      en_term: 'Intellectual Property Rights',
      ja_term: '知的財産権 (ちてきざいさんけん)',
      zh_term: '知识产权',
      es_term: 'Derechos de Propiedad Intelectual',
    },
  },
  en: {
    contract: {
      term: 'Contract',
      explanation: 'A legally binding agreement between two or more parties.',
      ko_term: '계약',
      ja_term: '契約 (けいやく)',
      zh_term: '合同',
      es_term: 'Contrato',
    },
    'special condition': {
      term: 'Special Condition/Rider',
      explanation: 'An additional term agreed upon by parties beyond the main contract.',
      ko_term: '특약',
      ja_term: '特約 (とくやく)',
      zh_term: '特别条款',
      es_term: 'Cláusula Especial',
    },
    'party a': {
      term: 'Party A',
      explanation:
        'Typically refers to the first party in a contract, often the principal or client.',
      ko_term: '갑 (甲)',
      ja_term: '甲 (こう)',
      zh_term: '甲方',
      es_term: 'Parte A',
    },
    'party b': {
      term: 'Party B',
      explanation:
        'Typically refers to the second party in a contract, often the agent or contractor.',
      ko_term: '을 (乙)',
      ja_term: '乙 (おつ)',
      zh_term: '乙方',
      es_term: 'Parte B',
    },
    damages: {
      term: 'Damages',
      explanation: 'Monetary compensation for loss or injury caused by a wrongful act.',
      ko_term: '손해배상',
      ja_term: '損害賠償 (そんがいばいしょう)',
      zh_term: '损害赔偿',
      es_term: 'Indemnización por Daños y Perjuicios',
    },
    'security deposit': {
      term: 'Security Deposit',
      explanation: 'Money paid to a landlord to cover potential damages.',
      ko_term: '보증금',
      ja_term: '保証金/敷金',
      zh_term: '保证金',
      es_term: 'Depósito de Garantía',
    },
    'intellectual property rights': {
      term: 'Intellectual Property Rights',
      explanation:
        'Rights to creations of the mind, such as inventions, literary and artistic works.',
      ko_term: '지식재산권',
      ja_term: '知的財産権',
      zh_term: '知识产权',
      es_term: 'Derechos de Propiedad Intelectual',
    },
  },
  ja: {
    契約: {
      term: '契約 (けいやく)',
      explanation: '二人以上の当事者間の法的な合意。',
      ko_term: '계약',
      en_term: 'Contract',
      zh_term: '合同',
      es_term: 'Contrato',
    },
    特約: {
      term: '特約 (とくやく)',
      explanation: '契約当事者が本契約以外に追加で合意した特別な約束。',
      ko_term: '특약',
      en_term: 'Special Condition/Rider',
      zh_term: '特别条款',
      es_term: 'Cláusula Especial',
    },
    甲: {
      term: '甲 (こう)',
      explanation: '契約において、主に権利者や発注者など第一の当事者を指す。',
      ko_term: '갑 (甲)',
      en_term: 'Party A',
      zh_term: '甲方',
      es_term: 'Parte A',
    },
    乙: {
      term: '乙 (おつ)',
      explanation: '契約において、主に義務者や受注者など第二の当事者を指す。',
      ko_term: '을 (乙)',
      en_term: 'Party B',
      zh_term: '乙方',
      es_term: 'Parte B',
    },
    損害賠償: {
      term: '損害賠償 (そんがいばいしょう)',
      explanation: '違法行為により他人に与えた損害を金銭で補償すること。',
      ko_term: '손해배상',
      en_term: 'Damages/Compensation for Damages',
      zh_term: '损害赔偿',
      es_term: 'Indemnización por Daños y Perjuicios',
    },
    敷金: {
      term: '敷金 (しききん)',
      explanation: '賃貸借契約時に賃借人が賃貸人に預ける金銭。',
      ko_term: '보증금',
      en_term: 'Security Deposit',
      zh_term: '保证金',
      es_term: 'Depósito de Garantía',
    },
    知的財産権: {
      term: '知的財産権 (ちてきざいさんけん)',
      explanation: '発明、著作物など人間の知的創造活動によって生み出されたものに対する権利。',
      ko_term: '지식재산권',
      en_term: 'Intellectual Property Rights',
      zh_term: '知识产权',
      es_term: 'Derechos de Propiedad Intelectual',
    },
  },
  zh: {
    合同: {
      term: '合同',
      explanation: '两方或多方之间具有法律约束力的协议。',
      ko_term: '계약',
      en_term: 'Contract',
      ja_term: '契約 (けいやく)',
      es_term: 'Contrato',
    },
    特别条款: {
      term: '特别条款',
      explanation: '合同当事人在主合同之外另行约定的特殊条款。',
      ko_term: '특약',
      en_term: 'Special Condition/Rider',
      ja_term: '特約 (とくやく)',
      es_term: 'Cláusula Especial',
    },
    甲方: {
      term: '甲方',
      explanation: '合同中通常指权利人或发包方等第一方当事人。',
      ko_term: '갑 (甲)',
      en_term: 'Party A',
      ja_term: '甲 (こう)',
      es_term: 'Parte A',
    },
    乙方: {
      term: '乙方',
      explanation: '合同中通常指义务人或承包方等第二方当事人。',
      ko_term: '을 (乙)',
      en_term: 'Party B',
      ja_term: '乙 (おつ)',
      es_term: 'Parte B',
    },
    损害赔偿: {
      term: '损害赔偿',
      explanation: '因违法行为给他人造成的损失用金钱进行赔偿。',
      ko_term: '손해배상',
      en_term: 'Damages/Compensation for Damages',
      ja_term: '損害賠償 (そんがいばいしょう)',
      es_term: 'Indemnización por Daños y Perjuicios',
    },
    保证金: {
      term: '保证金',
      explanation: '租赁合同时，承租人向出租人支付的一定金额（用于债务担保）。',
      ko_term: '보증금',
      en_term: 'Security Deposit',
      ja_term: '保証金/敷金',
      es_term: 'Depósito de Garantía',
    },
    知识产权: {
      term: '知识产权',
      explanation: '对发明、商标、设计等智力创作成果的权利。',
      ko_term: '지식재산권',
      en_term: 'Intellectual Property Rights',
      ja_term: '知的財産権',
      es_term: 'Derechos de Propiedad Intelectual',
    },
  },
  es: {
    Contrato: {
      term: 'Contrato',
      explanation: 'Un acuerdo legalmente vinculante entre dos o más partes.',
      ko_term: '계약',
      en_term: 'Contract',
      ja_term: '契約 (けいやく)',
      zh_term: '合同',
    },
    'Cláusula Especial': {
      term: 'Cláusula Especial',
      explanation:
        'Un término adicional acordado por las partes más allá del contrato principal.',
      ko_term: '특약',
      en_term: 'Special Condition/Rider',
      ja_term: '特約 (とくやく)',
      zh_term: '特别条款',
    },
    'Parte A': {
      term: 'Parte A',
      explanation:
        'Generalmente se refiere a la primera parte en un contrato, a menudo el principal o cliente.',
      ko_term: '갑 (甲)',
      en_term: 'Party A',
      ja_term: '甲 (こう)',
      es_term: 'Parte A',
    },
    'Parte B': {
      term: 'Parte B',
      explanation:
        'Generalmente se refiere a la segunda parte en un contrato, a menudo el agente o contratista.',
      ko_term: '을 (乙)',
      en_term: 'Party B',
      ja_term: '乙 (おつ)',
      zh_term: '乙方',
    },
    'Indemnización por Daños y Perjuicios': {
      term: 'Indemnización por Daños y Perjuicios',
      explanation:
        'Compensación monetaria por pérdidas o lesiones causadas por un acto ilícito.',
      ko_term: '손해배상',
      en_term: 'Damages/Compensation for Damages',
      ja_term: '損害賠償 (そんがいばいしょう)',
      zh_term: '损害赔偿',
    },
    'Depósito de Garantía': {
      term: 'Depósito de Garantía',
      explanation:
        'Dinero que el inquilino entrega al arrendador al inicio del contrato de alquiler para cubrir posibles daños o incumplimientos.',
      ko_term: '보증금',
      en_term: 'Security Deposit',
      ja_term: '保証金/敷金',
      zh_term: '保证金',
    },
    'Derechos de Propiedad Intelectual': {
      term: 'Derechos de Propiedad Intelectual',
      explanation:
        'Derechos sobre las creaciones de la mente, como invenciones, obras literarias y artísticas.',
      ko_term: '지식재산권',
      en_term: 'Intellectual Property Rights',
      ja_term: '知的財産権',
      zh_term: '知识产权',
    },
  },
};
let currentLanguage = localStorage.getItem('legalBotLanguage') || 'ko';
let currentInterpretationMode =
  localStorage.getItem('legalBotInterpretationMode') || 'default';
let currentTheme = localStorage.getItem('legalBotTheme') || 'light';
let enterKeySends =
  localStorage.getItem('legalBotEnterKeySends') === null
    ? true
    : localStorage.getItem('legalBotEnterKeySends') === 'true';

let feedbackData = JSON.parse(localStorage.getItem('legalBotFeedbackData')) || [];
let messageIdCounter = parseInt(localStorage.getItem('legalBotMessageIdCounter')) || 0;
let chatHistory = JSON.parse(localStorage.getItem('legalBotChatHistory')) || [];
function getTranslation(key, ...args) {
  const translationSet = translations[currentLanguage] || translations.ko;
  let translatedString = translationSet[key] || key;
  if (typeof translatedString === 'function') {
    return translatedString(...args);
  }
  return translatedString;
}

function applyTranslations() {
  document.querySelectorAll('[data-translate-key]').forEach((el) => {
    const key = el.getAttribute('data-translate-key');
    el.textContent = getTranslation(key);
  });
  document.querySelectorAll('[data-translate-key-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-translate-key-placeholder');
    el.placeholder = getTranslation(key);
  });
  const langButtonText = document.querySelector('.language-btn > span:first-child');
  if (langButtonText) {
    langButtonText.textContent = getTranslation('language');
  }
  const themeToggleButton = document.getElementById('themeToggle');
  if (themeToggleButton) {
    themeToggleButton.title =
      currentTheme === 'light'
        ? getTranslation('themeToggleDark')
        : getTranslation('themeToggleLight');
  }
}

function changeLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('legalBotLanguage', lang);
  document.documentElement.lang = lang;
  applyTranslations();
  loadChatHistoryFromStorage();
  // Reloads chat messages, which will handle welcome message
  loadRecentChats();
}

function toggleDropdown(dropdownId, buttonElement) {
  const dropdown = document.getElementById(dropdownId);
  const icon = buttonElement.querySelector('.dropdown-icon');

  document
    .querySelectorAll('.features-dropdown.active, .language-dropdown.active')
    .forEach((activeDropdown) => {
      if (activeDropdown.id !== dropdownId) {
        activeDropdown.classList.remove('active');
        const activeIcon =
          activeDropdown.previousElementSibling.querySelector('.dropdown-icon');
        if (activeIcon) activeIcon.style.transform = 'rotate(0deg)';
      }
    });
  dropdown.classList.toggle('active');

  if (icon) {
    if (dropdown.classList.contains('active')) {
      icon.style.transform = 'rotate(180deg)';
    } else {
      icon.style.transform = 'rotate(0deg)';
    }
  }
}

document.addEventListener('click', function (e) {
  document.querySelectorAll('.features-dropdown, .language-dropdown').forEach((dropdown) => {
    const parentMenu = dropdown.closest('.features-menu, .language-selector');
    if (parentMenu && !parentMenu.contains(e.target)) {
      dropdown.classList.remove('active');
      const icon = parentMenu.querySelector('.dropdown-icon');
      if (icon) icon.style.transform = 'rotate(0deg)';
    }
  });
});
document.querySelectorAll('#featuresDropdown .dropdown-item').forEach((item) => {
  item.addEventListener('click', function (e) {
    e.preventDefault();
    const featureKey = this.getAttribute('data-translate-key');
    const featureName = getTranslation(featureKey) || this.textContent;
    console.log('Navigate to (simulated):', featureName);
    alert(getTranslation('alertFeatureNavigation', featureName));

    const dropdown = document.getElementById('featuresDropdown');
    const icon = document.querySelector('.features-btn .dropdown-icon');
    dropdown.classList.remove('active');
    if (icon) icon.style.transform = 'rotate(0deg)';
  });
});
function toggleMenu(contentId, headerElement) {
  const content = document.getElementById(contentId);
  const icon = headerElement.querySelector('.menu-icon');

  content.classList.toggle('active');
  headerElement.classList.toggle('active');

  if (content.classList.contains('active')) {
    content.style.maxHeight = content.scrollHeight + 'px';
    // ← 이 한 줄이 핵심
    if (icon) icon.style.transform = 'rotate(180deg)';
  } else {
    content.style.maxHeight = '0px';
    if (icon) icon.style.transform = 'rotate(0deg)';
  }
}

function toggleCollapsible(headerElement) {
  const content = headerElement.nextElementSibling;
  const icon = headerElement.querySelector('.toggle-icon');

  headerElement.classList.toggle('active');
  content.classList.toggle('active');

  if (content.classList.contains('active')) {
    content.style.maxHeight =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--collapsible-content-max-height')
        .trim() ||
      content.scrollHeight + 'px';
    if (icon) icon.style.transform = 'rotate(180deg)';
  } else {
    content.style.maxHeight = '0px';
    if (icon) icon.style.transform = 'rotate(0deg)';
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

function switchModal(currentModalId, targetModalId) {
  closeModal(currentModalId);
  setTimeout(() => openModal(targetModalId), 150);
}

document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', function (e) {
    if (e.target === this) {
      closeModal(this.id);
    }
  });
});
function handleLogin(event) {
  event.preventDefault();
  console.log('Login form submitted');
  // Interpretation mode is now handled by sidebar controls
  alert(getTranslation('alertLoginNotImplemented'));
  closeModal('loginModal');
}

function handleSignup(event) {
  event.preventDefault();
  console.log('Signup form submitted');
  alert(getTranslation('alertSignupNotImplemented'));
  closeModal('signupModal');
}

const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const chatMessagesContainer = document.getElementById('chatMessages');
const welcomeMessage = document.getElementById('welcomeMessage');
const recentChatsList = document.getElementById('recentChatsList');
const themeToggleButton = document.getElementById('themeToggle');
const themeIcon = themeToggleButton.querySelector('.theme-icon');
const enterKeyToggle = document.getElementById('enterKeyToggle');
const exportChatButton = document.getElementById('exportChatBtn');
const clearChatButton = document.getElementById('clearChatBtn');
const interpretationModeRadios = document.querySelectorAll(
  'input[name="interpretationModeSidebar"]'
);
chatInput.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  sendButton.disabled = this.value.trim() === '';
});
document.querySelectorAll('.example-prompt').forEach((promptCard) => {
  promptCard.addEventListener('click', function () {
    const promptText = this.dataset.promptText || this.textContent.trim().replace(/^"|"$/g, '');
    chatInput.value = promptText;
    chatInput.focus();
    sendButton.disabled = false;
    chatInput.dispatchEvent(new Event('input'));
  });
});
interpretationModeRadios.forEach((radio) => {
  radio.addEventListener('change', function () {
    if (this.checked) {
      currentInterpretationMode = this.value;
      localStorage.setItem('legalBotInterpretationMode', currentInterpretationMode);
      console.log('Interpretation Mode set to (sidebar):', currentInterpretationMode);
    }
  });
});
function generateMessageId() {
  messageIdCounter++;
  localStorage.setItem('legalBotMessageIdCounter', messageIdCounter);
  return `msg-${Date.now()}-${messageIdCounter}`;
}
function formatTimestamp(isoTimestamp) {
  if (!isoTimestamp) return '';
  const date = new Date(isoTimestamp);
  return date.toLocaleString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
function saveChatHistory() {
  localStorage.setItem('legalBotChatHistory', JSON.stringify(chatHistory));
  loadRecentChats();
}
function addMessageToUI(messageText, sender, messageId, timestamp, isHistory = false) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  messageElement.dataset.messageId = messageId;
  const timestampSpan = document.createElement('span');
  timestampSpan.classList.add('message-timestamp');
  timestampSpan.textContent = formatTimestamp(timestamp);
  if (sender === 'user') {
    messageElement.classList.add('user-message');
    const textNode = document.createTextNode(messageText);
    messageElement.appendChild(textNode);
    messageElement.appendChild(timestampSpan);
  } else {
    messageElement.classList.add('bot-message');
    const botNameSpan = document.createElement('span');
    botNameSpan.classList.add('bot-name');
    botNameSpan.textContent = getTranslation('botName');
    messageElement.appendChild(botNameSpan);
    const messageContentSpan = document.createElement('span');
    messageContentSpan.classList.add('message-content');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = messageText;
    function highlightTerms(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        let content = node.nodeValue;
        let newHTML = '';
        let lastIndex = 0;
        const termSetForCurrentLang = legalTerms[currentLanguage] || {};
        const termSetKo = legalTerms.ko || {};
        let allTermsRegexParts = [];
        for (const termKey in termSetKo) {
          allTermsRegexParts.push(escapeRegExp(termKey));
        }
        if (currentLanguage !== 'ko') {
          for (const termKey in termSetForCurrentLang) {
            if (!termSetKo.hasOwnProperty(termKey)) {
              allTermsRegexParts.push(escapeRegExp(termKey));
            }
          }
        }
        if (allTermsRegexParts.length > 0) {
          const combinedRegex = new RegExp(`\\b(${allTermsRegexParts.join('|')})\\b`, 'gi');
          let match;
          while ((match = combinedRegex.exec(content)) !== null) {
            newHTML += content.substring(lastIndex, match.index);
            const matchedTermOriginal = match[0];
            const matchedTermKey = matchedTermOriginal.toLowerCase();
            let termData;
            if (termSetForCurrentLang[matchedTermKey]) {
              termData = termSetForCurrentLang[matchedTermKey];
            } else if (termSetKo[matchedTermKey]) {
              termData = termSetKo[matchedTermKey];
            } else {
              const koKey = Object.keys(termSetKo).find(
                (k) =>
                  (termSetKo[k].term && termSetKo[k].term.toLowerCase() === matchedTermKey) ||
                  (termSetKo[k].en_term &&
                    termSetKo[k].en_term.toLowerCase() === matchedTermKey) ||
                  (termSetKo[k].ja_term &&
                    termSetKo[k].ja_term.toLowerCase() === matchedTermKey) ||
                  (termSetKo[k].zh_term &&
                    termSetKo[k].zh_term.toLowerCase() === matchedTermKey) ||
                  (termSetKo[k].es_term &&
                    termSetKo[k].es_term.toLowerCase() === matchedTermKey)
              );
              if (koKey) termData = termSetKo[koKey];
            }
            if (termData) {
              let displayTerm = matchedTermOriginal;
              let displayExplanation = termData.explanation;
              if (currentLanguage === 'en') {
                displayTerm = termData.en_term || termData.term;
                const enSpecificTermData =
                  legalTerms.en[(termData.en_term || termData.term).toLowerCase()];
                displayExplanation = enSpecificTermData
                  ? enSpecificTermData.explanation
                  : termData.explanation;
              } else if (currentLanguage === 'ja') {
                displayTerm = termData.ja_term || termData.term;
                const jaSpecificTermData =
                  legalTerms.ja[(termData.ja_term || termData.term).toLowerCase()];
                displayExplanation = jaSpecificTermData
                  ? jaSpecificTermData.explanation
                  : termData.explanation;
              } else if (currentLanguage === 'zh') {
                displayTerm = termData.zh_term || termData.term;
                const zhSpecificTermData =
                  legalTerms.zh[(termData.zh_term || termData.term).toLowerCase()];
                displayExplanation = zhSpecificTermData
                  ? zhSpecificTermData.explanation
                  : termData.explanation;
              } else if (currentLanguage === 'es') {
                displayTerm = termData.es_term || termData.term;
                const esSpecificTermData =
                  legalTerms.es[(termData.es_term || termData.term).toLowerCase()];
                displayExplanation = esSpecificTermData
                  ? esSpecificTermData.explanation
                  : termData.explanation;
              } else if (currentLanguage === 'ko') {
                displayTerm = termData.term;
                displayExplanation = termData.explanation;
              }
              newHTML += `<span class="legal-term" title="${displayExplanation}">${displayTerm}</span><span class="term-explanation">(${displayExplanation})</span>`;
            } else {
              newHTML += matchedTermOriginal;
            }
            lastIndex = combinedRegex.lastIndex;
          }
          newHTML += content.substring(lastIndex);
          const spanWrapper = document.createElement('span');
          spanWrapper.innerHTML = newHTML;
          node.parentNode.replaceChild(spanWrapper, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        Array.from(node.childNodes).forEach(highlightTerms);
      }
    }
    Array.from(tempDiv.childNodes).forEach(highlightTerms);
    messageContentSpan.innerHTML = tempDiv.innerHTML;
    messageElement.appendChild(messageContentSpan);
    messageElement.appendChild(timestampSpan);
    const feedbackDiv = document.createElement('div');
    feedbackDiv.classList.add('feedback-buttons');
    feedbackDiv.innerHTML = `
          <span data-translate-key="feedbackQuestion">${getTranslation(
      'feedbackQuestion'
    )}</span>
          <button class="feedback-yes" data-feedback="yes" data-message-id="${messageId}">${getTranslation(
      'feedbackYes'
    )}</button>
          <button class="feedback-no" data-feedback="no" data-message-id="${messageId}">${getTranslation(
      'feedbackNo'
    )}</button>
        `;
    messageElement.appendChild(feedbackDiv);
    feedbackDiv.querySelector('.feedback-yes').addEventListener('click', handleFeedbackClick);
    feedbackDiv.querySelector('.feedback-no').addEventListener('click', handleFeedbackClick);
    const existingFeedback = feedbackData.find((f) => f.messageId === messageId);
    if (existingFeedback) {
      feedbackDiv.querySelectorAll('button').forEach((btn) => (btn.disabled = true));
    }
  }
  chatMessagesContainer.appendChild(messageElement);
  if (!isHistory) {
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }
}
function addMessageToChatAndHistory(messageText, sender) {
  const messageId = generateMessageId();
  const timestamp = new Date().toISOString();
  if (welcomeMessage && !welcomeMessage.classList.contains('hidden')) {
    welcomeMessage.classList.add('hidden');
  }
  addMessageToUI(messageText, sender, messageId, timestamp);
  chatHistory.push({
    id: messageId,
    text: messageText,
    sender: sender,
    timestamp: timestamp,
  });
  saveChatHistory();
}

function handleFeedbackClick(event) {
  const feedbackType = event.target.dataset.feedback;
  const messageId = event.target.dataset.messageId;
  console.log('Feedback received:', feedbackType, 'for message ID:', messageId);

  if (feedbackType === 'no') {
    document.getElementById('feedbackMessageId').value = messageId;
    openModal('feedbackModal');
  } else {
    feedbackData.push({ messageId: messageId, feedback: feedbackType, timestamp: new Date() });
    localStorage.setItem('legalBotFeedbackData', JSON.stringify(feedbackData));
    alert(getTranslation('alertFeedbackSubmitted'));
    event.target.closest('.feedback-buttons').querySelectorAll('button').forEach((btn) => (btn.disabled = true));
  }
}

function handleFeedbackSubmit(event) {
  event.preventDefault();
  const messageId = document.getElementById('feedbackMessageId').value;
  const reason = document.getElementById('feedbackReason').value;
  const comment = document.getElementById('feedbackComment').value;

  feedbackData.push({
    messageId: messageId,
    feedback: 'no',
    reason: reason,
    comment: comment,
    timestamp: new Date(),
  });
  localStorage.setItem('legalBotFeedbackData', JSON.stringify(feedbackData));

  console.log('Detailed feedback:', { messageId, reason, comment });
  alert(getTranslation('alertFeedbackSubmitted'));
  closeModal('feedbackModal');
  document.getElementById('feedbackForm').reset();

  const messageFeedbackButtons = document.querySelector(
    `.message[data-message-id="${messageId}"] .feedback-buttons`
  );
  if (messageFeedbackButtons) {
    messageFeedbackButtons.querySelectorAll('button').forEach((btn) => (btn.disabled = true));
  }
}

function processAndDisplayBotResponse(userInput, mode) {
  addMessageToChatAndHistory(userInput, 'user');
  const prefix =
    mode === 'easy'
      ? getTranslation('easyModePrefix')
      : getTranslation('defaultModePrefix');
  let botResponseText = '';

  const articleRegex = new RegExp(getTranslation('articleKeywordRegex'), 'i');
  const articleMatch = userInput.match(articleRegex);

  const termQueryRegex = new RegExp(
    `(.+?)(${getTranslation('termQuerySuffixRegex')})$`,
    'i'
  );
  const termMatch = userInput.match(termQueryRegex);

  const greetingMatch = userInput.match(
    new RegExp(`^${getTranslation('greetingKeyword')}$`, 'i')
  );

  if (greetingMatch) {
    botResponseText = getTranslation('sampleBotResponse', userInput);
  } else if (articleMatch) {
    const clauseNum = articleMatch[1];
    const contractKeywords = ['계약서', 'contract', '契約書', '合同', 'contrato'];
    let contractName = '해당 문서';
    for (const keyword of contractKeywords) {
      if (userInput.toLowerCase().includes(keyword.toLowerCase())) {
        const keywordIndex = userInput.toLowerCase().indexOf(keyword.toLowerCase());
        if (keywordIndex > 0) {
          const potentialName = userInput.substring(0, keywordIndex).trim();
          if (potentialName) {
            contractName = potentialName;
            break;
          }
        }
      }
    }

    // Simple mock for clause content - replace with actual logic
    const mockClauses = {
      ko: {
        근로계약서: {
          '1조': '이 계약은...',
          '3조': '근로시간은 주 40시간으로 한다.',
        },
        임대차계약서: {
          '5조': '임차인은 임대료를 매월 말일에 지급한다.',
        },
      },
      en: {
        'labor contract': {
          'article 1': 'This contract is...',
          'article 3': 'Working hours are 40 hours per week.',
        },
      },
    };

    const langClauses = mockClauses[currentLanguage] || mockClauses.ko;
    const contract = Object.keys(langClauses).find(
      (cn) =>
        contractName.toLowerCase().includes(cn.toLowerCase()) ||
        cn.toLowerCase().includes(contractName.toLowerCase())
    );
    const clauseKey =
      currentLanguage === 'en' ? `article ${clauseNum}` : `${clauseNum}조`;

    if (contract && langClauses[contract] && langClauses[contract][clauseKey]) {
      const clauseContent = langClauses[contract][clauseKey];
      if (mode === 'easy') {
        botResponseText = `${prefix}${getTranslation(
          'clauseResponseFormat',
          `${contract} ${clauseKey}`,
          clauseContent
        )} (쉬운 설명 추가 필요)`;
      } else {
        botResponseText = getTranslation(
          'clauseResponseFormat',
          `${contract} ${clauseKey}`,
          clauseContent
        );
      }
    } else {
      botResponseText = getTranslation('clauseNotFound', contractName, clauseKey);
    }
  } else if (termMatch) {
    const termToExplain = termMatch[1].trim();
    const termKey = termToExplain.toLowerCase();
    const termSetForCurrentLang = legalTerms[currentLanguage] || {};
    const termSetKo = legalTerms.ko || {};
    let termData;

    if (termSetForCurrentLang[termKey]) {
      termData = termSetForCurrentLang[termKey];
    } else if (termSetKo[termKey]) {
      termData = termSetKo[termKey];
    } else {
      const koKey = Object.keys(termSetKo).find(
        (k) =>
          (termSetKo[k].term && termSetKo[k].term.toLowerCase() === termKey) ||
          (termSetKo[k].en_term && termSetKo[k].en_term.toLowerCase() === termKey) ||
          (termSetKo[k].ja_term && termSetKo[k].ja_term.toLowerCase() === termKey) ||
          (termSetKo[k].zh_term && termSetKo[k].zh_term.toLowerCase() === termKey) ||
          (termSetKo[k].es_term && termSetKo[k].es_term.toLowerCase() === termKey)
      );
      if (koKey) termData = termSetKo[koKey];
    }

    if (termData) {
      let explanation = termData.explanation;
      let displayTerm = termData.term;

      if (currentLanguage === 'en' && termData.en_term) {
        displayTerm = termData.en_term;
        const enSpecificTermData = legalTerms.en[termData.en_term.toLowerCase()];
        if (enSpecificTermData) explanation = enSpecificTermData.explanation;
      } else if (currentLanguage === 'ja' && termData.ja_term) {
        displayTerm = termData.ja_term;
        const jaSpecificTermData = legalTerms.ja[termData.ja_term.toLowerCase()];
        if (jaSpecificTermData) explanation = jaSpecificTermData.explanation;
      } else if (currentLanguage === 'zh' && termData.zh_term) {
        displayTerm = termData.zh_term;
        const zhSpecificTermData = legalTerms.zh[termData.zh_term.toLowerCase()];
        if (zhSpecificTermData) explanation = zhSpecificTermData.explanation;
      } else if (currentLanguage === 'es' && termData.es_term) {
        displayTerm = termData.es_term;
        const esSpecificTermData = legalTerms.es[termData.es_term.toLowerCase()];
        if (esSpecificTermData) explanation = esSpecificTermData.explanation;
      }

      if (mode === 'easy') {
        botResponseText = `${prefix}${displayTerm}${getTranslation(
          'termDefinitionConnective'
        )} ${getTranslation(
          'sampleEasyExplanationForTerm',
          displayTerm
        )} (원래 설명: ${explanation})`;
      } else {
        botResponseText = `${prefix}${displayTerm}${getTranslation(
          'termDefinitionConnective'
        )} ${explanation}`;
      }
    } else {
      botResponseText = `${prefix}${getTranslation('sampleBotResponse', userInput)}`;
    }
  } else if (userInput.length > 100 && currentLanguage === 'ko') {
    botResponseText = getTranslation('longTextPlaceholder');
  } else if (userInput.length > 200 && currentLanguage !== 'ko') {
    botResponseText = getTranslation('longTextPlaceholder');
  } else {
    if (mode === 'easy') {
      botResponseText = `${prefix}${getTranslation('sampleEasyModeResponse', userInput)}`;
    } else {
      botResponseText = `${prefix}${getTranslation('sampleDefaultModeResponse', userInput)}`;
    }
  }

  setTimeout(() => {
    addMessageToChatAndHistory(botResponseText, 'bot');
  }, 500 + Math.random() * 500);
}
sendButton.addEventListener('click', function () {
  const userInput = chatInput.value.trim();
  if (userInput) {
    processAndDisplayBotResponse(userInput, currentInterpretationMode);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendButton.disabled = true;
  }
});

chatInput.addEventListener('keypress', function (e) {
  if (enterKeySends && e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendButton.click();
  }
});

function loadChatHistoryFromStorage() {
  if (!chatMessagesContainer) return;
  chatMessagesContainer.innerHTML = ''; // Clear existing messages

  if (chatHistory.length > 0) {
    if (welcomeMessage && !welcomeMessage.classList.contains('hidden')) {
      welcomeMessage.classList.add('hidden');
    }
    chatHistory.forEach((msg) => {
      addMessageToUI(msg.text, msg.sender, msg.id, msg.timestamp, true);
    });
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  } else {
    if (welcomeMessage) {
      welcomeMessage.classList.remove('hidden');

      // 아래 두 줄에서 오류 발생할 수 있으므로 반드시 null 체크
      const welcomeTitleEl = document.querySelector('[data-translate-key="welcomeTitle"]');
      if (welcomeTitleEl) {
        welcomeTitleEl.textContent = getTranslation('welcomeTitle');
      }

      const welcomeDescEl = document.querySelector('[data-translate-key="welcomeDesc"]');
      if (welcomeDescEl) {
        welcomeDescEl.textContent = getTranslation('welcomeDesc');
      }

      document.querySelectorAll('.example-prompt').forEach((el) => {
        if (el.childNodes.length > 0 && el.dataset.promptText) {
          el.childNodes[0].nodeValue = `"${el.dataset.promptText}"`;
        }
      });
    }
  }
}




function loadRecentChats() {
  recentChatsList.innerHTML = '';
  if (chatHistory.length > 0) {
    const uniqueUserMessages = [];
    const processedTexts = new Set();

    for (let i = chatHistory.length - 1; i >= 0; i--) {
      if (chatHistory[i].sender === 'user') {
        const firstLine = chatHistory[i].text.split('\n')[0];
        const displayText =
          firstLine.length > 30 ? firstLine.substring(0, 27) + '...' : firstLine;
        if (!processedTexts.has(displayText)) {
          uniqueUserMessages.unshift({
            id: chatHistory[i].id,
            text: displayText,
            fullText: chatHistory[i].text, // Store full text for retrieval
          });
          processedTexts.add(displayText);
        }
      }
      if (uniqueUserMessages.length >= 10) break; // Limit to 10 recent chats
    }

    uniqueUserMessages.forEach((msg) => {
      const chatItem = document.createElement('div');
      chatItem.classList.add('chat-item');
      chatItem.textContent = `${getTranslation('chatItemPrefix')}${msg.text}`;
      chatItem.title = msg.fullText; // Show full text on hover
      chatItem.addEventListener('click', () => {
        chatInput.value = msg.fullText;
        chatInput.focus();
        sendButton.disabled = false;
        chatInput.dispatchEvent(new Event('input'));
      });
      recentChatsList.appendChild(chatItem);
    });
  } else {
    const noChatsItem = document.createElement('div');
    noChatsItem.classList.add('chat-item', 'no-chats-item');
    noChatsItem.setAttribute('data-translate-key', 'noRecentChats');
    noChatsItem.textContent = getTranslation('noRecentChats');
    recentChatsList.appendChild(noChatsItem);
  }
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    themeIcon.textContent = '☀️'; // Sun icon for dark mode
    themeToggleButton.title = getTranslation('themeToggleLight');
  } else {
    document.body.classList.remove('dark-mode');
    themeIcon.textContent = '🌙'; // Moon icon for light mode
    themeToggleButton.title = getTranslation('themeToggleDark');
  }
  localStorage.setItem('legalBotTheme', theme);
  currentTheme = theme;
}

themeToggleButton.addEventListener('click', () => {
  currentTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
  applyTheme(currentTheme);
});

function setEnterKeyBehavior(enabled) {
  enterKeySends = enabled;
  localStorage.setItem('legalBotEnterKeySends', enabled);
}

enterKeyToggle.checked = enterKeySends;
enterKeyToggle.addEventListener('change', function () {
  setEnterKeyBehavior(this.checked);
});

exportChatButton.addEventListener('click', () => {
  if (chatHistory.length === 0) {
    alert('No conversation to export.');
    return;
  }
  const formattedChat = chatHistory
    .map(
      (msg) =>
        `[${formatTimestamp(msg.timestamp)}] ${msg.sender === 'user' ? 'User' : getTranslation('botName')
        }:\n${msg.text}`
    )
    .join('\n\n');
  const blob = new Blob([formattedChat], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `legalbot_chat_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
});
exportChatButton.title = getTranslation('exportChatTooltip');
clearChatButton.title = getTranslation('clearChatTooltip');

clearChatButton.addEventListener('click', () => {
  if (confirm(getTranslation('confirmClearChat'))) {
    chatHistory = [];
    saveChatHistory(); // This will also call loadRecentChats
    loadChatHistoryFromStorage(); // This will show the welcome message
    chatInput.value = '';
    sendButton.disabled = true;
    chatInput.style.height = 'auto';
    alert(getTranslation('chatCleared'));
  }
});

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Initialization on page load
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentTheme);
  applyTranslations(); // Apply translations first
  loadChatHistoryFromStorage();
  loadRecentChats();

  const defaultModeRadio = document.getElementById('defaultModeSidebar');
  const easyModeRadio = document.getElementById('easyModeSidebar');

  if (currentInterpretationMode === 'easy' && easyModeRadio) {
    easyModeRadio.checked = true;
  } else if (defaultModeRadio) {
    defaultModeRadio.checked = true;
    currentInterpretationMode = 'default'; // Ensure it's explicitly set if not 'easy'
  }
  localStorage.setItem('legalBotInterpretationMode', currentInterpretationMode);

  // Initialize sidebar menu collapsibles
  document.querySelectorAll('.sidebar .menu-header').forEach((header) => {
    const content = header.nextElementSibling;
    const icon = header.querySelector('.menu-icon');
    if (content && !content.classList.contains('active')) {
      content.style.maxHeight = '0px';
      if (icon) icon.style.transform = 'rotate(0deg)';
    } else if (content && content.classList.contains('active')) {
      content.style.maxHeight = content.scrollHeight + 'px';
      if (icon) icon.style.transform = 'rotate(180deg)';
    }
  });
  // Initialize info panel collapsibles
  document.querySelectorAll('.info-panel .collapsible-header').forEach((header) => {
    const content = header.nextElementSibling;
    const icon = header.querySelector('.toggle-icon');
    if (content && !content.classList.contains('active')) {
      content.style.maxHeight = '0px';
      if (icon) icon.style.transform = 'rotate(0deg)';
    } else if (content && content.classList.contains('active')) {
      content.style.maxHeight =
        getComputedStyle(document.documentElement)
          .getPropertyValue('--collapsible-content-max-height')
          .trim() || content.scrollHeight + 'px';
      if (icon) icon.style.transform = 'rotate(180deg)';
    }
  });
  chatInput.dispatchEvent(new Event('input'));
});

function saveMessageToStorage(message) {
  const stored = localStorage.getItem('legalBotChatHistory');
  const chatHistory = stored ? JSON.parse(stored) : [];

  if (chatHistory.length === 0 || chatHistory[chatHistory.length - 1].text !== message.text) {
    chatHistory.push(message);
    localStorage.setItem('legalBotChatHistory', JSON.stringify(chatHistory));
  }
}