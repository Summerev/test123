// static/js/main.js

// Import utilities
import { $, $$, on } from './utils/domHelpers.js';

// **authAPI.js 임포트 수정 (getCurrentUser, isLoggedIn 제거)**
// authAPI.js에서 더 이상 로컬 스토리지를 사용하지 않도록 수정되었다고 가정합니다.
// 이제 loginUser, signupUser, logoutUser만 필요합니다.
import { loginUser, signupUser, logoutUser } from './api/authAPI.js'; 

// Import data management modules
import {
    getTranslation,
    applyTranslations,
    changeLanguage,
    getCurrentInterpretationMode,
    setInterpretationMode,
    getEnterKeySends,
    setEnterKeySends,
    getCurrentTheme
} from './data/translation.js';
import { loadRecentChats, loadChatHistoryFromStorage, clearAllChats, getChatHistory, formatTimestamp } from './data/chatHistoryManager.js';

// Import UI component initialization modules
import { initThemeToggle } from './ui/themeToggle.js';
import { initDropdowns } from './ui/dropdowns.js';
import { initCollapsibles } from './ui/sidebarCollapsible.js';
import { initModals, openModal, closeModal } from './ui/modalManager.js'; // closeModal도 함께 사용 가능하도록 임포트 확인
import { initChatInputAutoResize, initExamplePrompts } from './ui/chatUI.js';

// Import core logic modules
import { processUserMessage, handleFeedbackClick, handleFeedbackSubmit } from './logic/chatProcessor.js';


// DOM element references
const chatInput = $('#chatInput');
const sendButton = $('#sendButton');
const exportChatButton = $('#exportChatBtn');
const clearChatButton = $('#clearChatBtn');
const enterKeyToggle = $('#enterKeyToggle');
const interpretationModeRadios = $$('input[name="interpretationModeSidebar"]');
const feedbackForm = $('#feedbackForm');
const recentChatsList = $('#recentChatsList');

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

    // 3. Load Chat History and Recent Chats
    loadChatHistoryFromStorage();
    loadRecentChats();

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
            const email = loginForm.elements.email.value;
            const password = loginForm.elements.password.value;
            const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false; 

            console.log('Attempting login with:', email, 'Remember Me:', rememberMe);
            const result = await loginUser(email, password, rememberMe); 

            if (result.success) {
                alert(result.message);
                // 로그인 성공 시 UI 업데이트 (서버에서 최신 상태 가져옴)
                updateAuthUI(); 
                closeModal('loginModal');
                // 로그인 폼 필드 초기화
                loginForm.reset(); 
            } else {
                alert(result.error);
                console.error('로그인 실패:', result.error);
            }
        });
    }

    // 회원가입 폼 제출 이벤트 리스너
    if (signupForm) {
        on(signupForm, 'submit', async (event) => {
            event.preventDefault();
            const name = signupForm.elements.name.value;
            const email = signupForm.elements.email.value;
            const password = signupForm.elements.password1.value; // password1로 변경됨
            const confirmPassword = signupForm.elements.password2.value; // password2로 변경됨

            console.log('Attempting signup with:', name, email);
            const result = await signupUser(name, email, password, confirmPassword);

            if (result.success) {
                alert(result.message);
                // 회원가입 성공 시 UI 업데이트 (서버에서 최신 상태 가져옴)
                updateAuthUI(); 
                closeModal('signupModal'); 
                // 회원가입 폼 필드 초기화
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

    if (sendButton) {
        on(sendButton, 'click', () => {
            if (chatInput && chatInput.value.trim()) {
                processUserMessage(chatInput.value.trim());
                chatInput.value = '';
                chatInput.style.height = 'auto';
                sendButton.disabled = true;
            }
        });
    }

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
            if (getChatHistory().length === 0) {
                alert(getTranslation('noRecentChats'));
                return;
            }
            const formattedChat = getChatHistory()
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
    }

    if (clearChatButton) {
        on(clearChatButton, 'click', clearAllChats);
        clearChatButton.title = getTranslation('clearChatTooltip');
    }

    interpretationModeRadios.forEach((radio) => {
        on(radio, 'change', function () {
            if (this.checked) {
                setInterpretationMode(this.value);
            }
        });
    });

    if (enterKeyToggle) {
        on(enterKeyToggle, 'change', function () {
            setEnterKeySends(this.checked);
        });
    }

    on($('#chatMessages'), 'click', (e) => {
        if (e.target.classList.contains('feedback-yes') || e.target.classList.contains('feedback-no')) {
            handleFeedbackClick(e);
        }
    });

    if (feedbackForm) {
        on(feedbackForm, 'submit', handleFeedbackSubmit);
    }

    on(document, 'languageChanged', (e) => {
        changeLanguage(e.detail.lang);
        loadChatHistoryFromStorage();
        loadRecentChats();
    });

    on(recentChatsList, 'click', (e) => {
        const chatItem = e.target.closest('.chat-item');
        if (chatItem && !chatItem.classList.contains('no-chats-item')) {
            const fullText = chatItem.title;
            if (chatInput) {
                chatInput.value = fullText;
                chatInput.focus();
                sendButton.disabled = false;
                chatInput.dispatchEvent(new Event('input'));
            }
        }
    });
});