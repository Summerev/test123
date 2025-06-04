// static/js/main.js

// Import utilities
import { $, $$, on } from './utils/domHelpers.js';

// Import data management modules
import {
    getTranslation,
    applyTranslations,
    changeLanguage,
    getCurrentInterpretationMode,
    setInterpretationMode,
    getEnterKeySends,
    setEnterKeySends,
    getCurrentTheme
} from './data/translation.js';
import { loadRecentChats, loadChatHistoryFromStorage, clearAllChats, getChatHistory, formatTimestamp } from './data/chatHistoryManager.js';

// Import UI component initialization modules
import { initThemeToggle } from './ui/themeToggle.js';
import { initDropdowns } from './ui/dropdowns.js';
import { initCollapsibles } from './ui/sidebarCollapsible.js';
import { initModals, openModal } from './ui/modalManager.js'; // Only need openModal here for direct calls
import { initChatInputAutoResize, initExamplePrompts } from './ui/chatUI.js';

// Import core logic modules
import { processUserMessage, handleFeedbackClick, handleFeedbackSubmit } from './logic/chatProcessor.js';


// DOM element references
const chatInput = $('#chatInput');
const sendButton = $('#sendButton');
const exportChatButton = $('#exportChatBtn');
const clearChatButton = $('#clearChatBtn');
const enterKeyToggle = $('#enterKeyToggle');
const interpretationModeRadios = $$('input[name="interpretationModeSidebar"]');
const feedbackForm = $('#feedbackForm');
const recentChatsList = $('#recentChatsList');


document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Setup and State Loading
    applyTranslations(); // Apply UI text translations first
    initThemeToggle(); // Initialize theme toggle and apply saved theme

    // Initialize interpretation mode radio buttons based on saved state
    const defaultModeRadio = $('#defaultModeSidebar');
    const easyModeRadio = $('#easyModeSidebar');
    if (getCurrentInterpretationMode() === 'easy' && easyModeRadio) {
        easyModeRadio.checked = true;
    } else if (defaultModeRadio) {
        defaultModeRadio.checked = true;
        setInterpretationMode('default'); // Ensure default mode is explicitly set if no 'easy' preference
    }

    // Initialize Enter key send setting
    if (enterKeyToggle) {
        enterKeyToggle.checked = getEnterKeySends();
    }

    // 2. Initialize UI Components
    initDropdowns();
    initCollapsibles();
    initModals(); // Initialize modal-related event listeners
    initChatInputAutoResize(); // Auto-resize chat input field
    initExamplePrompts(); // Example prompt click events

    // 3. Load Chat History and Recent Chats
    loadChatHistoryFromStorage(); // Load and display chat messages
    loadRecentChats(); // Load recent chat titles in sidebar

    // 4. Connect Main Event Listeners

    // Chat input and send functionality
    if (sendButton) {
        on(sendButton, 'click', () => {
            if (chatInput && chatInput.value.trim()) {
                processUserMessage(chatInput.value.trim());
                chatInput.value = ''; // Clear input
                chatInput.style.height = 'auto'; // Reset height
                sendButton.disabled = true; // Disable button
            }
        });
    }

    if (chatInput) {
        on(chatInput, 'keypress', (e) => {
            if (getEnterKeySends() && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevent newline
                sendButton.click(); // Trigger send button click
            }
        });
    }

    // Sidebar "Export Conversation" button
    if (exportChatButton) {
        on(exportChatButton, 'click', () => {
            if (getChatHistory().length === 0) {
                alert(getTranslation('noRecentChats')); // Use custom modal instead of alert
                return;
            }
            const formattedChat = getChatHistory()
                .map(
                    (msg) =>
                        `[${formatTimestamp(msg.timestamp)}] ${msg.sender === 'user' ? 'User' : getTranslation('botName')
                        }:\n${msg.text}`
                )
                .join('\n\n');
            const blob = new Blob([formattedChat], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `legalbot_chat_${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        });
        exportChatButton.title = getTranslation('exportChatTooltip');
    }

    // Sidebar "Clear All Chats" button
    if (clearChatButton) {
        on(clearChatButton, 'click', clearAllChats);
        clearChatButton.title = getTranslation('clearChatTooltip');
    }

    // Interpretation mode radio buttons change event
    interpretationModeRadios.forEach((radio) => {
        on(radio, 'change', function () {
            if (this.checked) {
                setInterpretationMode(this.value);
            }
        });
    });

    // Enter key send toggle switch change event
    if (enterKeyToggle) {
        on(enterKeyToggle, 'change', function () {
            setEnterKeySends(this.checked);
        });
    }

    // Feedback buttons (👍/👎) event delegation on chat messages container
    on($('#chatMessages'), 'click', (e) => {
        if (e.target.classList.contains('feedback-yes') || e.target.classList.contains('feedback-no')) {
            handleFeedbackClick(e);
        }
    });

    // Feedback form submission
    if (feedbackForm) {
        on(feedbackForm, 'submit', handleFeedbackSubmit);
    }

    // Custom event listener for language change (dispatched from dropdowns.js)
    on(document, 'languageChanged', (e) => {
        changeLanguage(e.detail.lang); // Update language state and apply translations
        loadChatHistoryFromStorage(); // Reload chat messages to apply new language
        loadRecentChats(); // Reload recent chats list to apply new language
    });

    // Event delegation for recent chat items click (to load specific chat)
    on(recentChatsList, 'click', (e) => {
        const chatItem = e.target.closest('.chat-item');
        if (chatItem && !chatItem.classList.contains('no-chats-item')) {
            const fullText = chatItem.title; // Get full text from title attribute
            if (chatInput) {
                chatInput.value = fullText;
                chatInput.focus();
                sendButton.disabled = false;
                chatInput.dispatchEvent(new Event('input')); // Trigger input event for auto-resize
            }
            // In a real app, you would load the full conversation history for this chatId
            // const chatId = chatItem.dataset.chatId;
            // alert(`Chat ID: ${chatId} load functionality needs to be implemented.`);
            // loadSpecificChat(chatId);
        }
    });
});
