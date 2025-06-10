// static/js/ui/themeToggle.js
import { $, on, addClass, removeClass } from '../utils/domHelpers.js';
import { getCurrentTheme, setCurrentTheme, getTranslation } from '../data/translation.js';

/**
 * Applies the specified theme to the UI.
 * @param {string} theme - The theme to apply ('light' or 'dark').
 */
export function applyTheme(theme) {
    const themeToggleButton = $('#themeToggle');
    const themeIcon = themeToggleButton ? themeToggleButton.querySelector('.theme-icon') : null;

    if (theme === 'dark') {
        addClass(document.body, 'dark-mode');
        if (themeIcon) themeIcon.textContent = '☀️'; // Sun icon for dark mode
        if (themeToggleButton) themeToggleButton.title = getTranslation('themeToggleLight');
    } else {
        removeClass(document.body, 'dark-mode');
        if (themeIcon) themeIcon.textContent = '🌙'; // Moon icon for light mode
        if (themeToggleButton) themeToggleButton.title = getTranslation('themeToggleDark');
    }
    setCurrentTheme(theme); // Update theme state in translation.js
}

/**
 * Initializes the theme toggle functionality.
 * - Toggles the 'dark-mode' class on the body when the theme toggle button is clicked.
 * - Applies the saved theme on page load.
 */
export function initThemeToggle() {
    const themeToggleBtn = $('#themeToggle');
    if (!themeToggleBtn) {
        console.warn('Theme toggle button not found.');
        return;
    }

    // Apply initial theme
    applyTheme(getCurrentTheme());

    // Add click event listener to the button
    on(themeToggleBtn, 'click', () => {
        const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        applyTheme(newTheme);
    });
}
