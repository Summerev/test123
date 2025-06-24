// static/js/data/chatHistoryManager.js

import { $ } from '../utils/domHelpers.js';
import { getTranslation } from './translation.js';
import { addMessageToUI, toggleWelcomeMessage, renderRecentChats } from '../ui/chatUI.js';
import { renderTabBar, switchTab } from '../ui/chatTabUI.js';
// chatSessions는 이제 chatTabState에서만 관리되고, saveTabState로 저장됩니다.
// chatHistoryManager는 chatSessions를 직접 수정하지 않고, addMessageToChatAndHistory를 통해
// chatTabState의 chatSessions를 업데이트하도록 합니다.
import { saveTabState, setActiveTab, openTabs, chatSessions, getActiveTab, closeTabState } from '../state/chatTabState.js'; // closeTabState 추가

let chatHistory = JSON.parse(localStorage.getItem('legalBotChatHistory')) || []; // 이 변수는 이제 최근 채팅 목록을 위한 캐시나, 구 버전 호환성을 위한 용도로만 사용될 수 있습니다.

// 🔹 수정: chat_session_info의 구조 변경 및 초기화 로직 강화
export let chat_session_info = JSON.parse(localStorage.getItem('chat_session_info')) || {};

// 기존 데이터 호환성 처리: chat_session_info에 title과 canChat 속성을 확실히 포함하도록
for (const sessionId in chat_session_info) {
    if (chat_session_info.hasOwnProperty(sessionId)) {
        const currentData = chat_session_info[sessionId];
        if (typeof currentData === 'string') {
            // 이전 버전의 title 문자열만 저장된 경우
            chat_session_info[sessionId] = { title: currentData, canChat: false };
        } else {
            // 객체 형태지만 canChat 속성이 없거나 undefined인 경우
            if (currentData.canChat === undefined) {
                currentData.canChat = false;
            }
            // title이 없는 경우 기본값 설정
            if (currentData.title === undefined) {
                currentData.title = '새 대화'; // 기본 제목
            }
        }
    }
}

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

// saveChatHistory 함수는 이제 chatHistory 대신 chatSessions를 저장하도록 변경됩니다.
// chatSessions는 chatTabState에서 관리되므로, saveTabState를 호출하여 통합 저장합니다.
export function saveChatHistory() {
    // legalBotChatHistory는 이제 사용하지 않으므로, 이 줄은 제거하거나 주석 처리할 수 있습니다.
    // localStorage.setItem('legalBotChatHistory', JSON.stringify(chatHistory)); 
    saveTabState(); // chatSessions, openTabs, activeTab 모두 저장
}

// 🔹 수정: saveChatSessionInfo 함수 - chat_session_info에 title과 canChat 함께 저장
export function saveChatSessionInfo(sessionId, { titleText = '새 대화', canChatStatus = false, docType = null }) {
    const title = titleText.length > 12 ? titleText.substring(0, 12) + '…' : titleText;

    if (!chat_session_info[sessionId]) {
        chat_session_info[sessionId] = { title, canChat: canChatStatus };
    } else {
        chat_session_info[sessionId].title = title;
    }

    if (docType) {
        chat_session_info[sessionId].docType = docType;
    }

    localStorage.setItem('chat_session_info', JSON.stringify(chat_session_info));

    if (openTabs[sessionId]) {
        openTabs[sessionId].title = title;
        saveTabState();
    }

    renderTabBar();
}

// 🔹 수정: getChatTitle 함수 - chat_session_info에서 title만 반환
export function getChatTitle(sessionId) {
    return chat_session_info[sessionId] ? chat_session_info[sessionId].title : null;
}

// 🔹 새로 추가: 채팅 가능 여부 설정 함수
export function setChatEnabled(sessionId, isEnabled) {
    if (chat_session_info[sessionId]) {
        chat_session_info[sessionId].canChat = isEnabled;
        localStorage.setItem('chat_session_info', JSON.stringify(chat_session_info));
        console.log(`세션 ${sessionId}의 채팅 가능 상태가 ${isEnabled}로 변경됨.`);

        // 탭 UI에서도 canChat 상태를 반영하기 위해 openTabs에도 동기화
        if (openTabs[sessionId]) {
            openTabs[sessionId].canChat = isEnabled; // openTabs에도 canChat 속성 유지 (UI 업데이트를 위해)
            saveTabState(); // openTabs 상태 저장
        }
    } else {
        console.warn(`세션 ${sessionId}를 찾을 수 없어 채팅 가능 상태를 변경할 수 없습니다.`);
    }
}

// 🔹 새로 추가: 채팅 가능 여부 가져오기 함수
export function getChatEnabled(sessionId) {
    // 세션이 없거나 canChat 속성이 없으면 기본적으로 false 반환
    return chat_session_info[sessionId] ? chat_session_info[sessionId].canChat : false;
}

// 🔹 수정: addMessageToChatAndHistory 함수 (sessionId를 인자로 받음)
// 이 함수가 메시지 추가의 유일한 진입점이 되어야 합니다.
export function addMessageToChatAndHistory(sessionId, messageObj, isHistory = false) {
    if (!chatSessions[sessionId]) {
        chatSessions[sessionId] = [];
    }

    const lastMessage = chatSessions[sessionId].slice(-1)[0];
    const isDuplicate =
        lastMessage &&
        lastMessage.id === messageObj.id &&
        lastMessage.text === messageObj.text;

    if (!isDuplicate) {
        chatSessions[sessionId].push(messageObj);
        saveChatHistory();
    }

    addMessageToUI(
        messageObj.text,
        messageObj.sender,
        messageObj.id,
        messageObj.timestamp,
        isHistory,
        false // isTemporary
    );
}


// 🔹 수정: loadChatHistoryFromStorage 함수 (현재 활성 탭의 메시지를 로드)
export function loadChatHistoryFromStorage() {
    const chatMessagesContainer = $('#chatMessages');
    if (!chatMessagesContainer) {
        console.warn('Chat messages container not found: #chatMessages');
        return;
    }
    chatMessagesContainer.innerHTML = '';
    const currentTabId = getActiveTab(); // 현재 활성 탭 ID 가져오기
    if (currentTabId && chatSessions[currentTabId]) {
        chatSessions[currentTabId].forEach(msg => {
            addMessageToUI(msg.text, msg.sender, msg.id, msg.timestamp, true); // isHistory = true
        });
    }
}

export function clearAllChats() {
    if (confirm(getTranslation('confirmClearChat'))) {
        // ❌ 오류 원인 제거
        // chatHistory = [];

        // 내부 데이터만 초기화
        Object.keys(chat_session_info).forEach(key => delete chat_session_info[key]);
        Object.keys(chatSessions).forEach(key => delete chatSessions[key]);
        Object.keys(openTabs).forEach(key => delete openTabs[key]);

        localStorage.removeItem('legalBotChatHistory');
        localStorage.removeItem('chat_session_info');
        localStorage.removeItem('chat_sessions');

        setActiveTab(null);
        saveTabState();
        loadChatHistoryFromStorage();

        const chatInput = $('#chatInput');
        const sendButton = $('#sendButton');
        if (chatInput) chatInput.value = '';
        if (sendButton) sendButton.disabled = true;
        if (chatInput) chatInput.style.height = 'auto';

        alert(getTranslation('chatCleared'));

        renderTabBar();
        renderRecentChats(getChatSessionList());
    }
}

// getChatHistory 함수는 특정 세션의 기록을 반환하도록 변경 (chatSessions 활용)
export function getChatHistory(sessionId) {
    return chatSessions[sessionId] || [];
}

// 🔹 수정: getChatSessionList 함수 - chat_session_info의 모든 정보 반환
export function getChatSessionList() {
    // chat_session_info의 모든 항목을 배열로 반환
    return Object.entries(chat_session_info).map(([id, data]) => ({
        id: id,
        title: data.title,
        canChat: data.canChat
    }));
}

// ─── 세션 삭제 함수 ───

export function clearChatSessionTitles() {
    chat_session_info = {}; // 모듈 내 변수 초기화
    localStorage.setItem('chat_session_info', JSON.stringify(chat_session_info));
    // openTabs 및 chatSessions 초기화는 clearAllChats에서 처리
}

function deleteChatSession(sessionId) {
    const chatMessages = $('#chatMessages');

    // 1. 제목 및 canChat 상태 삭제 (세션 정보에서 제거)
    delete chat_session_info[sessionId];
    localStorage.setItem('chat_session_info', JSON.stringify(chat_session_info));

    // 2. 채팅 세션 데이터 삭제 (메모리)
    delete chatSessions[sessionId];          // 🔥 직접 세션 삭제
    delete openTabs[sessionId];              // 탭 목록에서도 삭제

    // 3. 활성 탭이 삭제 대상이면 null 처리
    if (getActiveTab() === sessionId) {
        setActiveTab(null);
    }

    // 4. 전체 상태 저장
    saveTabState();

    // 5. UI 갱신
    renderTabBar();
    renderRecentChats(getChatSessionList());

    const newActiveTab = getActiveTab();
    if (newActiveTab) {
        switchTab(newActiveTab);
    } else {
        chatMessages.innerHTML = '';
        switchTab(null); // 초기 상태
    }
}

// Named export로 deleteChatSession 내보내기
export { deleteChatSession };