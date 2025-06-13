// static/js/ui/chatUI.js
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
import { switchTab as selectTab, openTabs, createTab } from '../main.js';
import { deleteChatSession } from '../data/chatHistoryManager.js';

let attachments = [];
const chatInput = $('#chatInput');
const sendButton = $('#sendButton');
const chatMessagesContainer = $('#chatMessages');
const welcomeMessage = $('#welcomeMessage');

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

/**
 * Adds a message to the UI.
 * @param {string} messageText - The content of the message.
 * @param {'user'|'bot'} sender - The sender of the message ('user' or 'bot').
 * @param {string} messageId - Unique ID for the message element.
 * @param {string} timestamp - ISO timestamp string for the message.
 * @param {boolean} [isHistory=false] - True if the message is being loaded from history.
 * @returns {HTMLElement} The created message element.
 */
export function addMessageToUI(messageText, sender, messageId, timestamp, isHistory = false) {
    if (!chatMessagesContainer) {
        console.warn('Chat messages container not found.');
        return null;
    }

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.dataset.messageId = messageId;

    const timestampSpan = document.createElement('span');
    timestampSpan.classList.add('message-timestamp');
    timestampSpan.textContent = formatTimestamp(timestamp);

    if (sender === 'user') {
        messageElement.classList.add('user-message');
        const textNode = document.createTextNode(messageText);
        messageElement.appendChild(textNode);
        messageElement.appendChild(timestampSpan);
    } else { // sender === 'bot'
        messageElement.classList.add('bot-message');

        const botNameSpan = document.createElement('span');
        botNameSpan.classList.add('bot-name');
        botNameSpan.textContent = getTranslation('botName');
        messageElement.appendChild(botNameSpan);

        const messageContentSpan = document.createElement('span');
        messageContentSpan.classList.add('message-content');

        // Logic for highlighting legal terms and adding tooltips
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = messageText;

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
        messageElement.appendChild(messageContentSpan);
        messageElement.appendChild(timestampSpan);

        // Add feedback buttons
        const feedbackDiv = document.createElement('div');
        feedbackDiv.classList.add('feedback-buttons');
        feedbackDiv.innerHTML = `
            <span data-translate-key="feedbackQuestion">${getTranslation('feedbackQuestion')}</span>
            <button class="feedback-yes" data-feedback="yes" data-message-id="${messageId}">${getTranslation('feedbackYes')}</button>
            <button class="feedback-no" data-feedback="no" data-message-id="${messageId}">${getTranslation('feedbackNo')}</button>
        `;
        messageElement.appendChild(feedbackDiv);
    }

    chatMessagesContainer.appendChild(messageElement);

    // Scroll to bottom after adding new message
    if (!isHistory) {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
    return messageElement;
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

export function initAttachmentUI() {
    const addBtn = $('#addBtn');
    const fileMenu = $('#fileMenu');
    const fileAdd = $('#fileAddBtn');
    const fileInput = $('#fileInput');
    const preview = $('#attachmentPreview');
    const dropArea = $('#chatMessages').parentElement;

    // + 버튼으로 메뉴 토글
    on(addBtn, 'click', e => {
        e.stopPropagation();
        fileMenu.classList.toggle('hidden');
    });
    // 외부 클릭 시 메뉴 닫기
    document.addEventListener('click', () => fileMenu.classList.add('hidden'));
    // 메뉴에서 파일 추가 클릭
    on(fileAdd, 'click', () => fileInput.click());
    // 파일 선택 완료 시
    on(fileInput, 'change', () => {
        Array.from(fileInput.files).forEach(f => addPreview(f, preview));
        fileInput.value = '';
    });
    // 드래그&드롭
    on(dropArea, 'dragover', e => e.preventDefault());
    on(dropArea, 'dragleave', e => e.preventDefault());
    on(dropArea, 'drop', e => {
        e.preventDefault();
        Array.from(e.dataTransfer.files).forEach(f => addPreview(f, preview));
    });
}

/** 첨부파일 썸네일/아이콘 + 삭제 버튼 생성 */
function addPreview(file, preview) {
    attachments.push(file);
    const item = document.createElement('div');
    item.className = 'attachment-item';
    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        item.appendChild(img);
    } else {
        const ico = document.createElement('div');
        ico.className = 'file-icon';
        ico.textContent = file.name.split('.').pop().toUpperCase();
        item.appendChild(ico);
    }
    const btn = document.createElement('button');
    btn.className = 'remove-btn';
    btn.textContent = '×';
    on(btn, 'click', () => {
        attachments = attachments.filter(f => f !== file);
        item.remove();
    });
    item.appendChild(btn);
    preview.appendChild(item);
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
            if (!openTabs.some(t => t.id === chat.id)) {
                createTab(chat.id, chat.title);
            }
            selectTab(chat.id);
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

function createNewSession() {
    loadChatHistoryFromStorage();
    const newId = crypto.randomUUID();
    saveChatHistoryWithTitle(newId, '새 대화');
    renderRecentChats(getChatHistory());
    document.addEventListener('click', closeAllContextMenus);
    selectTab(newId);
}

function handleRename(id, oldTitle) {
    const newTitle = prompt('새 이름 입력', oldTitle);
    if (newTitle) {
        // 1) 타이틀 저장소에 반영
        saveChatHistoryWithTitle(id, newTitle);
        // 2) 사이드바 목록 갱신
        renderRecentChats(getChatSessionList());
        // 3) 탭 UI 타이틀 동기화
        updateTabTitle(id, newTitle);
    }
}

function handleDelete(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        // 1) 저장소에서 삭제
        deleteChatSession(id);
        // 2) 사이드바 갱신
        renderRecentChats(getChatSessionList());
        // 3) 탭도 닫아주기
        selectTab(openTabs.length ? openTabs[0].id : null);
    }
}

function switchToChat(id) {
    selectTab(id);
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
