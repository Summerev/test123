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
    loadRecentChats(); // 최근 채팅 목록 업데이트
}

// 🔹 수정: saveChatTitle 함수 - chat_session_info에 title과 canChat 함께 저장
export function saveChatTitle(sessionId, titleText, canChatStatus = false) { // canChatStatus 파라미터 추가
    const title = titleText.length > 12 ? titleText.substring(0, 12) + '…' : titleText;
    
    // 기존 chat_session_info[sessionId] 객체가 있다면 canChat 값을 유지하고, 없으면 새로 생성
    if (!chat_session_info[sessionId]) {
        // 새 세션 생성 시 기본값으로 canChatStatus를 사용 (보통은 false)
        chat_session_info[sessionId] = { title: title, canChat: canChatStatus }; 
    } else {
        // 기존 세션은 제목만 업데이트 (canChat은 setChatEnabled로 별도 관리)
        chat_session_info[sessionId].title = title;
    }
    
    localStorage.setItem('chat_session_info', JSON.stringify(chat_session_info));

    // 🔥 openTabs에도 동기화 (탭 바 렌더링을 위해)
    // openTabs는 이제 탭의 존재 유무와 제목만 관리하고, canChat은 chat_session_info가 원본이 되도록 합니다.
    if (openTabs[sessionId]) {
        openTabs[sessionId].title = title;
        // openTabs의 canChat은 이제 chat_session_info에서 가져와야 하므로, 여기서는 title만 동기화
        saveTabState(); // openTabs도 저장 (saveTabState는 open_tabs도 저장)
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
export function addMessageToChatAndHistory(sessionId, messageText, sender, messageId, timestamp, isHistory = false) {
    if (!chatSessions[sessionId]) {
        chatSessions[sessionId] = [];
    }

    const message = {
        id: messageId,
        text: messageText,
        sender: sender,
        timestamp: timestamp,
    };

    // 중복 메시지 방지 (필요하다면)
    const lastMessageInSession = chatSessions[sessionId].length > 0 ? chatSessions[sessionId][chatSessions[sessionId].length - 1] : null;
    if (!lastMessageInSession || lastMessageInSession.id !== message.id || lastMessageInSession.text !== message.text) {
        chatSessions[sessionId].push(message);
        saveChatHistory(); // 변경된 chatSessions를 저장하고 최근 채팅 갱신
    }

    addMessageToUI(messageText, sender, messageId, timestamp, isHistory);
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

// 🔹 수정: loadRecentChats 함수 - chatHistory 대신 chat_session_info와 chatSessions 활용
export function loadRecentChats() {
    if (!recentChatsList) {
        console.warn('Recent chats list element not found: #recentChatsList');
        return;
    }

    recentChatsList.innerHTML = '';

    const recentSessionsToDisplay = [];
    // 모든 chat_session_info를 순회하며 제목과 대표 메시지를 찾습니다.
    for (const sessionId in chat_session_info) {
        if (chat_session_info.hasOwnProperty(sessionId)) {
            const sessionData = chat_session_info[sessionId];
            const messages = chatSessions[sessionId] || []; // 해당 세션의 메시지 가져오기
            
            let representativeText = sessionData.title; // 기본적으로 저장된 제목 사용
            let fullTextForTitle = sessionData.title; // 툴팁용 전체 텍스트

            // 만약 세션에 메시지가 있고, 첫 사용자 메시지를 대표로 쓰고 싶다면
            const firstUserMessage = messages.find(msg => msg.sender === 'user');
            if (firstUserMessage) {
                const firstLine = firstUserMessage.text.split('\n')[0];
                representativeText = firstLine.length > 30 ? firstLine.substring(0, 27) + '...' : firstLine;
                fullTextForTitle = firstUserMessage.text;
            }

            recentSessionsToDisplay.push({
                id: sessionId,
                text: representativeText,
                fullText: fullTextForTitle,
                timestamp: messages.length > 0 ? messages[0].timestamp : new Date().toISOString() // 첫 메시지 타임스탬프 또는 현재 시간
            });
        }
    }

    // 최신순으로 정렬 (가장 최근에 업데이트된 세션이 위로 오도록)
    recentSessionsToDisplay.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 최대 10개만 표시
    const displayCount = Math.min(recentSessionsToDisplay.length, 10);
    const uniqueDisplayItems = new Set(); // 중복 방지를 위한 Set (제목으로 판단)
    const finalRecentChats = [];

    for(let i=0; i<recentSessionsToDisplay.length && finalRecentChats.length < 10; i++) {
        const item = recentSessionsToDisplay[i];
        if (!uniqueDisplayItems.has(item.text)) {
            finalRecentChats.push(item);
            uniqueDisplayItems.add(item.text);
        }
    }

    if (finalRecentChats.length > 0) {
        finalRecentChats.forEach((item) => {
            const chatItem = document.createElement('div');
            chatItem.classList.add('chat-item');
            chatItem.textContent = `${getTranslation('chatItemPrefix')}${item.text}`;
            chatItem.title = item.fullText;
            chatItem.dataset.sessionId = item.id; // data-chatId 대신 data-sessionId 사용
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
        chatHistory = []; // 이 변수 초기화 (더 이상 주 저장소가 아니므로)
        chat_session_info = {}; // 모든 세션 제목 및 상태 초기화
        chatSessions = {}; // 모든 세션 대화 기록 초기화 (chatTabState.js의 chatSessions와 동기화)
        
        localStorage.removeItem('legalBotChatHistory'); // 제거 (더 이상 사용 안함)
        localStorage.removeItem('chat_session_info'); 
        localStorage.removeItem('chat_sessions'); // chatSessions 초기화 시 함께 제거

        // openTabs도 초기화 (모든 탭 닫기)
        for (const tabId in openTabs) {
            delete openTabs[tabId];
        }
        setActiveTab(null); // 활성 탭도 null로 설정
        saveTabState(); // 변경된 openTabs, chatSessions(초기화됨) 상태 저장

        loadChatHistoryFromStorage(); // 메시지 영역 비움 (활성 탭이 없으므로 비어있을 것)
        const chatInput = $('#chatInput');
        const sendButton = $('#sendButton');
        if (chatInput) chatInput.value = '';
        if (sendButton) sendButton.disabled = true;
        if (chatInput) chatInput.style.height = 'auto';
        alert(getTranslation('chatCleared'));
        renderTabBar(); // 탭 바도 갱신
        renderRecentChats(getChatSessionList()); // 최근 채팅 갱신
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
export function deleteChatSession(sessionId) {
    const chatMessages = $('#chatMessages');

    // 1. 제목 및 canChat 상태 삭제 (chat_session_info에서)
    delete chat_session_info[sessionId];
    localStorage.setItem('chat_session_info', JSON.stringify(chat_session_info));

    // 2. 탭 및 세션 채팅 내역 삭제 (chatTabState의 closeTabState 함수 호출)
    // closeTabState 함수가 chatSessions[sessionId]와 openTabs[sessionId]를 모두 삭제하도록 되어있음
    closeTabState(sessionId); // chatTabState.js의 closeTabState 호출

    // 3. UI 갱신
    renderTabBar();
    renderRecentChats(getChatSessionList());

    const newActiveTab = getActiveTab();
    if (newActiveTab) {
        switchTab(newActiveTab);
    } else {
        chatMessages.innerHTML = '';
        switchTab(null); // 모든 탭이 사라졌을 때 초기 상태로 전환
    }
}

export function clearChatSessionTitles() {
    chat_session_info = {}; // 모듈 내 변수 초기화
    localStorage.setItem('chat_session_info', JSON.stringify(chat_session_info));
    // openTabs 및 chatSessions 초기화는 clearAllChats에서 처리
}