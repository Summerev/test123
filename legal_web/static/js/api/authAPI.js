// static/js/api/authAPI.js

import { getTranslation } from '../data/translation.js';

// Django CSRF 토큰 가져오기 함수 (쿠키에서 가져오는 방식으로 수정)
function getCsrfToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    console.log('CSRF Token Value from cookie:', cookieValue); // 이 로그를 확인하세요
    return cookieValue;
}

/**
 * Django 백엔드 로그인 API 호출
 * @param {string} email - User's email.
 * @param {string} password - User's password.
 * @param {boolean} rememberMe - Whether to keep the user logged in for 30 days.
 * @returns {Promise<object>} A Promise containing the login response data.
 */
export async function loginUser(email, password, rememberMe) { // rememberMe 매개변수 추가
    console.log('Login attempt:', email, 'Remember Me:', rememberMe); // 디버깅 로그 추가
    
    try {
        const csrfToken = getCsrfToken(); // CSRF 토큰 가져오기
        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken; // CSRF 토큰이 있으면 헤더에 추가
        }

        const response = await fetch('/accounts/api/login/', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                email: email,
                password: password,
                remember_me: rememberMe // remember_me 값 추가
            })
        });
        
        if (!response.ok) {
            // 서버에서 에러 메시지가 있다면 파싱
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            
            return {
                success: true,
                message: data.message,
                user: data.user
            };
        } else {
            return {
                success: false,
                error: data.error || '로그인에 실패했습니다.'
            };
        }
        
    } catch (error) {
        console.error('Login API Error:', error);
        return {
            success: false,
            error: error.message || '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.'
        };
    }
}

/**
 * Django 백엔드 회원가입 API 호출
 * @param {string} name - User's name.
 * @param {string} email - User's email.
 * @param {string} password - User's password.
 * @param {string} confirmPassword - Password confirmation.
 * @returns {Promise<object>} A Promise containing the signup response data.
 */
export async function signupUser(name, email, password, confirmPassword) {
    console.log('Signup attempt:', name, email);
    
    // 프론트엔드 기본 유효성 검사
    if (password !== confirmPassword) {
        return {
            success: false,
            error: '비밀번호가 일치하지 않습니다.'
        };
    }
    
    if (password.length < 8) {
        return {
            success: false,
            error: '비밀번호는 8자 이상이어야 합니다.'
        };
    }
    
    if (!name.trim()) {
        return {
            success: false,
            error: '이름을 입력해주세요.'
        };
    }
    
    if (!isValidEmail(email)) {
        return {
            success: false,
            error: '올바른 이메일 주소를 입력해주세요.'
        };
    }
    
    try {
        const csrfToken = getCsrfToken(); // CSRF 토큰 가져오기
        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken; // CSRF 토큰이 있으면 헤더에 추가
        }

        const response = await fetch('/accounts/api/signup/', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                confirmPassword: confirmPassword
            })
        });
        
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            
            return {
                success: true,
                message: data.message,
                user: data.user
            };
        } else {
            return {
                success: false,
                error: data.error || '회원가입에 실패했습니다.'
            };
        }
        
    } catch (error) {
        console.error('Signup API Error:', error);
        return {
            success: false,
            error: error.message || '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.'
        };
    }
}

/**
 * 로그아웃 API 호출
 * @returns {Promise<object>} A Promise containing the logout response data.
 */
export async function logoutUser() {
    try {
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
            console.error("CSRF token not found in cookies. Cannot logout.");
            return { success: false, error: "CSRF token missing for logout." };
        }

        const response = await fetch('/accounts/logout/', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });

        const contentType = response.headers.get("content-type") || "";

        // 응답이 HTML이라면 로그인 페이지로 리디렉션되었을 가능성
        if (!response.ok || !contentType.includes("application/json")) {
            const text = await response.text();
            console.warn("Logout response was not JSON:", text.slice(0, 200));
            throw new Error("서버 응답이 올바르지 않습니다. 로그인 세션이 만료되었을 수 있습니다.");
        }

        const data = await response.json();

        if (data.success) {
            localStorage.removeItem('user');
            return {
                success: true,
                message: data.message
            };
        } else {
            return {
                success: false,
                error: '로그아웃에 실패했습니다.'
            };
        }
    } catch (error) {
        console.error('Logout API Error:', error);
        return {
            success: false,
            error: error.message || '서버 연결에 실패했습니다.'
        };
    }
}

/**
 * 현재 로그인된 사용자 정보 확인
 * @returns {object|null} User object if logged in, null otherwise
 */
export function getCurrentUser() {
    try {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

/**
 * 사용자 로그인 상태 확인
 * @returns {boolean} True if user is logged in, false otherwise
 */
export function isLoggedIn() {
    return getCurrentUser() !== null;
}

// 유틸리티 함수들

/**
 * 이메일 형식 유효성 검사
 * @param {string} email 
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 비밀번호 강도 확인
 * @param {string} password 
 * @returns {object} {isStrong: boolean, message: string}
 */
export function checkPasswordStrength(password) {
    const minLength = 8;
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
        return { isStrong: false, message: '비밀번호는 8자 이상이어야 합니다.' };
    }
    
    if (!hasLetter) {
        return { isStrong: false, message: '비밀번호에는 영문자가 포함되어야 합니다.' };
    }
    
    if (!hasNumber) {
        return { isStrong: false, message: '비밀번호에는 숫자가 포함되어야 합니다.' };
    }
    
    let strength = 'medium';
    if (hasLetter && hasNumber && hasSpecial && password.length >= 12) {
        strength = 'strong';
    }
    
    return { 
        isStrong: true, 
        strength: strength,
        message: strength === 'strong' ? '강력한 비밀번호입니다.' : '적절한 비밀번호입니다.'
    };
}