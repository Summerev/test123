// static/js/main.js
import { $, $$, on } from './utils/domHelpers.js';
import { loginUser, signupUser, logoutUser, getCurrentUser, isLoggedIn } from './api/authAPI.js';
import {
    getTranslation, applyTranslations, changeLanguage,
    getCurrentInterpretationMode, setInterpretationMode,
    getEnterKeySends, setEnterKeySends, getCurrentLanguage,
} from './data/translation.js';
import {
    loadRecentChats,
    loadChatHistoryFromStorage,
    clearAllChats,
    getChatHistory,
    formatTimestamp,
    saveChatHistoryWithTitle,   // ← 추가
    getChatSessionList,
} from './data/chatHistoryManager.js';
import { clearChatSessionTitles } from './data/chatHistoryManager.js';
import { initThemeToggle } from './ui/themeToggle.js';
import { initDropdowns } from './ui/dropdowns.js';
import { initCollapsibles } from './ui/sidebarCollapsible.js';
import { initModals, openModal, closeModal } from './ui/modalManager.js';
import {
    initChatInputAutoResize,
    initExamplePrompts,
    initFileDragAndDrop,
    initAttachmentUI,
    renderRecentChats,         // ← 추가

} from './ui/chatUI.js';
import { handleFeedbackClick, handleFeedbackSubmit } from './logic/chatProcessor.js';

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

let openTabs = JSON.parse(localStorage.getItem('open_tabs')) || [];
let activeTab = localStorage.getItem('active_tab') || null;
let chatSessions = JSON.parse(localStorage.getItem('chat_sessions')) || {};

// --- Core Functions ---
function saveTabState() {
    localStorage.setItem('open_tabs', JSON.stringify(openTabs));
    localStorage.setItem('active_tab', activeTab);
    localStorage.setItem('chat_sessions', JSON.stringify(chatSessions));
}

function generateSessionId() {
    return 'session_' + Date.now();
}

/**
 * 메시지를 UI에 추가하고, 봇 메시지에는 피드백 버튼을 추가합니다.
 * @param {object} msg - 메시지 객체 { sender: 'user'|'bot', text: string, timestamp: string }
 */
function addMessageToUI(msg) {
    const div = document.createElement('div');
    div.classList.add('chat-message', msg.sender === 'user' ? 'user-message' : 'bot-message');

    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');

    bubble.innerHTML = `
        <div class="message-text">${msg.text}</div>
        <div class="message-time">${formatTimestamp(msg.timestamp)}</div>
    `;

    // 봇 메시지일 경우 피드백 버튼 추가
    if (msg.sender === 'bot') {
        const feedbackDiv = document.createElement('div');
        feedbackDiv.classList.add('feedback-buttons');
        feedbackDiv.innerHTML = `
            <span class="feedback-yes" title="도움이 되었어요">👍</span>
            <span class="feedback-no" title="도움이 안 되었어요">👎</span>
        `;
        bubble.appendChild(feedbackDiv);
    }

    div.appendChild(bubble);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


function createTab(sessionId, title, shouldSwitch = true, skipPush = false) {
    // 1) 중복 탭 방지
    if ([...tabBar.children].some(tab => tab.dataset.sessionId === sessionId)) return;

    // 2) DOM으로 탭 요소 생성
    const tab = document.createElement('div');
    tab.classList.add('chat-tab');
    tab.dataset.sessionId = sessionId;
    tab.dataset.sessionTitle = title;

    const titleSpan = document.createElement('span');
    titleSpan.classList.add('tab-title');
    titleSpan.textContent = title.length > 12 ? title.slice(0, 12) + '...' : title;

    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.classList.add('close-tab');
    closeBtn.onclick = e => { e.stopPropagation(); closeTab(sessionId); };

    tab.onclick = () => switchTab(sessionId);
    tab.appendChild(titleSpan);
    tab.appendChild(closeBtn);
    tabBar.appendChild(tab);

    // 3) 자동 전환
    if (shouldSwitch) {
        tabBar.scrollLeft = tabBar.scrollWidth;
        activeTab = sessionId;
        switchTab(sessionId);
    }

    // 4) 상태 저장 후 렌더링 및 스크롤 조정
    if (!skipPush) {
        openTabs.push({ id: sessionId, title });
        saveTabState();
        renderTabs();   // ← 여기에만 있어야 함
    }
}



function switchTab(sessionId) {
    activeTab = sessionId;
    localStorage.setItem('active_tab', sessionId);

    [...tabBar.children].forEach(tab => {
        tab.classList.toggle('active', tab.dataset.sessionId === sessionId);
    });

    const messages = chatSessions[sessionId] || [];
    chatMessages.innerHTML = '';
    if (messages.length === 0) {
        welcomeMessage.classList.remove('hidden');
        chatMessages.appendChild(welcomeMessage);
        sendButton.disabled = false;
    } else {
        welcomeMessage.classList.add('hidden');
        messages.forEach(msg => addMessageToUI(msg));
    }
}

function closeTab(sessionId) {
    openTabs = openTabs.filter(t => t.id !== sessionId);
    delete chatSessions[sessionId];

    if (activeTab === sessionId) {
        activeTab = openTabs.length > 0 ? openTabs[0].id : null;
    }

    saveTabState();
    renderTabs();

    if (activeTab) {
        switchTab(activeTab);
    } else {
        chatMessages.innerHTML = '';
        welcomeMessage.classList.remove('hidden');
    }
}

function updateTabTitle(sessionId, newTitle) {
    const tab = [...tabBar.children].find(t => t.dataset.sessionId === sessionId);
    if (tab) {
        const titleSpan = tab.querySelector('.tab-title');
        if (titleSpan) {
            titleSpan.textContent = newTitle.length > 12 ? newTitle.slice(0, 12) + '...' : newTitle;
        }
        tab.dataset.sessionTitle = newTitle;
    }

    const tabIndex = openTabs.findIndex(t => t.id === sessionId);
    if (tabIndex !== -1) {
        openTabs[tabIndex].title = newTitle;
        saveTabState();
    }
}

function handleSendMessage() {
    // 1) 입력값 가져오기
    const text = chatInput.value.trim();
    if (!text) return;

    // 2) 활성 세션이 없으면 새 세션 생성 & 사이드바 목록 갱신
    if (!activeTab || !chatSessions[activeTab]) {
        const sessionId = generateSessionId();
        chatSessions[sessionId] = [];
        saveChatHistoryWithTitle(sessionId, '새 대화');
        renderRecentChats(getChatSessionList());
        activeTab = sessionId;
    }

    // 3) 사용자 메시지 객체 생성 & UI 추가
    const userMsg = {
        sender: 'user',
        text,
        timestamp: new Date().toISOString()
    };
    chatSessions[activeTab].push(userMsg);
    addMessageToUI(userMsg);
    saveTabState();

    // 4) 첫 메시지이면 탭 제목 업데이트
    if (chatSessions[activeTab].length === 1) {
        // 1) 세션 타이틀 저장소에 반영
        saveChatHistoryWithTitle(activeTab, text);
        // 2) 사이드바 목록 다시 그리기
        renderRecentChats(getChatSessionList());
        // 3) 탭 UI 타이틀도 업데이트
        updateTabTitle(activeTab, text);
    }

    // 5) 입력창 초기화
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendButton.disabled = true;
    welcomeMessage.classList.add('hidden');

    // 6) 봇 응답 처리
    processUserMessage(text);
}


async function processUserMessage(text) {
    const responseText = `"${text}"에 대한 기본 설명입니다.`;
    const msg = {
        sender: 'bot',
        text: responseText,
        timestamp: new Date().toISOString()
    };
    chatSessions[activeTab].push(msg);
    saveTabState();
    addMessageToUI(msg);
}

// --- Tab Rendering (변경 없음) ---
function renderTabs() {
    if (!tabBar) return;
    tabBar.innerHTML = '';

    openTabs.forEach(t => createTab(t.id, t.title, false, true));

    requestAnimationFrame(() => {
        const children = tabBar.children;
        const total = children.length;
        const visible = Math.min(total, 10);

        // 10개 이하일 땐 고정 해제
        if (total <= 10) {
            tabBar.style.width = '';
            return;
        }

        // 첫 10개 탭 너비 합산
        let sum = 0;
        for (let i = 0; i < visible; i++) {
            const tab = children[i];
            if (tab && tab.getBoundingClientRect) {
                sum += tab.getBoundingClientRect().width;
            }
        }
        // 탭 사이 gap(6px) 추가
        sum += (visible - 1) * 6;

        // ★ 여기서 width만 설정
        tabBar.style.width = sum + 'px';
    });
}

function restoreTabs() {
    if (openTabs.length > 0) {
        renderTabs();
        if (activeTab) {
            switchTab(activeTab);
        }
    }
}




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
    initFileDragAndDrop();
    initChatInputAutoResize();
    initAttachmentUI();
    restoreTabs();

    // 3. Load Chat History and Recent Chats
    loadChatHistoryFromStorage();
    loadRecentChats();
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
            const sessionId = generateSessionId();
            // ① 새 세션 메시지 배열 초기화
            chatSessions[sessionId] = [];
            // ② activeTab 세팅
            activeTab = sessionId;
            // ③ 세션 타이틀 저장소에 등록
            saveChatHistoryWithTitle(sessionId, '새 대화');
            // ④ 사이드바 목록 갱신
            renderRecentChats(getChatSessionList());
            // ⑤ 바로 해당 세션으로 전환 (UI)
            switchTab(sessionId);
        });
    }
    // … 나머

    if (!activeTab) {
        chatMessages.innerHTML = '';
        welcomeMessage.classList.remove('hidden');
        chatMessages.appendChild(welcomeMessage);
        sendButton.disabled = false;
    }
    // …이하 기존 핸들러…


    if (!activeTab) {
        chatMessages.innerHTML = '';
        welcomeMessage.classList.remove('hidden');
        chatMessages.appendChild(welcomeMessage);
        sendButton.disabled = false;
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
            const history = chatSessions[activeTab] || [];
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
                openTabs = [];
                activeTab = null;
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

// 다른 모듈(chatUI.js)에서 필요로 하는 것들까지 함께 export
export {
    switchTab,
    createTab,
    openTabs
};