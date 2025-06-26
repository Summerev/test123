// static/js/ui/modalManager.js
import { $, $$, on, addClass, removeClass } from '../utils/domHelpers.js';
import { getTranslation } from '../data/translation.js'; // Import translation utility
import { loginUser, signupUser } from '../api/authAPI.js'; // Import authentication API functions
import { clearAllChats, exportAllChats, hasChatToExport } from '../data/chatHistoryManager.js';

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


    // Connect modal switch links (e.g., "Don't have an account? Sign Up")
    const noAccountLink = $('#noAccountLink');
    const alreadyAccountLink = $('#alreadyAccountLink');

    if (noAccountLink) on(noAccountLink, 'click', (e) => { e.preventDefault(); switchModal('loginModal', 'signupModal'); });
    if (alreadyAccountLink) on(alreadyAccountLink, 'click', (e) => { e.preventDefault(); switchModal('signupModal', 'loginModal'); });
}

function showModal(message, actionBtnText, actionBtnClass, onConfirm, allowOutsideClose = false) {
    const modal = document.getElementById('customModal');
    const msg = document.getElementById('modalMessage');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const actionBtn = document.getElementById('modalActionBtn');

    msg.innerHTML = message;
    cancelBtn.textContent = getTranslation('cancel');
    actionBtn.textContent = actionBtnText;
    actionBtn.className = '';
    actionBtn.classList.add(actionBtnClass);
    modal.classList.remove('hidden');

    // ✅ 바깥 클릭 처리
    function outsideClickHandler(e) {
        if (e.target === modal && allowOutsideClose) {
            modal.classList.add('hidden');
            modal.removeEventListener('click', outsideClickHandler);
        }
    }

    // 기존 이벤트 제거 후 다시 바인딩
    const newActionBtn = actionBtn.cloneNode(true);
    actionBtn.parentNode.replaceChild(newActionBtn, actionBtn);

    newActionBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        onConfirm();
    });

    cancelBtn.onclick = () => modal.classList.add('hidden');

    // ✅ 바깥 클릭 이벤트는 모달에 직접 바인딩
    modal.addEventListener('click', outsideClickHandler);
}


// 내보내기 버튼
document.getElementById('exportChatBtn').addEventListener('click', () => {
    if (!hasChatToExport()) {
        showModal(
            getTranslation('noRecentChats'),     // 메시지: "내보낼 대화가 없습니다"
            getTranslation('confirm'),           // 버튼 텍스트: "확인"
            'primary',                           // 버튼 스타일
            () => { },                            // 확인 버튼 클릭 시 아무 동작 없음
            true                                  // ✅ 바깥 클릭 시 모달 닫기 허용
        );
        return;
    }

    showModal(
        getTranslation('confirmExportChat'),     // 메시지: "정말 내보내시겠습니까?"
        getTranslation('export'),                // 버튼 텍스트: "내보내기"
        'primary',                               // 버튼 스타일
        () => {
            exportAllChats();                    // 실제 내보내기 실행
        },
        false                                     // ❌ 바깥 클릭 시 닫기 금지 (확인 필요)
    );
});

// 전체 삭제 버튼

document.getElementById('clearChatBtn').addEventListener('click', () => {
    showModal(
        getTranslation('confirmClearChat'),
        getTranslation('deleteAll'),
        'danger',
        () => {
            clearAllChats();  // ✅ 진짜 삭제 여기서 실행
        }
    );
});

export { showModal };