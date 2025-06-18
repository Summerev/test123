// static/js/data/chatHistoryManager.js
import { $ } from '../utils/domHelpers.js';
import { getTranslation } from './translation.js';
import { addMessageToUI, toggleWelcomeMessage, renderRecentChats, switchTab } from '../ui/chatUI.js';
import { renderTabs, } from '../main.js'
import { saveTabState, setActiveTab, openTabs, chatSessions, getActiveTab } from '../state/chatTabState.js';

let chatHistory = JSON.parse(localStorage.getItem('legalBotChatHistory')) || [];
let chatTitles = JSON.parse(localStorage.getItem('chat_session_titles')) || {};

const recentChatsList = $('#recentChatsList');

export function formatTimestamp(isoTimestamp) {
    if (!isoTimestamp) return '';
    const date = new Date(isoTimestamp);
    return date.toLocaleString('ko-KR', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export function saveChatHistory() {
    localStorage.setItem('legalBotChatHistory', JSON.stringify(chatHistory));
    loadRecentChats();
}

// 🔹 새로 추가: 현재 탭 sessionId에 해당하는 제목 저장
export function saveChatHistoryWithTitle(sessionId, titleText) {
    const title = titleText.length > 12 ? titleText.substring(0, 12) + '…' : titleText;
    chatTitles[sessionId] = title;
    localStorage.setItem('chat_session_titles', JSON.stringify(chatTitles));

    // 🔥 추가: openTabs에도 동기화
    if (openTabs[sessionId]) {
        openTabs[sessionId].title = title;
        localStorage.setItem('open_tabs', JSON.stringify(openTabs));
    }

	renderTabs();
}

// 🔹 새로 추가: 현재 탭 sessionId에 해당하는 제목 불러오기
export function getChatTitle(sessionId) {
    return chatTitles[sessionId] || null;
}

export function addMessageToChatAndHistory(messageText, sender, messageId, timestamp, isHistory = false) {

    const lastMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
    if (!lastMessage || lastMessage.text !== messageText || lastMessage.sender !== sender || lastMessage.id !== messageId) {
        chatHistory.push({
            id: messageId,
            text: messageText,
            sender: sender,
            timestamp: timestamp,
        });
        saveChatHistory();
    }

    addMessageToUI(messageText, sender, messageId, timestamp, isHistory);
}

export function loadChatHistoryFromStorage() {
    const chatMessagesContainer = $('#chatMessages');
    if (!chatMessagesContainer) {
        console.warn('Chat messages container not found: #chatMessages');
        return;
    }

    chatMessagesContainer.innerHTML = '';

}

export function loadRecentChats() {
    if (!recentChatsList) {
        console.warn('Recent chats list element not found: #recentChatsList');
        return;
    }

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
                        fullText: chatHistory[i].text,
                    });
                    processedTexts.add(displayText);
                }
            }
            if (uniqueUserMessages.length >= 10) break;
        }

        uniqueUserMessages.forEach((msg) => {
            const chatItem = document.createElement('div');
            chatItem.classList.add('chat-item');
            chatItem.textContent = `${getTranslation('chatItemPrefix')}${msg.text}`;
            chatItem.title = msg.fullText;
            chatItem.dataset.chatId = msg.id;
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

export function clearAllChats() {
    if (confirm(getTranslation('confirmClearChat'))) {
        chatHistory = [];
        chatTitles = {};
        localStorage.removeItem('legalBotChatHistory');
        localStorage.removeItem('chat_session_titles');
        saveChatHistory();
        loadChatHistoryFromStorage();
        const chatInput = $('#chatInput');
        const sendButton = $('#sendButton');
        if (chatInput) chatInput.value = '';
        if (sendButton) sendButton.disabled = true;
        if (chatInput) chatInput.style.height = 'auto';
        alert(getTranslation('chatCleared'));
    }
}

export function getChatHistory() {
    return chatHistory;
}

export function getChatSessionList() {
    return Object.entries(chatTitles).map(([id, title]) => ({ id, title }));
}

// ─── 세션 삭제 함수 ───
// 사이드바 제목 목록에서 해당 세션을 지우고 UI를 갱신합니다
export function deleteChatSession(sessionId) {
    const chatMessages = $('#chatMessages');
    const welcomeMessage = $('#welcomeMessage');

    // 1. 제목 삭제
    delete chatTitles[sessionId];
    localStorage.setItem('chat_session_titles', JSON.stringify(chatTitles));

    // 2. 세션 삭제
    delete chatSessions[sessionId];

    // 3. 탭 삭제 (객체 방식)
    delete openTabs[sessionId];

    // 4. 활성 탭 갱신
    if (getActiveTab() === sessionId) {
        const fallback = Object.keys(openTabs)[0] || null;
        setActiveTab(fallback);
    }

    // 5. 상태 저장
    saveTabState();

    // 6. UI 갱신
    renderTabs();
    renderRecentChats(getChatSessionList());

    const newActiveTab = getActiveTab();
    if (newActiveTab) {
        switchTab(newActiveTab);
    } else {
        chatMessages.innerHTML = '';
        welcomeMessage.classList.remove('hidden');
    }
}


export function clearChatSessionTitles() {
    chatTitles = {}; // 모듈 내 변수 초기화
    localStorage.setItem('chat_session_titles', JSON.stringify(chatTitles));
}
