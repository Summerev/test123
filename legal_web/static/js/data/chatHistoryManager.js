// static/js/data/chatHistoryManager.js
// 수정 전: import { $, getTranslation } from './translation.js';
// 수정 후: $를 domHelpers.js에서 가져오고, getTranslation은 translation.js에서 가져옵니다.
import { $ } from '../utils/domHelpers.js'; // <-- 이 줄을 수정했습니다.
import { getTranslation } from './translation.js';
import { addMessageToUI, toggleWelcomeMessage } from '../ui/chatUI.js'; // chatUI에서 메시지 UI 추가 함수 임포트

let chatHistory = JSON.parse(localStorage.getItem('legalBotChatHistory')) || [];

const recentChatsList = $('#recentChatsList');

/**
 * Formats an ISO timestamp string into a local time string.
 * @param {string} isoTimestamp - The ISO timestamp string.
 * @returns {string} The formatted time string.
 */
export function formatTimestamp(isoTimestamp) {
    if (!isoTimestamp) return '';
    const date = new Date(isoTimestamp);
    return date.toLocaleString('ko-KR', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Saves the current chat history to local storage and reloads the recent chats list.
 */
export function saveChatHistory() {
    localStorage.setItem('legalBotChatHistory', JSON.stringify(chatHistory));
    loadRecentChats();
}

/**
 * Adds a new message to the chat history and displays it in the UI.
 * @param {string} messageText - The message content.
 * @param {'user'|'bot'} sender - The message sender ('user' or 'bot').
 * @param {string} messageId - The unique message ID.
 * @param {string} timestamp - The message timestamp (ISO string).
 * @param {boolean} [isHistory=false] - True if loading from history, false otherwise.
 */
export function addMessageToChatAndHistory(messageText, sender, messageId, timestamp, isHistory = false) {
    toggleWelcomeMessage(true); // Hide welcome message

    // Prevent duplicate messages if already added to history via UI
    const lastMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
    if (!lastMessage || lastMessage.text !== messageText || lastMessage.sender !== sender || lastMessage.id !== messageId) {
        chatHistory.push({
            id: messageId,
            text: messageText,
            sender: sender,
            timestamp: timestamp,
        });
        saveChatHistory(); // Save updated history
    }

    addMessageToUI(messageText, sender, messageId, timestamp, isHistory);
}

/**
 * Loads chat history from local storage and displays messages in the chat container.
 */
export function loadChatHistoryFromStorage() {
    const chatMessagesContainer = $('#chatMessages');
    if (!chatMessagesContainer) {
        console.warn('Chat messages container not found: #chatMessages');
        return;
    }

    chatMessagesContainer.innerHTML = ''; // Clear existing messages

    if (chatHistory.length > 0) {
        toggleWelcomeMessage(true); // Hide welcome message if history exists
        chatHistory.forEach((msg) => {
            addMessageToUI(msg.text, msg.sender, msg.id, msg.timestamp, true); // isHistory = true
        });
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    } else {
        toggleWelcomeMessage(false); // Show welcome message if no history
    }
}

/**
 * Loads recent chat titles into the sidebar.
 */
export function loadRecentChats() {
    if (!recentChatsList) {
        console.warn('Recent chats list element not found: #recentChatsList');
        return;
    }

    recentChatsList.innerHTML = ''; // Clear existing list

    if (chatHistory.length > 0) {
        const uniqueUserMessages = [];
        const processedTexts = new Set();

        // Extract up to 10 unique user messages in reverse chronological order
        for (let i = chatHistory.length - 1; i >= 0; i--) {
            if (chatHistory[i].sender === 'user') {
                const firstLine = chatHistory[i].text.split('\n')[0];
                const displayText =
                    firstLine.length > 30 ? firstLine.substring(0, 27) + '...' : firstLine;

                if (!processedTexts.has(displayText)) {
                    uniqueUserMessages.unshift({
                        id: chatHistory[i].id,
                        text: displayText,
                        fullText: chatHistory[i].text, // Store full text for retrieval
                    });
                    processedTexts.add(displayText);
                }
            }
            if (uniqueUserMessages.length >= 10) break; // Limit to 10 recent chats
        }

        uniqueUserMessages.forEach((msg) => {
            const chatItem = document.createElement('div');
            chatItem.classList.add('chat-item');
            chatItem.textContent = `${getTranslation('chatItemPrefix')}${msg.text}`;
            chatItem.title = msg.fullText; // Show full text on hover
            chatItem.dataset.chatId = msg.id; // Used for loading specific chat (if implemented)
            recentChatsList.appendChild(chatItem);
        });
    } else {
        const noChatsItem = document.createElement('div');
        noChatsItem.classList.add('chat-item', 'no-chats-item');
        noChatsItem.setAttribute('data-translate-key', 'noRecentChats');
        noChatsItem.textContent = getTranslation('noRecentChats'); // Apply translation directly
        recentChatsList.appendChild(noChatsItem);
    }
}

/**
 * Clears all chat history.
 */
export function clearAllChats() {
    // It's recommended to use a custom modal for confirmation in a real service.
    if (confirm(getTranslation('confirmClearChat'))) {
        chatHistory = [];
        localStorage.removeItem('legalBotChatHistory'); // Remove from local storage
        saveChatHistory(); // Reload recent chats (will show empty state)
        loadChatHistoryFromStorage(); // Reload chat container (will show welcome message)
        // Reset chat input state
        const chatInput = $('#chatInput');
        const sendButton = $('#sendButton');
        if (chatInput) chatInput.value = '';
        if (sendButton) sendButton.disabled = true;
        if (chatInput) chatInput.style.height = 'auto';

        alert(getTranslation('chatCleared')); // Use custom modal
    }
}

/**
 * Returns the current chat history.
 * @returns {Array<object>} The current chat history array.
 */
export function getChatHistory() {
    return chatHistory;
}
