import { $, $$, on } from './utils/domHelpers.js';
import { loginUser, signupUser, logoutUser, getCurrentUser, isLoggedIn } from './api/authAPI.js';
import {
    getTranslation, applyTranslations, changeLanguage,
    getCurrentInterpretationMode, setInterpretationMode,
    getEnterKeySends, setEnterKeySends
} from './data/translation.js';
import {
    loadRecentChats, loadChatHistoryFromStorage,
    clearAllChats, getChatHistory, formatTimestamp
} from './data/chatHistoryManager.js';
import { initThemeToggle } from './ui/themeToggle.js';
import { initDropdowns } from './ui/dropdowns.js';
import { initCollapsibles } from './ui/sidebarCollapsible.js';
import { initModals, openModal, closeModal } from './ui/modalManager.js';
import { initChatInputAutoResize, initExamplePrompts } from './ui/chatUI.js';
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


/**
 * 새로운 탭을 생성합니다. (변경 없음)
 */
function createTab(sessionId, title, shouldSwitch = true, skipPush = false) {
    if ([...tabBar.children].some(tab => tab.dataset.sessionId === sessionId)) return;

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
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        closeTab(sessionId);
    };

    tab.onclick = () => switchTab(sessionId);
    tab.appendChild(titleSpan);
    tab.appendChild(closeBtn);
    tabBar.appendChild(tab);

    if (shouldSwitch) {
        tabBar.scrollLeft = tabBar.scrollWidth;
        activeTab = sessionId;
        switchTab(sessionId);
    }

    if (!skipPush) {
        openTabs.push({ id: sessionId, title });
        saveTabState();
    }
}

/**
 * 지정된 ID의 탭으로 전환합니다. (변경 없음)
 */
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
    } else {
        welcomeMessage.classList.add('hidden');
        messages.forEach(msg => addMessageToUI(msg));
    }
}

/**
 * 탭을 닫습니다. (변경 없음)
 */
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

/**
 * 탭의 제목을 업데이트합니다. (변경 없음)
 */
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

// --- Message Handling (변경 없음) ---
function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    if (!activeTab) {
        const sessionId = generateSessionId();
        chatSessions[sessionId] = [];
        createTab(sessionId, '새 대화');
        activeTab = sessionId;
    }

    const userMsg = {
        sender: 'user',
        text,
        timestamp: new Date().toISOString()
    };
    chatSessions[activeTab].push(userMsg);
    addMessageToUI(userMsg);
    saveTabState();

    if (chatSessions[activeTab].length === 1) {
        updateTabTitle(activeTab, text);
    }

    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendButton.disabled = true;
    welcomeMessage.classList.add('hidden');

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
    tabBar.innerHTML = '';
    openTabs.forEach(t => createTab(t.id, t.title, false, true));
}

function restoreTabs() {
    if (openTabs.length > 0) {
        renderTabs();
        if (activeTab) switchTab(activeTab);
    }
}

// --- DOMContentLoaded Event Listener ---
document.addEventListener('DOMContentLoaded', () => {
    // 초기화 함수들 (공통)
    applyTranslations();
    initThemeToggle();
    initDropdowns();
    initCollapsibles();
    initModals();
    initChatInputAutoResize();
    initExamplePrompts();
    restoreTabs();

    // 메시지 전송 버튼 (공통)
    if (sendButton) on(sendButton, 'click', handleSendMessage);

    // Enter 키로 전송 (공통)
    if (chatInput) {
        on(chatInput, 'keypress', (e) => {
            if (getEnterKeySends() && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendButton.click();
            }
        });
    }

    // 새 탭 버튼 (공통)
    const newTabButton = $('#newTabButton');
    if (newTabButton) {
        on(newTabButton, 'click', () => {
            const sessionId = generateSessionId();
            const title = '새 대화';
            chatSessions[sessionId] = [];
            createTab(sessionId, title);
        });
    }

    // 대화 내용 내보내기 버튼 (공통)
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
            }
        });
    }

    // 해석 모드 라디오 버튼 (공통)
    interpretationModeRadios.forEach(radio => {
        on(radio, 'change', function () {
            if (this.checked) setInterpretationMode(this.value);
        });
    });

    // Enter 키 설정 토글 (공통)
    if (enterKeyToggle) {
        on(enterKeyToggle, 'change', function () {
            setEnterKeySends(this.checked);
        });
    }

    // 피드백 폼 제출 (공통)
    if (feedbackForm) {
        on(feedbackForm, 'submit', handleFeedbackSubmit);
    }

    // 피드백 아이콘 클릭 (모달 기능 추가)
    on($('#chatMessages'), 'click', (e) => {
        const target = e.target;
        if (target.classList.contains('feedback-yes')) {
            // "도움이 되었어요" 클릭 시 기존 로직 수행
            handleFeedbackClick(e);
        } else if (target.classList.contains('feedback-no')) {
            // "도움이 안 되었어요" 클릭 시 모달창 열기
            openModal('feedbackModal');
        }
    });

    // 언어 변경 이벤트 (공통)
    on(document, 'languageChanged', (e) => {
        changeLanguage(e.detail.lang);
        loadChatHistoryFromStorage();
        loadRecentChats();
    });

    // 최근 대화 목록 클릭 (공통)
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