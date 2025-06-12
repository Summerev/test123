import { $, $$, on } from './utils/domHelpers.js';
import { loginUser, signupUser, logoutUser, getCurrentUser, isLoggedIn } from './api/authAPI.js';
import {
    getTranslation, applyTranslations, changeLanguage,
    getCurrentInterpretationMode, setInterpretationMode,
    getEnterKeySends, setEnterKeySends
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



// --- Global State Variables (변경 없음) ---
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

// 로그인/회원가입 버튼 클릭 시 모달 열기
const loginButton = $('#login-button');
const signupButton = $('#signup-button');
const noAccountLink = $('#noAccountLink');
const alreadyAccountLink = $('#alreadyAccountLink');

if (loginButton) {
    on(loginButton, 'click', () => openModal('loginModal'));
}
if (signupButton) {
    on(signupButton, 'click', () => openModal('signupModal'));
}
if (noAccountLink) {
    on(noAccountLink, 'click', (e) => {
        e.preventDefault();
        closeModal('loginModal');
        openModal('signupModal');
    });
}
if (alreadyAccountLink) {
    on(alreadyAccountLink, 'click', (e) => {
        e.preventDefault();
        closeModal('signupModal');
        openModal('loginModal');
    });
}

// --- DOMContentLoaded Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    initThemeToggle();
    initDropdowns();
    initModals();
    initChatInputAutoResize();
    initExamplePrompts();
    initFileDragAndDrop();
    initAttachmentUI();
    restoreTabs();
    renderRecentChats(getChatSessionList());


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