// static/js/logic/chatProcessor.js
import {
    getTranslation,

    addFeedbackData
} from '../data/translation.js';

import { closeModal } from '../ui/modalManager.js';



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


