// static/js/ui/modalManager.js
import { $, $$, on, addClass, removeClass } from '../utils/domHelpers.js';
import { getTranslation } from '../data/translation.js'; // Import translation utility
import { loginUser, signupUser } from '../api/authAPI.js'; // Import authentication API functions

let currentOpenModalId = null;

/**
 * Opens a specific modal.
 * @param {string} modalId - The ID of the modal to open (e.g., 'loginModal').
 */
export function openModal(modalId) {
    const modalOverlay = $(`#${modalId}`);
    if (!modalOverlay) {
        console.error(`Modal overlay not found: #${modalId}`);
        return;
    }

    addClass(modalOverlay, 'active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling of the background
    currentOpenModalId = modalId;
}

/**
 * Closes the currently open modal or a specified modal.
 * @param {string} [modalIdToClose] - The ID of the modal to close (defaults to current open modal).
 */
export function closeModal(modalIdToClose = currentOpenModalId) {
    if (!modalIdToClose) return;

    const modalOverlay = $(`#${modalIdToClose}`);
    if (modalOverlay) {
        removeClass(modalOverlay, 'active');
        document.body.style.overflow = 'auto'; // Re-enable scrolling
        if (currentOpenModalId === modalIdToClose) {
            currentOpenModalId = null;
        }
    }
}

/**
 * Closes the current modal and opens another.
 * @param {string} currentModalId - The ID of the currently open modal.
 * @param {string} targetModalId - The ID of the modal to open.
 */
export function switchModal(currentModalId, targetModalId) {
    closeModal(currentModalId);
    setTimeout(() => openModal(targetModalId), 150); // Small delay for animation
}

/**
 * Handles the submission of the login form.
 * @param {Event} event - The form submission event.
 */
export async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.elements.email.value;
    const password = form.elements.password.value;

    const result = await loginUser(email, password); // Call authAPI

    if (result.success) {
        alert('로그인 성공!'); // Replace with better UI feedback
        closeModal('loginModal');
    } else {
        alert(result.error || getTranslation('alertLoginNotImplemented')); // Display error message
    }
}

/**
 * Handles the submission of the signup form.
 * @param {Event} event - The form submission event.
 */
export async function handleSignup(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.elements.name.value;
    const email = form.elements.email.value;
    const password = form.elements.password.value;
    const confirmPassword = form.elements.confirmPassword.value;

    const result = await signupUser(name, email, password, confirmPassword); // Call authAPI

    if (result.success) {
        alert('회원가입 성공!'); // Replace with better UI feedback
        closeModal('signupModal');
    } else {
        alert(result.error || getTranslation('alertSignupNotImplemented')); // Display error message
    }
}

/**
 * Initializes modal-related event listeners.
 * - Connects open/close buttons and form submissions.
 */
export function initModals() {
    // Event listeners for modal close buttons
    $$('.modal-close').forEach(btn => {
        on(btn, 'click', () => {
            const modalId = btn.closest('.modal-overlay').id;
            closeModal(modalId);
        });
    });

    // Event listeners for clicking outside the modal content (on the overlay)
    $$('.modal-overlay').forEach((overlay) => {
        on(overlay, 'click', function (e) {
            if (e.target === this) { // Only close if the overlay itself is clicked
                closeModal(this.id);
            }
        });
    });

    // Connect login/signup buttons to open modals
    const loginBtn = $('#loginBtn');
    const signupBtn = $('#signupBtn');

    if (loginBtn) on(loginBtn, 'click', () => openModal('loginModal'));
    if (signupBtn) on(signupBtn, 'click', () => openModal('signupModal'));

    // Connect login/signup form submissions
    const loginForm = $('#loginForm');
    const signupForm = $('#signupForm');

    if (loginForm) on(loginForm, 'submit', handleLogin);
    if (signupForm) on(signupForm, 'submit', handleSignup);

    // Connect modal switch links (e.g., "Don't have an account? Sign Up")
    const noAccountLink = $('#noAccountLink');
    const alreadyAccountLink = $('#alreadyAccountLink');

    if (noAccountLink) on(noAccountLink, 'click', (e) => { e.preventDefault(); switchModal('loginModal', 'signupModal'); });
    if (alreadyAccountLink) on(alreadyAccountLink, 'click', (e) => { e.preventDefault(); switchModal('signupModal', 'loginModal'); });
}
