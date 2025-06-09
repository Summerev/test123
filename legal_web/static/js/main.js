// static/js/main.js

// Import utilities
import { $, $$, on } from './utils/domHelpers.js';

// **authAPI.js 임포트 추가**
import { loginUser, signupUser, logoutUser, getCurrentUser, isLoggedIn } from './api/authAPI.js'; 

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

// **로그인/회원가입/로그아웃 관련 DOM 요소 참조 추가**
const loginForm = $('#loginForm'); // login.html의 폼 ID
const signupForm = $('#signupForm'); // signup.html의 폼 ID
// const loginModal = $('#loginModal'); // 더 이상 직접적인 DOM 요소 참조는 불필요 - ID 문자열로 직접 사용
// const signupModal = $('#signupModal'); // 더 이상 직접적인 DOM 요소 참조는 불필요 - ID 문자열로 직접 사용
const noAccountLink = $('#noAccountLink'); // login.html의 회원가입 링크 ID
const alreadyAccountLink = $('#alreadyAccountLink'); // signup.html의 로그인 링크 ID

// **Navbar 인증 관련 요소들** (navbar.html에 ID를 부여해야 합니다!)
const navLoginButton = $('#login-button');      // 내비게이션 바의 '로그인' 버튼
const navSignupButton = $('#signup-button');    // 내비게이션 바의 '회원가입' 버튼
const navLogoutButton = $('#logout-button');    // 내비게이션 바의 '로그아웃' 버튼 (새로 추가)
const navUserDisplayName = $('#user-display-name'); // 내비게이션 바의 사용자 이름 표시 요소 (새로 추가)


document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Setup and State Loading
    applyTranslations(); // Apply UI text translations first
    initThemeToggle(); // Initialize theme toggle and apply saved theme

    // Initialize interpretation mode radio buttons based on saved state
    const defaultModeRadio = $('#defaultModeSidebar');
    const easyModeRadio = $('#easyModeSidebar');
    if (getCurrentInterpretationMode() === 'easy' && easyModeRadio) {
        easyModeRadio.checked = true;
    } else if (defaultModeRadio) {
        defaultModeRadio.checked = true;
        setInterpretationMode('default'); // Ensure default mode is explicitly set if no 'easy' preference
    }

    // Initialize Enter key send setting
    if (enterKeyToggle) {
        enterKeyToggle.checked = getEnterKeySends();
    }

    // 2. Initialize UI Components
    initDropdowns();
    initCollapsibles();
    initModals(); // Initialize modal-related event listeners
    initChatInputAutoResize(); // Auto-resize chat input field
    initExamplePrompts(); // Example prompt click events

    // 3. Load Chat History and Recent Chats
    loadChatHistoryFromStorage(); // Load and display chat messages
    loadRecentChats(); // Load recent chat titles in sidebar

    // -------------------------------------------------------------
    // **새로 추가/수정된 부분: 로그인/회원가입/로그아웃 로직 및 UI 업데이트**
    // -------------------------------------------------------------

    // 로그인 버튼 클릭 이벤트 리스너 (Navbar)
    if (navLoginButton) {
        on(navLoginButton, 'click', (event) => {
            event.preventDefault(); // 기본 링크 동작 방지
            console.log("Navbar Login button clicked. Opening login modal.");
            // 오류 수정: 모달의 ID 문자열을 직접 전달
            openModal('loginModal'); 
        });
    }

    // 회원가입 버튼 클릭 이벤트 리스너 (Navbar)
    if (navSignupButton) {
        on(navSignupButton, 'click', (event) => {
            event.preventDefault(); // 기본 링크 동작 방지
            console.log("Navbar Signup button clicked. Opening signup modal.");
            // 오류 수정: 모달의 ID 문자열을 직접 전달
            openModal('signupModal'); 
        });
    }

    // 로그인 폼 제출 이벤트 리스너
    if (loginForm) {
        on(loginForm, 'submit', async (event) => {
            event.preventDefault();
            const email = loginForm.elements.email.value;
            const password = loginForm.elements.password.value;

            console.log('Attempting login with:', email); // 디버깅 로그 추가
            const result = await loginUser(email, password);

            if (result.success) {
                alert(result.message);
                // 로그인 성공 시 UI 업데이트 후 모달 닫기
                updateAuthUI(); 
                // 오류 수정: 모달의 ID 문자열을 직접 전달
                closeModal('loginModal'); 
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
            const password = signupForm.elements.password.value;
            // HTML 폼의 필드 이름이 'confirm_password'인지 'confirmPassword'인지 확인하세요.
            // 여기서는 'confirmPassword'로 가정합니다.
            const confirmPassword = signupForm.elements.confirmPassword.value; 

            console.log('Attempting signup with:', name, email); // 디버깅 로그 추가
            const result = await signupUser(name, email, password, confirmPassword);

            if (result.success) {
                alert(result.message);
                // 회원가입 성공 시 UI 업데이트 후 모달 닫기
                updateAuthUI(); 
                // 오류 수정: 모달의 ID 문자열을 직접 전달
                closeModal('signupModal'); 
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
            // 오류 수정: 모달의 ID 문자열을 직접 전달
            closeModal('loginModal'); 
            // 오류 수정: 모달의 ID 문자열을 직접 전달
            openModal('signupModal'); 
        });
    }

    // 모달 전환 링크 이벤트 리스너 (회원가입 -> 로그인)
    if (alreadyAccountLink) {
        on(alreadyAccountLink, 'click', (e) => {
            e.preventDefault();
            // 오류 수정: 모달의 ID 문자열을 직접 전달
            closeModal('signupModal'); 
            // 오류 수정: 모달의 ID 문자열을 직접 전달
            openModal('loginModal'); 
        });
    }

    // 초기 페이지 로드 시 및 로그인/로그아웃 성공 시 UI 업데이트 함수
    function updateAuthUI() {
        const currentUser = getCurrentUser(); // authAPI.js의 getCurrentUser 호출

        if (isLoggedIn()) {
            // 로그인 상태: 로그인/회원가입 버튼 숨기고, 로그아웃 버튼과 사용자 이름 표시
            if (navLoginButton) navLoginButton.style.display = 'none';
            if (navSignupButton) navSignupButton.style.display = 'none';
            if (navLogoutButton) navLogoutButton.style.display = 'block'; // 로그아웃 버튼을 보이게
            if (navUserDisplayName && currentUser) {
                navUserDisplayName.textContent = `${currentUser.name}님`; // 사용자 이름 표시
                navUserDisplayName.style.display = 'inline-block';
            }
        } else {
            // 로그아웃 상태: 로그인/회원가입 버튼 보이고, 로그아웃 버튼과 사용자 이름 숨김
            if (navLoginButton) navLoginButton.style.display = 'block';
            if (navSignupButton) navSignupButton.style.display = 'block';
            if (navLogoutButton) navLogoutButton.style.display = 'none';
            if (navUserDisplayName) {
                navUserDisplayName.style.display = 'none';
                navUserDisplayName.textContent = '';
            }
        }
    }

    updateAuthUI(); // DOMContentLoaded 시점에 UI 업데이트 함수 호출

    // 로그아웃 버튼 이벤트 리스너 (navbar.html에 로그아웃 버튼이 추가되면 활성화)
    if (navLogoutButton) {
        on(navLogoutButton, 'click', async (event) => {
            event.preventDefault();
            const result = await logoutUser();
            if (result.success) {
                alert(result.message);
                updateAuthUI(); // 로그아웃 후 UI 업데이트
                // 페이지 새로고침은 선택 사항입니다.
                // window.location.reload(); 
            } else {
                alert(result.error);
            }
        });
    }

    // -------------------------------------------------------------
    // 4. Connect Main Event Listeners (기존 코드)
    // -------------------------------------------------------------

    // Chat input and send functionality
    if (sendButton) {
        on(sendButton, 'click', () => {
            if (chatInput && chatInput.value.trim()) {
                processUserMessage(chatInput.value.trim());
                chatInput.value = ''; // Clear input
                chatInput.style.height = 'auto'; // Reset height
                sendButton.disabled = true; // Disable button
            }
        });
    }

    if (chatInput) {
        on(chatInput, 'keypress', (e) => {
            if (getEnterKeySends() && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent newline
                sendButton.click(); // Trigger send button click
            }
        });
    }

    // Sidebar "Export Conversation" button
    if (exportChatButton) {
        on(exportChatButton, 'click', () => {
            if (getChatHistory().length === 0) {
                alert(getTranslation('noRecentChats')); // Use custom modal instead of alert
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

    // Sidebar "Clear All Chats" button
    if (clearChatButton) {
        on(clearChatButton, 'click', clearAllChats);
        clearChatButton.title = getTranslation('clearChatTooltip');
    }

    // Interpretation mode radio buttons change event
    interpretationModeRadios.forEach((radio) => {
        on(radio, 'change', function () {
            if (this.checked) {
                setInterpretationMode(this.value);
            }
        });
    });

    // Enter key send toggle switch change event
    if (enterKeyToggle) {
        on(enterKeyToggle, 'change', function () {
            setEnterKeySends(this.checked);
        }
        );
    }

    // Feedback buttons (👍/👎) event delegation on chat messages container
    on($('#chatMessages'), 'click', (e) => {
        if (e.target.classList.contains('feedback-yes') || e.target.classList.contains('feedback-no')) {
            handleFeedbackClick(e);
        }
    });

    // Feedback form submission
    if (feedbackForm) {
        on(feedbackForm, 'submit', handleFeedbackSubmit);
    }

    // Custom event listener for language change (dispatched from dropdowns.js)
    on(document, 'languageChanged', (e) => {
        changeLanguage(e.detail.lang); // Update language state and apply translations
        loadChatHistoryFromStorage(); // Reload chat messages to apply new language
        loadRecentChats(); // Reload recent chats list to apply new language
    });

    // Event delegation for recent chat items click (to load specific chat)
    on(recentChatsList, 'click', (e) => {
        const chatItem = e.target.closest('.chat-item');
        if (chatItem && !chatItem.classList.contains('no-chats-item')) {
            const fullText = chatItem.title; // Get full text from title attribute
            if (chatInput) {
                chatInput.value = fullText;
                chatInput.focus();
                sendButton.disabled = false;
                chatInput.dispatchEvent(new Event('input')); // Trigger input event for auto-resize
            }
            // In a real app, you would load the full conversation history for this chatId
            // const chatId = chatItem.dataset.chatId;
            // alert(`Chat ID: ${chatId} load functionality needs to be implemented.`);
            // loadSpecificChat(chatId);
        }
    });
});