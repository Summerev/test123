// static/js/main.js
import { $, $$, on } from './utils/domHelpers.js';
import { loginUser, signupUser, logoutUser, getCurrentUser, isLoggedIn } from './api/authAPI.js';
import {
    getTranslation, applyTranslations, changeLanguage,
    getCurrentInterpretationMode, setInterpretationMode,
    getEnterKeySends, setEnterKeySends, getCurrentLanguage,
} from './data/translation.js';
import {
    loadChatHistoryFromStorage,
    clearAllChats,
    getChatHistory,
    formatTimestamp,
    saveChatSessionInfo,   // ← 추가
    getChatSessionList,
} from './data/chatHistoryManager.js';
import { clearChatSessionTitles, addMessageToChatAndHistory, getChatTitle  } from './data/chatHistoryManager.js';
import { initThemeToggle } from './ui/themeToggle.js';
import { initDropdowns } from './ui/dropdowns.js';
import { initCollapsibles } from './ui/sidebarCollapsible.js';
import { initModals, openModal, closeModal } from './ui/modalManager.js';
import {
    initChatInputAutoResize,
    initExamplePrompts,

    renderRecentChats,         // ← 추가
    createNewSession,
	initChatUI,
	addMessageToUI,
	generateMessageId,
} from './ui/chatUI.js';
import { createTab, renderTabBar, restoreTabs, } from './ui/chatTabUI.js'
import { handleFeedbackClick, handleFeedbackSubmit, } from './logic/chatProcessor.js';
import { saveTabState, closeTabState, getActiveTab, setActiveTab, chatSessions, openTabs } from './state/chatTabState.js';
import { initFileUpload } from './ui/fileUpLoadUI.js';

// --- DOM Element Selections (변경 없음) ---
const chatInput = $('#chatInput');
const sendButton = $('#sendButton');
const exportChatButton = $('#exportChatBtn');
const clearChatButton = $('#clearChatBtn');
const enterKeyToggle = $('#enterKeyToggle');
const interpretationModeRadios = $$('input[name="interpretationModeSidebar"]');
const feedbackForm = $('#feedbackForm');
const recentChatsList = $('#recentChatsList');
const chatMessages = $('#chatMessages');
const welcomeMessage = $('#welcomeMessage');
const tabBar = $('#tabBar');

// 로그인/회원가입/로그아웃 관련 DOM 요소 참조
const loginForm = $('#loginForm');
const signupForm = $('#signupForm');
const noAccountLink = $('#noAccountLink');
const alreadyAccountLink = $('#alreadyAccountLink');

// Navbar 인증 관련 요소들
const navLoginButton = $('#login-button');
const navSignupButton = $('#signup-button');
const navLogoutButton = $('#logout-button');
const navUserDisplayName = $('#user-display-name');

// 로그인 유지 체크박스
const rememberMeCheckbox = $('#rememberMe'); 

// --- Core Functions ---


export function generateSessionId() {
    return 'session_' + Date.now();
}

export function handleSendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  let sessionId = getActiveTab();

  // 세션이 없으면 새로 생성
  if (!sessionId || !chatSessions[sessionId]) {
    sessionId = createNewSession();
  }

  const messageObj = {
    id: generateMessageId(),
    sender: 'user',
    text,
    timestamp: new Date().toISOString()
  };

  // 메시지 추가 및 저장
  addMessageToChatAndHistory(sessionId, messageObj);

  // 탭 제목이 '새 대화'일 경우 첫 메시지로 변경
  if (chatSessions[sessionId].length === 1) {
    const currentTitle = openTabs[sessionId]?.title || '새 대화';
    if (currentTitle === '새 대화') {
      const title = text.length > 20 ? text.slice(0, 20) + '...' : text;
      saveChatSessionInfo(sessionId, title);
      openTabs[sessionId].title = title;
      renderTabBar();
      renderRecentChats(getChatSessionList());
    }
  }

  // 입력창 초기화
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendButton.disabled = true;

  // 웰컴 메시지 숨기기
  if (welcomeMessage) welcomeMessage.classList.add('hidden');

  // 챗봇 응답
  processUserMessage(text, sessionId);
}


async function processUserMessage(text, tabId) {
    const activeTabId = tabId || getActiveTab();
    
    // CSRF 토큰을 가져오는 헬퍼 함수 (필요한 경우)
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    
    // 임시 로딩 메시지 UI에 표시 (선택사항)
    const tempMsgId = 'temp-bot-msg-' + Date.now();
    addMessageToUI('답변을 생성 중입니다...', 'bot', tempMsgId, new Date().toISOString(), false, true);
    
    try {
        let responseText;

        // 현재 탭의 문서 유형 확인
        const docType = getChatSessionInfo(activeTabId)?.docType;
        console.log(`[질문 처리] 세션: ${activeTabId}, 문서 유형: ${docType}`);
        
        if (docType === 'terms') {
            // --- '약관' 탭일 경우: 새로운 RAG 질의응답 API 호출 ---
            console.log("[RAG] '약관' 탭 질문. 새로운 /api/rag/ask/ API를 호출합니다.");

            const requestBody = {
                question: text,
                session_id: activeTabId,
                history: chatSessions[activeTabId] || []
            };

            const response = await fetch('/api/rag/ask/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(requestBody)
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || '답변 생성에 실패했습니다.');
            }
            responseText = result.answer;

        } else {
            // --- '계약서' 또는 일반 탭일 경우: 기존 로직 호출 ---
            // (현재는 목업 응답, 나중에 계약서용 API로 교체될 수 있음)
            console.log("[기존] 일반 질문으로 처리합니다.");
            
            // 기존 코드의 로직을 그대로 유지합니다.
            // 여기서는 간단한 목업으로 대체합니다. 실제 코드는 다를 수 있습니다.
            // TODO: 계약서용 API가 있다면 여기에 연결.
            responseText = `"${text}"에 대한 기본 설명입니다. 이 내용은 더 자세히 설명해드릴까요? (기존 로직)`;
            await new Promise(resolve => setTimeout(resolve, 300)); // 인공적인 딜레이
        }


        // 임시 로딩 메시지 제거
        const tempMsgElement = document.getElementById(tempMsgId);
        if (tempMsgElement) tempMsgElement.remove();

        // 봇 메시지 생성
        const botMsg = {
            id: generateMessageId(),
            sender: 'bot',
            text: responseText,
            timestamp: new Date().toISOString()
        };

        // 메시지 추가 및 저장
        addMessageToChatAndHistory(activeTabId, botMsg);

    } catch (error) {
        // 공통 에러 처리
        const tempMsgElement = document.getElementById(tempMsgId);
        if (tempMsgElement) tempMsgElement.remove();

        console.error('질문 처리 중 오류 발생:', error);
        addMessageToChatAndHistory(activeTabId, {
            id: generateMessageId(),
            sender: 'bot',
            text: `❌ 답변 생성 중 오류가 발생했습니다: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}

// --- Tab Rendering (변경 없음) ---


	document.addEventListener('DOMContentLoaded', () => {

    // 1. Initial Setup and State Loading
    applyTranslations();
    initThemeToggle();

    const defaultModeRadio = $('#defaultModeSidebar');
    const easyModeRadio = $('#easyModeSidebar');
    if (getCurrentInterpretationMode() === 'easy' && easyModeRadio) {
        easyModeRadio.checked = true;
    } else if (defaultModeRadio) {
        defaultModeRadio.checked = true;
        setInterpretationMode('default');
    }

    if (enterKeyToggle) {
        enterKeyToggle.checked = getEnterKeySends();
    }


    // 2. Initialize UI Components
    initDropdowns();
    initCollapsibles();
    initModals();
    initChatInputAutoResize();
    initExamplePrompts();

    initChatInputAutoResize();
    initFileUpload();
	initChatUI();
    // 3. Load Chat History and Recent Chats
    loadChatHistoryFromStorage();

	restoreTabs();

    renderRecentChats(getChatSessionList());
	
	document.querySelectorAll('#languageDropdown .dropdown-item').forEach((item) => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const lang = this.getAttribute('data-lang');
            changeLanguage(lang);  // translation.js에서 가져온 함수
        });
    });

    // ✅ 초기 언어 버튼 텍스트 표시
    const selectedLangSpan = document.getElementById('selectedLanguage');
    if (selectedLangSpan) {
        const langText = getTranslation(
            getCurrentLanguage() === 'ko' ? 'koreanTerm' :
            getCurrentLanguage() === 'en' ? 'englishTerm' :
            getCurrentLanguage() === 'ja' ? 'japaneseTerm' :
            getCurrentLanguage() === 'zh' ? 'chineseTerm' :
            getCurrentLanguage() === 'es' ? 'spanishTerm' : 'koreanTerm'
        );
        selectedLangSpan.textContent = `🌐 ${langText}`;
    }
	
    // -------------------------------------------------------------
    // **수정된 부분: 로그인/회원가입/로그아웃 로직 및 UI 업데이트**
    // -------------------------------------------------------------

    // 초기 페이지 로드 시 로그인 상태를 서버에서 확인하여 UI 업데이트
    updateAuthUI();

    // 로그인 버튼 클릭 이벤트 리스너 (Navbar)
    if (navLoginButton) {
        on(navLoginButton, 'click', (event) => {
            event.preventDefault();
            console.log("Navbar Login button clicked. Opening login modal.");
            openModal('loginModal'); 
        });
    }

    // 회원가입 버튼 클릭 이벤트 리스너 (Navbar)
    if (navSignupButton) {
        on(navSignupButton, 'click', (event) => {
            event.preventDefault();
            console.log("Navbar Signup button clicked. Opening signup modal.");
            openModal('signupModal'); 
        });
    }

// 로그인 폼 제출 이벤트 리스너
if (loginForm) {
	on(loginForm, 'submit', async (event) => {
		event.preventDefault();

		// 👇 이 부분도 querySelector로 변경합니다.
		const emailInput = loginForm.querySelector('input[name="email"]');
		const passwordInput = loginForm.querySelector('input[name="password"]');

		// 요소가 제대로 찾아졌는지 확인하는 방어 코드
		if (!emailInput) {
			console.error("Error: Login form email input not found with name='email'.");
			alert("이메일 입력 필드를 찾을 수 없습니다. 페이지를 새로고침해주세요.");
			return;
		}
		if (!passwordInput) {
			console.error("Error: Login form password input not found with name='password'.");
			alert("비밀번호 입력 필드를 찾을 수 없습니다. 페이지를 새로고침해주세요.");
			return;
		}

		const email = emailInput.value;
		const password = passwordInput.value;
		const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

		console.log('Attempting login with:', email, 'Remember Me:', rememberMe);
		const result = await loginUser(email, password, rememberMe);

		// 👇 이 부분이 핵심입니다! 로그인 성공 시 UI 업데이트 및 모달 닫기
		if (result.success) {
			alert(result.message); // 로그인 성공 메시지 표시
			updateAuthUI(); // UI 업데이트 함수 호출 (로그인 상태 반영)
			closeModal('loginModal'); // 로그인 모달 닫기
			loginForm.reset(); // 폼 필드 초기화 (선택 사항이지만 좋은 사용자 경험 제공)
		} else {
			alert(result.error); // 로그인 실패 메시지 표시
			console.error('로그인 실패:', result.error);
		}
	});
}

// 회원가입 폼 제출 이벤트 리스너
if (signupForm) {
    on(signupForm, 'submit', async (event) => {
        event.preventDefault();

        // 👇 이 부분을 수정합니다. (signupForm.elements 대신 querySelector 사용)
        const nameInput = signupForm.querySelector('input[name="name"]');
        const emailInput = signupForm.querySelector('input[name="email"]');
        const passwordInput = signupForm.querySelector('input[name="password"]');
        const confirmPasswordInput = signupForm.querySelector('input[name="confirmPassword"]');

        // 요소가 제대로 찾아졌는지 확인하는 방어 코드 (매우 중요)
        if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
            console.error("Error: One or more signup form input fields not found.");
            alert("회원가입 폼 필드를 찾을 수 없습니다. 페이지를 새로고침해주세요.");
            return; // 함수 실행 중단
        }

        const name = nameInput.value;
        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        console.log('Attempting signup with:', name, email);
        const result = await signupUser(name, email, password, confirmPassword);

        if (result.success) {
            alert(result.message);
            updateAuthUI();
            closeModal('signupModal');
            signupForm.reset();
        } else {
            alert(result.error);
            console.error('회원가입 실패:', result.error);
        }
    });
}

    // 모달 전환 링크 이벤트 리스너 (로그인 -> 회원가입)
    if (noAccountLink) {
        on(noAccountLink, 'click', (e) => {
            e.preventDefault();
            closeModal('loginModal'); 
            openModal('signupModal'); 
        });
    }

    // 모달 전환 링크 이벤트 리스너 (회원가입 -> 로그인)
    if (alreadyAccountLink) {
        on(alreadyAccountLink, 'click', (e) => {
            e.preventDefault();
            closeModal('signupModal'); 
            openModal('loginModal'); 
        });
    }

    /**
     * 서버에 로그인 상태를 질의하여 UI를 업데이트하는 함수
     */
    async function updateAuthUI() {
        try {
            // 서버에 로그인 상태를 문의하는 API 호출
            const response = await fetch('/accounts/check_login_status/');
            const data = await response.json();

            if (data.is_authenticated) {
                // 로그인 상태
                if (navLoginButton) navLoginButton.style.display = 'none';
                if (navSignupButton) navSignupButton.style.display = 'none';
                if (navLogoutButton) navLogoutButton.style.display = 'block'; 
                if (navUserDisplayName && data.user) { // 서버에서 user 정보도 같이 받아옴
                    navUserDisplayName.textContent = `${data.user.name}님`; 
                    navUserDisplayName.style.display = 'inline-block';
                }
                // 로그인 모달이 열려있다면 닫기 (자동 로그인 상태일 경우)
                const loginModalElem = $('#loginModal');
                if (loginModalElem && loginModalElem.style.display === 'block') {
                    closeModal('loginModal');
                }

            } else {
                // 로그아웃 상태
                if (navLoginButton) navLoginButton.style.display = 'block';
                if (navSignupButton) navSignupButton.style.display = 'block';
                if (navLogoutButton) navLogoutButton.style.display = 'none';
                if (navUserDisplayName) {
                    navUserDisplayName.style.display = 'none';
                    navUserDisplayName.textContent = '';
                }
            }
        } catch (error) {
            console.error('로그인 상태 확인 실패:', error);
            // 네트워크 오류 등으로 서버와 통신 실패 시 로그아웃 상태로 처리
            if (navLoginButton) navLoginButton.style.display = 'block';
            if (navSignupButton) navSignupButton.style.display = 'block';
            if (navLogoutButton) navLogoutButton.style.display = 'none';
            if (navUserDisplayName) {
                navUserDisplayName.style.display = 'none';
                navUserDisplayName.textContent = '';
            }
        }
    }

    // 로그아웃 버튼 이벤트 리스너
    if (navLogoutButton) {
        on(navLogoutButton, 'click', async (event) => {
            event.preventDefault();
            const result = await logoutUser();
            if (result.success) {
                alert(result.message);
                updateAuthUI(); // 로그아웃 후 UI 업데이트
            } else {
                // 서버에서 '세션 만료' 등의 에러를 반환했을 경우
                alert(result.error); 
                console.error('로그아웃 실패:', result.error);
                updateAuthUI(); // 혹시라도 서버와의 상태가 다를 수 있으니 UI 강제 업데이트
            }
        });
    }

    // -------------------------------------------------------------
    // 4. Connect Main Event Listeners (기존 코드 유지)
    // -------------------------------------------------------------

    // ─── 새 대화 버튼 클릭 시 사이드바에만 추가 ───

    const newTabButton = $('#newTabButton');
    if (newTabButton) {
        on(newTabButton, 'click', () => {
            const sessionId = createNewSession();
            console.log('새 대화 버튼 클릭 - 세션 생성:', sessionId);
        });
    }

	// 초기 로드 시 활성 탭이 없으면 웰컴 메시지 표시
    const activeTabId = getActiveTab();
    if (!activeTabId || !chatSessions[activeTabId] || chatSessions[activeTabId].length === 0) {
        if (chatMessages && welcomeMessage) {
            chatMessages.innerHTML = '';
            welcomeMessage.classList.remove('hidden');
            chatMessages.appendChild(welcomeMessage);
            if (sendButton) sendButton.disabled = false;
        }
    }

    const usageTipsBtn = document.querySelector('button[data-translate-key="usageTips"]');
    const supportDocsBtn = document.querySelector('button[data-translate-key="supportDocs"]');
    const precautionsBtn = document.querySelector('button[data-translate-key="precautions"]');


    if (usageTipsBtn) on(usageTipsBtn, 'click', () => openModal('usageTipsModal'));
    if (supportDocsBtn) on(supportDocsBtn, 'click', () => openModal('supportDocsModal'));
    if (precautionsBtn) on(precautionsBtn, 'click', () => openModal('precautionsModal'));

    if (sendButton) on(sendButton, 'click', handleSendMessage);

    if (chatInput) {
        on(chatInput, 'keypress', (e) => {
            if (getEnterKeySends() && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendButton.click();
            }
        });
    }

    if (exportChatButton) {
    on(exportChatButton, 'click', () => {
        const currentTabId = getActiveTab(); // ✅ 최신 상태 보장
        const history = chatSessions[currentTabId] || [];

        if (history.length === 0) {
            alert(getTranslation('noRecentChats'));
            return;
        }

        const formattedChat = history.map(msg =>
            `[${formatTimestamp(msg.timestamp)}] ${msg.sender === 'user' ? 'User' : getTranslation('botName')}:\n${msg.text}`
        ).join('\n\n');

        const blob = new Blob([formattedChat], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `legalbot_chat_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });
}

    // 모든 대화 삭제 버튼 (공통)
    if (clearChatButton) {
        on(clearChatButton, 'click', () => {
            if (confirm(getTranslation('confirmClearAllChats'))) {
                chatSessions = {};
                openTabs = {};
                setActiveTab(null);
                saveTabState();
                tabBar.innerHTML = '';
                chatMessages.innerHTML = '';
                welcomeMessage.classList.remove('hidden');
                chatMessages.appendChild(welcomeMessage);
                sendButton.disabled = false;

                // 세션 타이틀 초기화 및 사이드바 목록 갱신
                clearChatSessionTitles();
                renderRecentChats(getChatSessionList());
            }
        });
    }

    interpretationModeRadios.forEach(radio => {
        on(radio, 'change', function () {
            if (this.checked) setInterpretationMode(this.value);
        });
    });

    if (enterKeyToggle) {
        on(enterKeyToggle, 'change', function () {
            setEnterKeySends(this.checked);
        });
    }

    if (feedbackForm) {
        on(feedbackForm, 'submit', handleFeedbackSubmit);
    }

    on($('#chatMessages'), 'click', (e) => {
        const target = e.target;
        if (target.classList.contains('feedback-yes')) {
            handleFeedbackClick(e);
        } else if (target.classList.contains('feedback-no')) {
            openModal('feedbackModal');
        }
    });


    on(recentChatsList, 'click', (e) => {
        const chatItem = e.target.closest('.chat-item');
        if (chatItem && !chatItem.classList.contains('no-chats-item')) {
            const fullText = chatItem.title;
            chatInput.value = fullText;
            chatInput.focus();
            sendButton.disabled = false;
            chatInput.dispatchEvent(new Event('input'));
        }
    });
});
