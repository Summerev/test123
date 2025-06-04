// static/js/ui/sidebarCollapsible.js
import { $$, on, toggleClass } from '../utils/domHelpers.js';

/**
 * Toggles the expand/collapse state of a sidebar menu section.
 * @param {HTMLElement} headerElement - The clicked menu header element.
 */
function toggleMenu(headerElement) {
    const content = headerElement.nextElementSibling;
    const icon = headerElement.querySelector('.menu-icon');

    toggleClass(content, 'active');
    toggleClass(headerElement, 'active');

    if (content && content.classList.contains('active')) {
        // Set maxHeight dynamically based on scrollHeight for smooth transition
        content.style.maxHeight = content.scrollHeight + 'px';
        if (icon) icon.style.transform = 'rotate(180deg)';
    } else if (content) {
        content.style.maxHeight = '0px';
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
}

/**
 * Toggles the expand/collapse state of an info panel collapsible section.
 * @param {HTMLElement} headerElement - The clicked collapsible header element.
 */
function toggleCollapsible(headerElement) {
    const content = headerElement.nextElementSibling;
    const icon = headerElement.querySelector('.toggle-icon');

    toggleClass(headerElement, 'active');
    toggleClass(content, 'active');

    if (content && content.classList.contains('active')) {
        // Use CSS variable for max-height or content.scrollHeight
        content.style.maxHeight =
            getComputedStyle(document.documentElement)
                .getPropertyValue('--collapsible-content-max-height')
                .trim() || content.scrollHeight + 'px';
        if (icon) icon.style.transform = 'rotate(180deg)';
    } else if (content) {
        content.style.maxHeight = '0px';
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
}

/**
 * Initializes all sidebar menu and info panel collapsible sections.
 * Sets up click listeners and initial states.
 */
export function initCollapsibles() {
    // Initialize sidebar menu collapsibles
    $$('.sidebar .menu-header').forEach((header) => {
        on(header, 'click', () => toggleMenu(header));

        // Set initial state
        const content = header.nextElementSibling;
        const icon = header.querySelector('.menu-icon');
        if (content && !content.classList.contains('active')) {
            content.style.maxHeight = '0px';
            if (icon) icon.style.transform = 'rotate(0deg)';
        } else if (content && content.classList.contains('active')) {
            content.style.maxHeight = content.scrollHeight + 'px';
            if (icon) icon.style.transform = 'rotate(180deg)';
        }
    });

    // Initialize info panel collapsibles
    $$('.info-panel .collapsible-header').forEach((header) => {
        on(header, 'click', () => toggleCollapsible(header));

        // Set initial state
        const content = header.nextElementSibling;
        const icon = header.querySelector('.toggle-icon');
        if (content && !content.classList.contains('active')) {
            content.style.maxHeight = '0px';
            if (icon) icon.style.transform = 'rotate(0deg)';
        } else if (content && content.classList.contains('active')) {
            content.style.maxHeight =
                getComputedStyle(document.documentElement)
                    .getPropertyValue('--collapsible-content-max-height')
                    .trim() || content.scrollHeight + 'px';
            if (icon) icon.style.transform = 'rotate(180deg)';
        }
    });
}
