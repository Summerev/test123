// static/js/ui/chatUI.js
import { $, $$, on, addClass, removeClass, escapeRegExp } from '../utils/domHelpers.js';
import { getTranslation, getLegalTerms, getCurrentLanguage } from '../data/translation.js';
import { formatTimestamp } from '../data/chatHistoryManager.js';

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

                            // Select term and explanation based on current language
                            const currentLangCode = getCurrentLanguage();
                            if (currentLangCode === 'en' && termData.en_term) {
                                displayTerm = termData.en_term;
                                const enSpecificTermData = getLegalTerms().en[termData.en_term.toLowerCase()];
                                if (enSpecificTermData) displayExplanation = enSpecificTermData.explanation;
                            } else if (currentLangCode === 'ja' && termData.ja_term) {
                                displayTerm = termData.ja_term;
                                const jaSpecificTermData = getLegalTerms().ja[termData.ja_term.toLowerCase()];
                                if (jaSpecificTermData) displayExplanation = jaSpecificTermData.explanation;
                            } else if (currentLangCode === 'zh' && termData.zh_term) {
                                displayTerm = termData.zh_term;
                                const zhSpecificTermData = getLegalTerms().zh[termData.zh_term.toLowerCase()];
                                if (zhSpecificTermData) displayExplanation = zhSpecificTermData.explanation;
                            } else if (currentLangCode === 'es' && termData.es_term) {
                                displayTerm = termData.es_term;
                                const esSpecificTermData = getLegalTerms().es[termData.es_term.toLowerCase()];
                                if (esSpecificTermData) displayExplanation = esSpecificTermData.explanation;
                            } else if (currentLangCode === 'ko') { // Default to Korean if no specific translation found
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

        // Feedback button event listeners are handled by event delegation in main.js
        // If feedback already exists for this message, disable buttons
        // const existingFeedback = getFeedbackData().find((f) => f.messageId === messageId);
        // if (existingFeedback) {
        //     feedbackDiv.querySelectorAll('button').forEach((btn) => (btn.disabled = true));
        // }
    }

    chatMessagesContainer.appendChild(messageElement);

    // Scroll to bottom after adding new message
    if (!isHistory) {
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }
    return messageElement; // Return the created element (e.g., for updating loading messages)
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
 * @param {boolean} hide - True to hide, false to show.
 */
export function toggleWelcomeMessage(hide) {
    if (welcomeMessage) {
        if (hide) {
            addClass(welcomeMessage, 'hidden');
        } else {
            removeClass(welcomeMessage, 'hidden');
            // Translations for welcome message content are handled by applyTranslations in main.js
        }
    }
}
