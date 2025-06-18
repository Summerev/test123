// static/js/ui/chatUI.js (수정된 내용)

import { $, $$, on, addClass, removeClass, escapeRegExp } from '../utils/domHelpers.js';
import { getTranslation, getLegalTerms, getCurrentLanguage } from '../data/translation.js';
import {
    formatTimestamp,
    saveChatHistoryWithTitle,
    clearAllChats,
    loadChatHistoryFromStorage,
    getChatHistory,
} from '../data/chatHistoryManager.js';
import { handleFileUpload } from '../logic/chatProcessor.js';
import { createTab, renderTabs, generateSessionId } from '../main.js';
import { deleteChatSession, getChatSessionList } from '../data/chatHistoryManager.js';
import { openTabs, chatSessions, setActiveTab } from '../state/chatTabState.js';
import { forceResetWelcomeMessage } from './fileUpLoadUI.js'

let attachments = [];
const chatInput = $('#chatInput');
const sendButton = $('#sendButton');
const chatMessagesContainer = $('#chatMessages');
const welcomeMessage = $('#welcomeMessage');
let messageIdCounter = parseInt(localStorage.getItem('legalBotMessageIdCounter')) || 0;

/**
 * Initializes the auto-resizing behavior for the chat input field
 * and updates the send button's disabled state.
 */
export function initChatInputAutoResize() {
    if (!chatInput || !sendButton) return;

    on(chatInput, 'input', function () {
        this.style.height = 'auto'; // Reset height
        this.style.height = Math.min(this.scrollHeight, 120) + 'px'; // Set new height, max 120px
        sendButton.disabled = this.value.trim() === ''; // Disable if empty
    });

    // Trigger input event once on load to set initial height and button state
    chatInput.dispatchEvent(new Event('input'));
}

/**
 * Initializes click handlers for example prompt cards to populate the chat input.
 */
export function initExamplePrompts() {
    $$('.example-prompt').forEach((promptCard) => {
        on(promptCard, 'click', function () {
            // Get prompt text from data-prompt-text or element's text content
            const promptText = this.dataset.promptText || this.textContent.trim().replace(/^"|"$/g, '');
            if (chatInput) {
                chatInput.value = promptText;
                chatInput.focus();
                // Manually dispatch input event to update height and button state
                chatInput.dispatchEvent(new Event('input'));
            }
        });
    });
}

export function initChatUI() {
    // 이 함수가 DOMContentLoaded 시점에 호출되면
    // chatInput과 sendButton이 이미 HTML에 존재하고
    // 상단에서 $() 셀렉터로 변수에 할당된 상태일 것입니다.
    activateChatInput(false); // 초기에는 채팅 입력 비활성화
    // 필요한 다른 채팅 UI 관련 초기화 로직도 여기에 추가
    initChatInputAutoResize(); // 입력창 자동 높이 조절 초기화
    // initSendMessageEvents(); // 메시지 전송 이벤트는 파일 업로드 후 활성화될 때 붙이는 것이 논리적입니다.
                               // 이 부분은 나중에 '활성화' 시점에 붙이도록 변경하는 것을 고려해보세요.
                               // 지금은 activateChatInput(true) 될 때 전송 버튼이 활성화되므로
                               // 전송 버튼의 click 이벤트는 chatUI.js에 계속 유지되어도 괜찮습니다.
}

/**
 * Generates a unique message ID.
 * @returns {string} A new unique message ID.
 */
export function generateMessageId() {
	messageIdCounter++;
	localStorage.setItem('legalBotMessageIdCounter', messageIdCounter);
	return `msg-${Date.now()}-${messageIdCounter}`;
}

/**
 * Adds a message to the UI.
 * @param {string} messageText - The content of the message.
 * @param {'user'|'bot'|'system'} sender - The sender of the message ('user', 'bot', 'system').
 * @param {string} messageId - Unique ID for the message element. (Optional for system messages)
 * @param {string} timestamp - ISO timestamp string for the message. (Optional for system messages)
 * @param {boolean} [isHistory=false] - True if the message is being loaded from history.
 * @param {boolean} [isTemporary=false] - True if the message is a temporary placeholder.
 * @returns {HTMLElement} The created message element.
 */
export function addMessageToUI(messageText, sender, messageId, timestamp, isHistory = false, isTemporary = false) {
    if (!chatMessagesContainer) {
        console.warn('Chat messages container not found.');
        return null;
    }

    // 기존에 같은 ID의 메시지가 있는지 확인
    if (messageId) {
        const existingMessage = chatMessagesContainer.querySelector(`[data-message-id="${messageId}"]`);
        if (existingMessage) {
            console.log('기존 메시지 업데이트:', messageId);
            // 기존 메시지의 내용만 업데이트
            const messageTextElement = existingMessage.querySelector('.message-content') || 
                                     existingMessage.querySelector('.message-text');
            if (messageTextElement) {
                messageTextElement.innerHTML = messageText.replace(/\n/g, '<br>');
            }
            return existingMessage;
        }
    }

    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    
    if (messageId) {
        messageElement.dataset.messageId = messageId;
    }
    if (isTemporary) {
        messageElement.classList.add('temporary-message');
    }

    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');

    if (sender === 'user') {
        messageElement.classList.add('user-message');
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-text');
        messageContent.textContent = messageText;
        messageBubble.appendChild(messageContent);
        
        if (timestamp) {
            const timestampSpan = document.createElement('div');
            timestampSpan.classList.add('message-time');
            timestampSpan.textContent = formatTimestamp(timestamp);
            messageBubble.appendChild(timestampSpan);
        }
        
    } else if (sender === 'bot') {
        messageElement.classList.add('bot-message');

        const botNameSpan = document.createElement('span');
        botNameSpan.classList.add('bot-name');
        botNameSpan.textContent = getTranslation('botName');
        messageBubble.appendChild(botNameSpan);

        const messageContentSpan = document.createElement('div');
        messageContentSpan.classList.add('message-content');

        // 법률 용어 하이라이팅 로직 (기존 코드 유지)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = messageText.replace(/\n/g, '<br>');

        function highlightTerms(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                let content = node.nodeValue;
                let newHTML = '';
                let lastIndex = 0;
                const termSetForCurrentLang = getLegalTerms()[getCurrentLanguage()] || {};
                const termSetKo = getLegalTerms().ko || {};

                let allTermsRegexParts = [];
                // Add terms from Korean dictionary
                for (const termKey in termSetKo) {
                    allTermsRegexParts.push(escapeRegExp(termKey));
                }
                // Add terms from current language dictionary if not already in Korean
                if (getCurrentLanguage() !== 'ko') {
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
                        let termData = termSetForCurrentLang[matchedTermKey] || termSetKo[matchedTermKey];

                        // Try to find term by its translation in other languages
                        if (!termData) {
                            const koKey = Object.keys(termSetKo).find(
                                (k) =>
                                    (termSetKo[k].term && termSetKo[k].term.toLowerCase() === matchedTermKey) ||
                                    (termSetKo[k].en_term && termSetKo[k].en_term.toLowerCase() === matchedTermKey) ||
                                    (termSetKo[k].ja_term && termSetKo[k].ja_term.toLowerCase() === matchedTermKey) ||
                                    (termSetKo[k].zh_term && termSetKo[k].zh_term.toLowerCase() === matchedTermKey) ||
                                    (termSetKo[k].es_term && termSetKo[k].es_term.toLowerCase() === matchedTermKey)
                            );
                            if (koKey) termData = termSetKo[koKey];
                        }

                        if (termData) {
                            let displayTerm = matchedTermOriginal;
                            let displayExplanation = termData.explanation;

                            const currentLangCode = getCurrentLanguage();
                            if (currentLangCode === 'en' && termData.en_term) {
                                displayTerm = termData.en_term;
                                const enSpecific = getLegalTerms().en[termData.en_term.toLowerCase()];
                                if (enSpecific) displayExplanation = enSpecific.explanation;
                            } else if (currentLangCode === 'ja' && termData.ja_term) {
                                displayTerm = termData.ja_term;
                                const jaSpecific = getLegalTerms().ja[termData.ja_term.toLowerCase()];
                                if (jaSpecific) displayExplanation = jaSpecific.explanation;
                            } else if (currentLangCode === 'zh' && termData.zh_term) {
                                displayTerm = termData.zh_term;
                                const zhSpecific = getLegalTerms().zh[termData.zh_term.toLowerCase()];
                                if (zhSpecific) displayExplanation = zhSpecific.explanation;
                            } else if (currentLangCode === 'es' && termData.es_term) {
                                displayTerm = termData.es_term;
                                const esSpecific = getLegalTerms().es[termData.es_term.toLowerCase()];
                                if (esSpecific) displayExplanation = esSpecific.explanation;
                            } else if (currentLangCode === 'ko') {
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
        messageBubble.appendChild(messageContentSpan);
        
        if (timestamp) {
            const timestampSpan = document.createElement('div');
            timestampSpan.classList.add('message-time');
            timestampSpan.textContent = formatTimestamp(timestamp);
            messageBubble.appendChild(timestampSpan);
        }

        // 피드백 버튼 추가 (파일 업로드 메시지가 아닌 경우에만)
        if (!messageText.includes('업로드') && !messageText.includes('파일')) {
            const feedbackDiv = document.createElement('div');
            feedbackDiv.classList.add('feedback-buttons');
            feedbackDiv.innerHTML = `
                <span data-translate-key="feedbackQuestion">${getTranslation('feedbackQuestion')}</span>
                <button class="feedback-yes" data-feedback="yes" data-message-id="${messageId}">${getTranslation('feedbackYes')}</button>
                <button class="feedback-no" data-feedback="no" data-message-id="${messageId}">${getTranslation('feedbackNo')}</button>
            `;
            messageBubble.appendChild(feedbackDiv);
        }
        
    } else if (sender === 'system') {
        messageElement.classList.add('system-message');
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-text');
        messageContent.textContent = messageText;
        messageBubble.appendChild(messageContent);
        
        if (timestamp) {
            const timestampSpan = document.createElement('div');
            timestampSpan.classList.add('message-time');
            timestampSpan.textContent = formatTimestamp(timestamp);
            messageBubble.appendChild(timestampSpan);
        }
    }

    messageElement.appendChild(messageBubble);
    
    // 메시지 컨테이너에 추가하기 전에 웰컴 메시지가 숨겨져 있는지 확인
    if (welcomeMessage && !welcomeMessage.classList.contains('hidden')) {
        welcomeMessage.classList.add('hidden');
    }
    
    chatMessagesContainer.appendChild(messageElement);

    // 스크롤을 맨 아래로 이동 (히스토리 로딩이 아닌 경우에만)
    if (!isHistory) {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
    
    console.log('메시지 UI 추가 완료:', messageId, sender, messageText.substring(0, 50) + '...');
    return messageElement;
}


/**
 * 채팅 입력 필드와 전송 버튼을 활성화하거나 비활성화합니다.
 * @param {boolean} enable - true면 활성화, false면 비활성화.
 */
export function activateChatInput(enable) {
    if (chatInput && sendButton) {
        chatInput.disabled = !enable;
        sendButton.disabled = !enable || chatInput.value.trim() === '';
        if (enable) {
            chatInput.focus();
        }
    } else {
        console.warn('activateChatInput: chatInput or sendButton not found.');
    }
}


/**
 * Scrolls the chat messages container to the bottom.
 */
export function scrollToBottom() {
    if (chatMessagesContainer) {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
}

/**
 * Toggles the visibility of the welcome message.
 */
export function toggleWelcomeMessage(hide) {
    if (welcomeMessage) {
        if (hide) {
            addClass(welcomeMessage, 'hidden');
        } else {
            removeClass(welcomeMessage, 'hidden');
        }
    }
}

export function initGlobalFileDropOverlay() {
    const overlay = document.getElementById('fileDropOverlay');
    if (!overlay) return;

    let dragTimeout;
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        overlay.classList.add('visible');
        clearTimeout(dragTimeout);
        dragTimeout = setTimeout(() => overlay.classList.remove('visible'), 200);
    });
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        overlay.classList.remove('visible');
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    });
}

/**
 * 최근 대화 목록 렌더링
 */
export function renderRecentChats(chatList) {
    const ul = document.getElementById('recentChatsList');
    if (!ul) return;
    ul.innerHTML = '';

    chatList.forEach(chat => {
        const li = document.createElement('li');
        li.className = 'chat-item';
        li.dataset.chatId = chat.id;
        li.textContent = chat.title;

        // 점3개 버튼
        const btn = document.createElement('button');
        btn.className = 'menu-btn';
        btn.textContent = '⋯';
        btn.addEventListener('click', e => {
            e.stopPropagation();
            closeAllContextMenus();

            // 1) 메뉴 생성
            const menu = createContextMenu(chat.id, chat.title);

            // 2) li 위치 정보 가져오기
            const rect = li.getBoundingClientRect();

            // 3) 메뉴를 body에 붙이고, 절대좌표 찍기
            menu.style.position = 'absolute';
            menu.style.top = `${rect.top}px`;
            menu.style.left = `${rect.right + 4}px`; // 화면 오른쪽 4px 여백
            menu.style.zIndex = '9999';

            document.body.appendChild(menu);
        });
        li.appendChild(btn);

        // 클릭하면 탭 생성/전환
        li.addEventListener('click', () => {
            if (!openTabs[chat.id]) {
                createTab(chat.id, chat.title);
            }
            switchTab(chat.id);
        });

        ul.appendChild(li);
    });
}

function closeAllContextMenus() {
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
}

function createContextMenu(id, title) {
    const menu = document.createElement('div');
    menu.className = 'context-menu';

    const rename = document.createElement('button');
    rename.textContent = '이름 바꾸기';
    rename.addEventListener('click', e => {
        e.stopPropagation();
        handleRename(id, title);
        closeAllContextMenus();
    });

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.textContent = '삭제';
    del.addEventListener('click', e => {

        e.stopPropagation();
        handleDelete(id);
        closeAllContextMenus();
    });

    menu.append(rename, del);
    return menu;
}

export function createNewSession() {
    const sessionId = generateSessionId();
    chatSessions[sessionId] = []; // 새 세션의 빈 메시지 배열 초기화

    if (!openTabs[sessionId]) {
        openTabs[sessionId] = { title: '새 대화' };
    }

    renderTabs();
    switchTab(sessionId);
    saveChatHistoryWithTitle(sessionId, '새 대화');
    renderRecentChats(getChatSessionList());

    // 새 채팅방 생성 시 입력창 완전 초기화
    const chatInput = $('#chatInput');
    if (chatInput) {
        chatInput.value = '';
        chatInput.placeholder = '법률 문서나 조항을 입력하거나, 질문을 입력하세요...';
        chatInput.disabled = false;
        chatInput.style.height = 'auto'; // 높이도 초기화
    }

    // 전송 버튼 초기화
    const sendButton = $('#sendButton');
    if (sendButton) {
        sendButton.disabled = true; // 처음에는 비활성화
    }

    // 웰컴 메시지 강제 초기화
    const welcomeMessage = $('#welcomeMessage');
    const chatMessages = $('#chatMessages');
    if (welcomeMessage && chatMessages) {
        chatMessages.innerHTML = '';
        welcomeMessage.classList.remove('hidden');
        chatMessages.appendChild(welcomeMessage);
        
        // 파일 업로드 폼 강제 리셋
        if (forceResetWelcomeMessage) {
            forceResetWelcomeMessage();
        }
    }

    console.log(`새 채팅방 생성 및 완전 초기화: ${sessionId}`);
    return sessionId;
}

export function switchTab(sessionId) {
    if (!sessionId) {
        console.warn('switchTab: sessionId가 null 또는 undefined입니다.');
        return;
    }
    
    console.log('탭 전환 시작:', sessionId);
    
    setActiveTab(sessionId);
    localStorage.setItem('active_tab', sessionId);

    // 탭 UI 업데이트
    [...tabBar.children].forEach(tab => {
        tab.classList.toggle('active', tab.dataset.sessionId === sessionId);
    });

    const messages = chatSessions[sessionId] || [];
    console.log('탭 전환 - 메시지 수:', messages.length);
    
    // 채팅 메시지 컨테이너 초기화
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    
    if (messages.length === 0) {
        // 메시지가 없는 경우 웰컴 메시지 표시
        console.log('빈 채팅방 - 웰컴 메시지 표시');
        
        if (welcomeMessage && chatMessages) {
            welcomeMessage.classList.remove('hidden');
            chatMessages.appendChild(welcomeMessage);
        }
        
        if (sendButton) {
            sendButton.disabled = true;
        }
        
        // 파일 업로드 관련 모든 상태 강제 리셋 (약간의 지연)
        setTimeout(() => {
            if (forceResetWelcomeMessage) {
                forceResetWelcomeMessage();
            }
        }, 50);
        
        // 채팅 입력창 초기화
        const chatInput = $('#chatInput');
        if (chatInput) {
            chatInput.value = '';
            chatInput.placeholder = '법률 문서나 조항을 입력하거나, 질문을 입력하세요...';
            chatInput.disabled = false;
            chatInput.style.height = 'auto';
        }
        
    } else {
        // 메시지가 있는 경우 채팅 내역 표시
        console.log('기존 채팅방 - 메시지 복원');
        
        if (welcomeMessage) {
            welcomeMessage.classList.add('hidden');
        }
        
        // 메시지 순차적으로 복원
        messages.forEach((msg, index) => {
            console.log(`메시지 복원 ${index + 1}/${messages.length}:`, msg.id || 'no-id', msg.text.substring(0, 30) + '...');
            addMessageToUI(msg.text, msg.sender, msg.id, msg.timestamp, true); // isHistory = true
        });
        
        // 채팅이 있는 경우 입력창 활성화
        const chatInput = $('#chatInput');
        if (chatInput) {
            chatInput.disabled = false;
            chatInput.placeholder = '메시지를 입력하세요...';
        }
        
        if (sendButton) {
            sendButton.disabled = chatInput && chatInput.value.trim() === '';
        }
    }
    
    console.log('탭 전환 완료:', sessionId);
}

function handleRename(id, oldTitle) {
    const newTitle = prompt('새 이름 입력', oldTitle);
    if (newTitle) {
        // 1) 타이틀 저장소에 반영
        saveChatHistoryWithTitle(id, newTitle);
        // 2) 사이드바 목록 갱신
        renderRecentChats(getChatSessionList());
        // 3) 탭 UI 타이틀 동기화
        updateTabTitle(id, newTitle); // updateTabTitle 함수가 정의되어 있지 않습니다. 이 함수도 추가해야 할 수 있습니다.
    }
}


function handleDelete(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        // 1) 저장소에서 삭제
        deleteChatSession(id, chatSessions, openTabs);

        // 2) 사이드바 갱신
        renderRecentChats(getChatSessionList());

        // 3) 탭도 닫아주기
        const remainingTabIds = Object.keys(openTabs);
        const fallbackId = remainingTabIds.length > 0 ? remainingTabIds[0] : null;
        switchTab(fallbackId);
    }
}

function switchToChat(id) {
    switchTab(id);
}

function renameChat(id, newTitle) {
    saveChatHistoryWithTitle(id, newTitle);
    renderRecentChats(getChatHistory());
}

document.addEventListener('DOMContentLoaded', () => {
    renderRecentChats(getChatHistory());
    document.addEventListener('click', closeAllContextMenus);
});

/** 파일 드래그앤드롭 초기화 */
export function initFileDragAndDrop() {
    const dropArea = document.getElementById('chatMessages');
    if (!dropArea) return;

    dropArea.addEventListener('dragover', e => {
        e.preventDefault();
        dropArea.classList.add('drag-over');
    });
    dropArea.addEventListener('dragleave', e => {
        e.preventDefault();
        dropArea.classList.remove('drag-over');
    });
    dropArea.addEventListener('drop', e => {
        e.preventDefault();
        dropArea.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });
}