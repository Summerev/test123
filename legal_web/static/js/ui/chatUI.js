// static/js/ui/chatUI.js (수정된 내용)

import { $, $$, on, addClass, removeClass, escapeRegExp, createElement } from '../utils/domHelpers.js';
import { getTranslation, getLegalTerms, getCurrentLanguage, applyTranslations } from '../data/translation.js';
import {
    formatTimestamp,
    saveChatSessionInfo,
    clearAllChats,
    loadChatHistoryFromStorage,
    getChatHistory,
} from '../data/chatHistoryManager.js';

import { generateSessionId } from '../main.js';
import { createTab, renderTabBar, switchTab } from './chatTabUI.js'
import { deleteChatSession, getChatSessionList } from '../data/chatHistoryManager.js';
import { openTabs, chatSessions, setActiveTab, saveTabState } from '../state/chatTabState.js';
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

export function generateMessageId() {
    messageIdCounter++;
    localStorage.setItem('legalBotMessageIdCounter', messageIdCounter);
    return `msg-${Date.now()}-${messageIdCounter}`;
}

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

        const span = document.createElement('span');
        span.className = 'chat-title';
        span.textContent = chat.title;

        // 기본 타이틀이면 언어 고정 방지용 속성 부여
        const isDefaultTitle = ['새 대화', 'New Chat', '新しいチャット', '新对话', 'Nuevo Chat'].includes(chat.title);
        if (isDefaultTitle) {
            span.setAttribute('data-original-lang', chat.language || 'ko');
        }

        li.appendChild(span);

        // 점 3개 버튼
        const btn = document.createElement('button');
        btn.className = 'menu-btn';
        btn.textContent = '⋯';

        btn.addEventListener('click', e => {
            e.stopPropagation();
            closeAllContextMenus();

            document.querySelectorAll('.menu-btn.persistent').forEach(btn => {
                btn.classList.remove('persistent');
            });

            const menu = createContextMenu(chat.id, chat.title);
            const rect = li.getBoundingClientRect();

            menu.style.position = 'absolute';
            menu.style.top = `${rect.top}px`;
            menu.style.left = `${rect.right + 4}px`;
            menu.style.zIndex = '9999';

            document.body.appendChild(menu);
            btn.classList.add('persistent');

            const outsideClickHandler = (event) => {
                const clickedInside = menu.contains(event.target) || btn.contains(event.target);
                if (!clickedInside) {
                    menu.remove();
                    btn.classList.remove('persistent');
                    document.removeEventListener('click', outsideClickHandler);
                }
            };

            setTimeout(() => {
                document.addEventListener('click', outsideClickHandler);
            }, 0);
        });

        li.appendChild(btn);

        // ✅ 클릭 시 해당 탭 언어로 번역 적용
        li.addEventListener('click', () => {
            if (!openTabs[chat.id]) {
                createTab(chat.id, chat.title);
            }
            switchTab(chat.id);

            const tabLang = openTabs[chat.id]?.language || chat.language || 'ko';
            applyTranslations(tabLang);  // 🔥 현재 탭 언어 기준 번역
        });

        ul.appendChild(li);
    });
}


// context-menu 생성 시 삭제 버튼 이벤트에 sessionId 추가
function createContextMenu(sessionId, title) {
    const menu = document.createElement('div');
    menu.className = 'context-menu';

    const rename = document.createElement('button');
    rename.className = 'rename-btn';
    rename.setAttribute('data-translate-key', 'renameChat');
    rename.textContent = getTranslation('renameChat');
    rename.addEventListener('click', e => {
        e.stopPropagation();
        handleRenameInline(sessionId);
        closeAllContextMenus();
    });

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.setAttribute('data-translate-key', 'deleteChat');
    del.textContent = getTranslation('deleteChat');
    del.addEventListener('click', e => {
        e.stopPropagation();
        window._currentDeleteSessionId = sessionId;
        openDeleteModal(sessionId);
        closeAllContextMenus();
    });

    menu.append(rename, del);

    // ✅ 메뉴 외부 클릭 시 닫기 기능 추가
    setTimeout(() => {
        const outsideClickHandler = (event) => {
            const isInsideMenu = menu.contains(event.target);
            if (!isInsideMenu) {
                menu.remove();
                document.removeEventListener('click', outsideClickHandler);
            }
        };
        document.addEventListener('click', outsideClickHandler);
    }, 0);

    return menu;
}

// 세션 추가
export function createNewSession() {
    const sessionId = generateSessionId();
    chatSessions[sessionId] = []; // 새 세션의 빈 메시지 배열 초기화

    if (!openTabs[sessionId]) {
        openTabs[sessionId] = { title: '새 대화' };
    }

    renderTabBar();
    switchTab(sessionId);
    saveChatSessionInfo(sessionId, '새 대화');
    renderRecentChats(getChatSessionList());

    // 새 채팅방 생성 시 입력창 완전 초기화 및 비활성화
    const chatInput = $('#chatInput');
    if (chatInput) {
        chatInput.value = '';
        chatInput.placeholder = '파일을 업로드하기 전에 질문을 입력할 수 없습니다.'; // 메시지 변경
        chatInput.disabled = true; // <--- 이 부분을 true로 설정하여 비활성화
        chatInput.style.height = 'auto'; // 높이도 초기화
    }

    // 전송 버튼 초기화 (비활성화)
    const sendButton = $('#sendButton');
    if (sendButton) {
        sendButton.disabled = true; // 처음에는 비활성화 (현재 코드와 동일)
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

function handleRenameInline(sessionId) {
    const sidebarItem = document.querySelector(`.chat-item[data-chat-id="${sessionId}"]`);
    if (!sidebarItem) return;

    const currentTitle = sidebarItem.firstChild.textContent.trim();

    const input = createElement('input', 'rename-input');
    input.value = currentTitle;
    sidebarItem.replaceChild(input, sidebarItem.firstChild);
    input.focus();

    input.addEventListener('blur', () => applyRename(sessionId, input, sidebarItem));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') cancelRename(input, sessionId, currentTitle, sidebarItem);
    });
}

function cancelRename(input, sessionId, originalTitle, sidebarItem) {
    const title = originalTitle || (chatSessions[sessionId] ? chatSessions[sessionId].title : '제목 없음');

    sidebarItem.innerHTML = '';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'chat-title';
    titleSpan.textContent = title;
    sidebarItem.appendChild(titleSpan);

    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.textContent = '⋯';
    btn.addEventListener('click', e => {
        e.stopPropagation();
        closeAllContextMenus();
        const menu = createContextMenu(sessionId, title);
        const rect = sidebarItem.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = `${rect.top}px`;
        menu.style.left = `${rect.right + 4}px`;
        menu.style.zIndex = '9999';
        document.body.appendChild(menu);
    });
    sidebarItem.appendChild(btn);
}

export function removeTabUI(sessionId) {
    const tab = document.querySelector(`.chat-tab[data-session-id="${sessionId}"]`);
    if (tab) tab.remove();
}

window.openDeleteModal = openDeleteModal;


export function openDeleteModal(sessionId) {
    const modalOverlay = document.getElementById('confirmDeleteModal');
    if (!modalOverlay) {
        console.error('삭제 모달을 찾을 수 없습니다!');
        return;
    }

    // 모달을 보이도록 설정
    modalOverlay.classList.add('active');
    window._currentDeleteSessionId = sessionId; // 삭제할 세션 ID 저장
}

export function closeDeleteModal() {
    const modalOverlay = document.getElementById('confirmDeleteModal');
    if (modalOverlay) {
        modalOverlay.classList.remove('active');
    }
}

window.closeDeleteModal = () => {
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) modal.style.display = 'none';
};

function handleRenameSidebarInline(sessionId, button) {
    const li = document.querySelector(`.chat-item[data-chat-id="${sessionId}"]`);
    if (!li) return;
    const currentTitle = li.childNodes[0].textContent.trim();
    const input = createElement('input', 'rename-input');
    input.value = currentTitle;
    const oldTextNode = li.childNodes[0];
    li.insertBefore(input, oldTextNode);
    li.removeChild(oldTextNode);
    input.focus();
    input.addEventListener('blur', () => applyRenameSidebar(input, currentTitle, li, sessionId));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') cancelRenameSidebar(input, currentTitle, li);
    });
}
function applyRename(sessionId, input, sidebarItem) {
    const newTitle = input.value.trim();
    if (!newTitle) return cancelRename(input, sessionId, null, sidebarItem);

    // 상태 업데이트
    if (chatSessions[sessionId]) chatSessions[sessionId].title = newTitle;
    if (openTabs[sessionId]) openTabs[sessionId].title = newTitle;
    saveChatSessionInfo(sessionId, { titleText: newTitle });
    saveTabState();

    // 사이드바 UI 갱신
    sidebarItem.innerHTML = ''; // 기존 요소 제거

    const titleSpan = document.createElement('span');  // ✅ span으로 감싸야 안정적
    titleSpan.className = 'chat-title';
    titleSpan.textContent = newTitle;
    sidebarItem.appendChild(titleSpan);

    // 점 3개 버튼 다시 붙이기
    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.textContent = '⋯';
    btn.addEventListener('click', e => {
        e.stopPropagation();
        closeAllContextMenus();
        const menu = createContextMenu(sessionId, newTitle);
        const rect = sidebarItem.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.top = `${rect.top}px`;
        menu.style.left = `${rect.right + 4}px`;
        menu.style.zIndex = '9999';
        document.body.appendChild(menu);
    });
    sidebarItem.appendChild(btn);

    // 탭 UI 갱신
    const tab = document.querySelector(`.chat-tab[data-session-id="${sessionId}"]`);
    if (tab) {
        const titleSpan = tab.querySelector('.tab-title');
        if (titleSpan) {
            titleSpan.textContent = newTitle.length > 12 ? newTitle.slice(0, 12) + '...' : newTitle;
        }
    }

    renderRecentChats(getChatSessionList());
}

// 모달 삭제 버튼에 이벤트 연결
export function initDeleteModalEvents() {
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const cancelBtn = document.querySelector('#confirmDeleteModal .btn-cancel');

    if (confirmBtn && cancelBtn) {
        confirmBtn.addEventListener('click', () => {
            if (window._currentDeleteSessionId) {
                deleteChatSession(window._currentDeleteSessionId);  // 세션 삭제
                closeDeleteModal(); // 모달 닫기
                window._currentDeleteSessionId = null; // 세션 ID 초기화
            }
        });

        cancelBtn.addEventListener('click', () => {
            closeDeleteModal(); // 취소 버튼 클릭 시 모달 닫기
        });
    }
}

function closeAllContextMenus() {
    document.querySelectorAll('.context-menu').forEach(m => m.remove());
}

// 기존 코드에서 버튼 클릭 시 호출되는 부분에서 이 함수를 사용
const del = document.createElement('button');
del.className = 'delete-btn';
del.textContent = '삭제';
del.addEventListener('click', e => {
    e.stopPropagation();
    window._currentDeleteSessionId = sessionId; // sessionId를 전역 변수에 저장
    openDeleteModal(sessionId); // 삭제 모달 호출
    closeAllContextMenus(); // 모든 context-menu 닫기
});
