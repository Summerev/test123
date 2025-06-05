// static/js/api/authAPI.js
import { getTranslation } from '../data/translation.js';

// Django CSRF 토큰 가져오기 함수
function getCsrfToken() {
    const token = document.querySelector('[name=csrfmiddlewaretoken]');
    return token ? token.value : '';
}

/**
 * Django 백엔드 로그인 API 호출
 * @param {string} email - User's email.
 * @param {string} password - User's password.
 * @returns {Promise<object>} A Promise containing the login response data.
 */
export async function loginUser(email, password) {
    console.log('Login attempt:', email);
    
    try {
        const response = await fetch('/accounts/api/login/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                // 'X-CSRFToken': getCsrfToken(), // CSRF 보호가 필요한 경우 주석 해제
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // 로그인 성공시 사용자 정보 저장 (선택사항)
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
            error: '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.'
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
        const response = await fetch('/accounts/api/signup/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                // 'X-CSRFToken': getCsrfToken(), // CSRF 보호가 필요한 경우 주석 해제
            },
            body: JSON.stringify({
                name: name,
                email: email,
                password: password,
                confirmPassword: confirmPassword
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // 회원가입 성공시 사용자 정보 저장 (선택사항)
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
            error: '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.'
        };
    }
}

/**
 * 로그아웃 API 호출
 * @returns {Promise<object>} A Promise containing the logout response data.
 */
export async function logoutUser() {
    try {
        const response = await fetch('/accounts/logout/', {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCsrfToken(),
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // 로컬 스토리지에서 사용자 정보 제거
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
            error: '서버 연결에 실패했습니다.'
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