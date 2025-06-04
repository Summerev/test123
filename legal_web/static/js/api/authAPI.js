// static/js/api/authAPI.js
import { getTranslation } from '../data/translation.js';

/**
 * Calls the user login API. (Mock implementation)
 * @param {string} email - User's email.
 * @param {string} password - User's password.
 * @returns {Promise<object>} A Promise containing the login response data.
 */
export async function loginUser(email, password) {
    console.log('Login attempt:', email, password);
    // Real API call logic should be implemented here.
    // Example: const response = await fetch('/api/auth/login', { ... });
    return new Promise(resolve => {
        setTimeout(() => {
            // Mock response
            if (email === 'test@example.com' && password === 'password123') {
                resolve({ success: true, message: 'Login successful!', user: { username: 'TestUser' } });
            } else {
                resolve({ success: false, error: getTranslation('alertLoginNotImplemented') });
            }
        }, 500);
    });
}

/**
 * Calls the user signup API. (Mock implementation)
 * @param {string} name - User's name.
 * @param {string} email - User's email.
 * @param {string} password - User's password.
 * @param {string} confirmPassword - Password confirmation.
 * @returns {Promise<object>} A Promise containing the signup response data.
 */
export async function signupUser(name, email, password, confirmPassword) {
    console.log('Signup attempt:', name, email, password, confirmPassword);
    // Real API call logic should be implemented here.
    // Example: const response = await fetch('/api/auth/signup', { ... });
    return new Promise(resolve => {
        setTimeout(() => {
            // Mock response
            if (password !== confirmPassword) {
                resolve({ success: false, error: '비밀번호가 일치하지 않습니다.' });
            } else if (password.length < 8) {
                resolve({ success: false, error: '비밀번호는 8자 이상이어야 합니다.' });
            } else {
                resolve({ success: false, error: getTranslation('alertSignupNotImplemented') });
            }
        }, 500);
    });
}
