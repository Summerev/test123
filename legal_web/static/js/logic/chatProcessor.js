// static/js/logic/chatProcessor.js
import { sendMessageToBot } from '../api/chatAPI.js';
import { getTranslation, getLegalTerms, getCurrentInterpretationMode, generateMessageId, addFeedbackData } from '../data/translation.js'; // Import necessary functions from translation.js
import { addMessageToChatAndHistory, getChatHistory } from '../data/chatHistoryManager.js';
import { addMessageToUI, scrollToBottom, toggleWelcomeMessage } from '../ui/chatUI.js';
import { closeModal } from '../ui/modalManager.js'; // Import closeModal for feedback modal

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
                           getTranslation('spanishTerm') === 'Español' ? 'es' : 'ko'; // Get actual language

    // Add user message to UI and history
    const userMessageId = generateMessageId();
    const userTimestamp = new Date().toISOString();
    addMessageToChatAndHistory(userInput, 'user', userMessageId, userTimestamp);
    toggleWelcomeMessage(true); // Hide welcome message

    // Add bot response placeholder
    const botMessageId = generateMessageId();
    const botTimestamp = new Date().toISOString();
    const botMessagePlaceholder = addMessageToUI('응답 중...', 'bot', botMessageId, botTimestamp, false); // isHistory = false
    botMessagePlaceholder.classList.add('loading-message'); // Add loading indicator class
    scrollToBottom();

    // Call API (pass translation and legal terms data)
    const botResponse = await sendMessageToBot(userInput, currentMode, getTranslation, getLegalTerms(), currentLanguage);

    // Process bot response
    if (botResponse.error) {
        botMessagePlaceholder.querySelector('.message-content').textContent = `오류: ${botResponse.error}`;
        botMessagePlaceholder.classList.add('error-message'); // Add error styling
    } else {
        // Update placeholder message with actual bot response
        botMessagePlaceholder.querySelector('.message-content').innerHTML = botResponse.text || '응답 없음';
    }
    botMessagePlaceholder.classList.remove('loading-message'); // Remove loading indicator
    scrollToBottom();

    // Update the bot message in history with the final content
    const history = getChatHistory();
    const botMessageInHistoryIndex = history.findIndex(msg => msg.id === botMessageId);
    if (botMessageInHistoryIndex > -1) {
        history[botMessageInHistoryIndex].text = botResponse.text || '응답 없음';
        // saveChatHistory() is called by addMessageToChatAndHistory
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
        // For 'no' feedback, open the detailed feedback modal
        const feedbackMessageIdInput = document.getElementById('feedbackMessageId');
        if (feedbackMessageIdInput) {
            feedbackMessageIdInput.value = messageId;
        }
        openModal('feedbackModal');
    } else {
        // For 'yes' feedback, just save and disable buttons
        addFeedbackData({ messageId: messageId, feedback: feedbackType, timestamp: new Date().toISOString() });
        alert(getTranslation('alertFeedbackSubmitted')); // Replace with custom modal
        event.target.closest('.feedback-buttons').querySelectorAll('button').forEach((btn) => (btn.disabled = true));
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
        timestamp: new Date().toISOString(),
    });

    console.log('Detailed feedback:', { messageId, reason, comment });
    alert(getTranslation('alertFeedbackSubmitted')); // Replace with custom modal
    document.getElementById('feedbackForm').reset();
    closeModal('feedbackModal'); // Close feedback modal

    // Disable feedback buttons on the original message
    const messageFeedbackButtons = document.querySelector(
        `.message[data-message-id="${messageId}"] .feedback-buttons`
    );
    if (messageFeedbackButtons) {
        messageFeedbackButtons.querySelectorAll('button').forEach((btn) => (btn.disabled = true));
    }
}
