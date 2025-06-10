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
    $$('.features-dropdown.active, .language-dropdown.active').forEach((activeDropdown) => {
        if (activeDropdown !== dropdownElement) {
            removeClass(activeDropdown, 'active');
            const activeIcon = activeDropdown.previousElementSibling ? activeDropdown.previousElementSibling.querySelector('.dropdown-icon') : null;
            if (activeIcon) activeIcon.style.transform = 'rotate(0deg)';
        }
    });

    toggleClass(dropdownElement, 'active');
    const icon = buttonElement.querySelector('.dropdown-icon');
    if (icon) {
        if (dropdownElement.classList.contains('active')) {
            icon.style.transform = 'rotate(180deg)';
        } else {
            icon.style.transform = 'rotate(0deg)';
        }
    }
}

/**
 * Initializes dropdown menu functionalities.
 * - Adds click listeners to toggle dropdowns.
 * - Closes dropdowns when clicking outside.
 * - Handles clicks on dropdown items to trigger actions.
 */
export function initDropdowns() {
    const featureMenu = $('.features-menu');
    const languageMenu = $('.language-selector');

    const featureBtn = $('.features-btn', featureMenu);
    const languageBtn = $('.language-btn', languageMenu);

    const featureDropdown = $('#featuresDropdown', featureMenu); // Use ID for dropdown
    const languageDropdown = $('#languageDropdown', languageMenu); // Use ID for dropdown

    // Add click event listeners to each dropdown button
    if (featureBtn && featureDropdown) {
        on(featureBtn, 'click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            toggleDropdown(featureDropdown, featureBtn);
        });
    }

    if (languageBtn && languageDropdown) {
        on(languageBtn, 'click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            toggleDropdown(languageDropdown, languageBtn);
        });
    }

    // Add click event listener to the document to close dropdowns when clicking outside
    on(document, 'click', (e) => {
        if (featureDropdown && featureDropdown.classList.contains('active') && !featureMenu.contains(e.target)) {
            removeClass(featureDropdown, 'active');
            const icon = featureBtn ? featureBtn.querySelector('.dropdown-icon') : null;
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
        if (languageDropdown && languageDropdown.classList.contains('active') && !languageMenu.contains(e.target)) {
            removeClass(languageDropdown, 'active');
            const icon = languageBtn ? languageBtn.querySelector('.dropdown-icon') : null;
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    });

    // Feature dropdown item click event
    $$('#featuresDropdown .dropdown-item').forEach((item) => {
        on(item, 'click', function (e) {
            e.preventDefault();
            const featureKey = this.getAttribute('data-translate-key');
            const featureName = getTranslation(featureKey) || this.textContent;
            console.log('Navigating to (simulated):', featureName);
            alert(getTranslation('alertFeatureNavigation', featureName)); // Use custom modal instead of alert

            if (featureDropdown) removeClass(featureDropdown, 'active');
            const icon = featureBtn ? featureBtn.querySelector('.dropdown-icon') : null;
            if (icon) icon.style.transform = 'rotate(0deg)';
        });
    });

    // Language dropdown item click event (dispatches custom event)
    $$('#languageDropdown .dropdown-item').forEach((item) => {
        on(item, 'click', function (e) {
            e.preventDefault();
            const lang = this.dataset.lang; // HTML needs data-lang="en" etc.
            if (lang) {
                // Dispatch a custom event for language change, main.js will listen
                document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
            }
            if (languageDropdown) removeClass(languageDropdown, 'active');
            const icon = languageBtn ? languageBtn.querySelector('.dropdown-icon') : null;
            if (icon) icon.style.transform = 'rotate(0deg)';
        });
    });
}
