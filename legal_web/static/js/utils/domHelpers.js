// static/js/utils/domHelpers.js

/**
 * CSS 선택자를 사용하여 단일 요소를 찾습니다.
 * @param {string} selector - CSS selector string.
 * @param {HTMLElement|Document} [parent=document] - Parent element or document to search within.
 * @returns {HTMLElement|null} Found element or null.
 */
export function $(selector, parent = document) {
    return parent.querySelector(selector);
}

/**
 * CSS 선택자를 사용하여 모든 일치하는 요소를 찾습니다.
 * @param {string} selector - CSS selector string.
 * @param {HTMLElement|Document} [parent=document] - Parent element or document to search within.
 * @returns {NodeListOf<HTMLElement>} NodeList of found elements.
 */
export function $$(selector, parent = document) {
    return parent.querySelectorAll(selector);
}

/**
 * Adds a class to an element.
 * @param {HTMLElement} element - The element to add the class to.
 * @param {string} className - The class name to add.
 */
export function addClass(element, className) {
    if (element) element.classList.add(className);
}

/**
 * Removes a class from an element.
 * @param {HTMLElement} element - The element to remove the class from.
 * @param {string} className - The class name to remove.
 */
export function removeClass(element, className) {
    if (element) element.classList.remove(className);
}

/**
 * Toggles a class on an element (adds if not present, removes if present).
 * @param {HTMLElement} element - The element to toggle the class on.
 * @param {string} className - The class name to toggle.
 */
export function toggleClass(element, className) {
    if (element) element.classList.toggle(className);
}

/**
 * Adds an event listener to an element.
 * @param {HTMLElement|Document} element - The element to listen for events on.
 * @param {string} eventType - The type of event (e.g., 'click', 'keypress').
 * @param {function} handler - The function to execute when the event occurs.
 */
export function on(element, eventType, handler) {
    if (element) element.addEventListener(eventType, handler);
}

/**
 * Escapes a string for use in a regular expression.
 * @param {string} string - The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}


/**
 * 쿠키 이름으로 쿠키 값을 가져옵니다. (CSRF 토큰 등에 사용)
 * @param {string} name - 가져올 쿠키의 이름
 * @returns {string|null} 쿠키 값 또는 null
 */
export function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
/**
 * 요소 생성 헬퍼 함수
 * @param {string} tag - 태그 이름 (예: 'div', 'input')
 * @param {string} [className] - 클래스 이름
 * @param {string} [text] - 텍스트 콘텐츠
 * @returns {HTMLElement} 생성된 DOM 요소
 */
export function createElement(tag, className = '', text = '') {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
}

