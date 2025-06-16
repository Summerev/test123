// static/js/logic/chatProcessor.js
import { sendMessageToBot } from '../api/chatAPI.js';
import {
    getTranslation,
    getLegalTerms,
    getCurrentInterpretationMode,
    generateMessageId,
    addFeedbackData
} from '../data/translation.js';
import {
    addMessageToChatAndHistory,
    getChatHistory
} from '../data/chatHistoryManager.js';
import {
    addMessageToUI,
    scrollToBottom,
    toggleWelcomeMessage
} from '../ui/chatUI.js';
import { closeModal } from '../ui/modalManager.js';

/**
 * Processes user input, sends it to the chatbot API, and displays the response.
 * @param {string} userInput - The user's input text.
 */
export async function processUserMessage(userInput) {
    const currentMode = getCurrentInterpretationMode();
    const currentLanguage = getTranslation('koreanTerm') === '한국어' ? 'ko' :
                            getTranslation('englishTerm') === 'English' ? 'en' :
                            getTranslation('japaneseTerm') === '日本語' ? 'ja' :
                            getTranslation('chineseTerm') === '中文' ? 'zh' :
                            getTranslation('spanishTerm') === 'Español' ? 'es' : 'ko';

    // Add user message to UI and history
    const userMessageId = generateMessageId();
    const userTimestamp = new Date().toISOString();
    addMessageToChatAndHistory(userInput, 'user', userMessageId, userTimestamp);

    // Add bot response placeholder
    const botMessageId = generateMessageId();
    const botTimestamp = new Date().toISOString();
    const botMessagePlaceholder = addMessageToUI('응답 중...', 'bot', botMessageId, botTimestamp, false);
    botMessagePlaceholder.classList.add('loading-message');
    scrollToBottom();

    // API 요청
    const botResponse = await sendMessageToBot(userInput, currentMode, getTranslation, getLegalTerms(), currentLanguage);

    // 응답 처리
    let finalText = '응답 없음';
    if (botResponse.error) {
        botMessagePlaceholder.querySelector('.message-content').textContent = `오류: ${botResponse.error}`;
        botMessagePlaceholder.classList.add('error-message');
        finalText = `오류: ${botResponse.error}`;
    } else {
        finalText = botResponse.text || '응답 없음';
        botMessagePlaceholder.querySelector('.message-content').innerHTML = finalText;
    }
    botMessagePlaceholder.classList.remove('loading-message');
    scrollToBottom();

    // 히스토리에도 저장
    const history = getChatHistory();
    const idx = history.findIndex(msg => msg.id === botMessageId);
    if (idx > -1) {
        history[idx].text = finalText;
    }

    // 🟡 기능 1: 자동 탭 제목 설정
    try {
        const sessionId = localStorage.getItem('active_tab');
        if (sessionId) {
            const cleanedTitle = userInput.length > 20
                ? userInput.slice(0, 20).trim() + '...'
                : userInput.trim();

            const tabSelector = `.chat-tab[data-session-id="${sessionId}"]`;
            const currentTab = document.querySelector(tabSelector);

            if (currentTab && currentTab.dataset.sessionTitle === '새 대화') {
                currentTab.querySelector('span').textContent = cleanedTitle;
                currentTab.dataset.sessionTitle = cleanedTitle;

                // 저장
                const titleMap = JSON.parse(localStorage.getItem('chat_titles') || '{}');
                titleMap[sessionId] = cleanedTitle;
                localStorage.setItem('chat_titles', JSON.stringify(titleMap));
            }
        }
    } catch (e) {
        console.warn('탭 제목 설정 중 오류:', e);
    }
}

/**
 * Handles clicks on feedback buttons (👍 / 👎).
 * @param {Event} event - The click event.
 */
export function handleFeedbackClick(event) {
    const feedbackType = event.target.dataset.feedback;
    const messageId = event.target.dataset.messageId;

    if (feedbackType === 'no') {
        const feedbackMessageIdInput = document.getElementById('feedbackMessageId');
        if (feedbackMessageIdInput) {
            feedbackMessageIdInput.value = messageId;
        }
        openModal('feedbackModal');
    } else {
        addFeedbackData({
            messageId: messageId,
            feedback: feedbackType,
            timestamp: new Date().toISOString()
        });
        alert(getTranslation('alertFeedbackSubmitted'));
        event.target.closest('.feedback-buttons')
            .querySelectorAll('button')
            .forEach(btn => btn.disabled = true);
    }
}

/**
 * Handles the submission of the detailed feedback form.
 * @param {Event} event - The form submission event.
 */
export function handleFeedbackSubmit(event) {
    event.preventDefault();
    const messageId = document.getElementById('feedbackMessageId').value;
    const reason = document.getElementById('feedbackReason').value;
    const comment = document.getElementById('feedbackComment').value;

    addFeedbackData({
        messageId: messageId,
        feedback: 'no',
        reason: reason,
        comment: comment,
        timestamp: new Date().toISOString()
    });

    alert(getTranslation('alertFeedbackSubmitted'));
    document.getElementById('feedbackForm').reset();
    closeModal('feedbackModal');

    const buttons = document.querySelector(`.message[data-message-id="${messageId}"] .feedback-buttons`);
    if (buttons) {
        buttons.querySelectorAll('button').forEach(btn => btn.disabled = true);
    }
}


export async function handleFileUpload(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/chatbot/upload-file/', {
        method: 'POST',
        body: formData
    });

    if (response.ok) {
        const data = await response.json();
        const chatInput = document.getElementById('chatInput');
        chatInput.value = data.text.slice(0, 2000);
        chatInput.focus();
    } else {
        const err = await response.json().catch(() => null);
        alert(`파일 업로드 실패: ${err?.error || response.statusText}`);
    }
}


