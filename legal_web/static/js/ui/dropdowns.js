// static/js/ui/dropdowns.js
import { $, $$, on, toggleClass, removeClass } from '../utils/domHelpers.js';
import { getTranslation } from '../data/translation.js'; // Import translation utility

/**
 * Toggles the visibility of a dropdown menu.
 * @param {HTMLElement} dropdownElement - The dropdown element to toggle.
 * @param {HTMLElement} buttonElement - The button that triggers the dropdown.
 */
function toggleDropdown(dropdownElement, buttonElement) {
    if (!dropdownElement || !buttonElement) return;

    // Close other active dropdowns
    $$('.language-dropdown.active').forEach((activeDropdown) => {
        if (activeDropdown !== dropdownElement) {
            removeClass(activeDropdown, 'active');
            const activeIcon = activeDropdown.previousElementSibling
                ? activeDropdown.previousElementSibling.querySelector('.dropdown-icon')
                : null;
            if (activeIcon) activeIcon.style.transform = 'rotate(0deg)';
        }
    });

    toggleClass(dropdownElement, 'active');
    const icon = buttonElement.querySelector('.dropdown-icon');
    if (icon) {
        icon.style.transform = dropdownElement.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
    }
}

/**
 * Initializes dropdown menu functionalities (언어 선택만).
 */
export function initDropdowns() {
    const languageMenu = $('.language-selector');
    const languageBtn = $('.language-btn', languageMenu);
    const languageDropdown = $('#languageDropdown', languageMenu);

    // 언어 드롭다운 버튼
    if (languageBtn && languageDropdown) {
        on(languageBtn, 'click', (e) => {
            e.stopPropagation();
            toggleDropdown(languageDropdown, languageBtn);
        });

        $$('#languageDropdown .dropdown-item').forEach((item) => {
            on(item, 'click', function (e) {
                e.preventDefault();
                const lang = this.dataset.lang;
                if (lang) {
                    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
                }
                removeClass(languageDropdown, 'active');
                const icon = languageBtn.querySelector('.dropdown-icon');
                if (icon) icon.style.transform = 'rotate(0deg)';
            });
        });
    }

    // 외부 클릭 시 드롭다운 닫기
    on(document, 'click', (e) => {
        if (languageDropdown && languageDropdown.classList.contains('active') && !languageMenu.contains(e.target)) {
            removeClass(languageDropdown, 'active');
            const icon = languageBtn.querySelector('.dropdown-icon');
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    });
}
