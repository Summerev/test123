// static/js/rag_integration.js - 기존 코드와 충돌 방지용

// 🔥 기존 main.js와 충돌 방지를 위한 네임스페이스
window.RAG = window.RAG || {};

// 기존 함수들 백업 (덮어쓰기 방지)
const originalSendMessage = window.sendMessage;
const originalHandleFileUpload = window.handleFileUpload;

// RAG 기능 활성화 여부 확인
RAG.isEnabled = () => {
    return document.getElementById('ragToggle')?.checked && 
           document.querySelector('[data-user-authenticated="true"]');
};

// 기존 sendMessage 함수 확장
window.sendMessage = function() {
    console.log('📤 메시지 전송 (RAG 통합 버전)');
    
    if (RAG.isEnabled() && window.chatManager) {
        // RAG 모드: 새로운 기능 사용
        console.log('🔥 RAG 모드로 메시지 전송');
        window.chatManager.sendMessage();
    } else if (originalSendMessage) {
        // 기존 모드: 원래 함수 사용
        console.log('📝 기존 모드로 메시지 전송');
        originalSendMessage();
    } else {
        // 폴백: 기본 채팅 API 직접 호출
        console.log('🔄 폴백 모드로 메시지 전송');
        RAG.fallbackSendMessage();
    }
};

// 기존 handleFileUpload 함수 확장
window.handleFileUpload = function(event) {
    console.log('📁 파일 업로드 (RAG 통합 버전)');
    
    if (RAG.isEnabled() && window.chatManager) {
        // RAG 모드: 새로운 기능 사용
        console.log('🔥 RAG 모드로 파일 업로드');
        window.chatManager.handleFileUpload(event);
    } else if (originalHandleFileUpload) {
        // 기존 모드: 원래 함수 사용
        console.log('📝 기존 모드로 파일 업로드');
        originalHandleFileUpload(event);
    } else {
        // 폴백: 기본 업로드 처리
        console.log('🔄 폴백 모드로 파일 업로드');
        RAG.fallbackFileUpload(event);
    }
};

// 폴백 함수들
RAG.fallbackSendMessage = function() {
    const input = document.getElementById('chatInput');
    const message = input?.value?.trim();
    
    if (!message) return;
    
    // 기존 API 호출 방식 사용
    fetch('/chatbot/chat-api/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': RAG.getCSRFToken(),
        },
        body: JSON.stringify({ message: message })
    })
    .then(response => response.json())
    .then(data => {
        RAG.showMessage('user', message);
        RAG.showMessage('assistant', data.reply || data.error);
        input.value = '';
    })
    .catch(error => {
        console.error('메시지 전송 오류:', error);
        RAG.showMessage('system', '❌ 메시지 전송 중 오류가 발생했습니다.');
    });
};

RAG.fallbackFileUpload = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    fetch('/chatbot/upload-file/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': RAG.getCSRFToken(),
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.text) {
            RAG.showAttachmentPreview(file.name, data.text.substring(0, 500) + '...');
            RAG.showMessage('system', `📄 파일 업로드 완료: ${file.name}`);
        } else {
            RAG.showMessage('system', `❌ ${data.error}`);
        }
    })
    .catch(error => {
        console.error('파일 업로드 오류:', error);
        RAG.showMessage('system', '❌ 파일 업로드 중 오류가 발생했습니다.');
    });
};

// 유틸리티 함수들
RAG.getCSRFToken = function() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || 
           document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
           '';
};

RAG.showMessage = function(type, content) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const icons = {
        'user': '👤',
        'assistant': '🤖', 
        'system': '📢'
    };
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-icon">${icons[type] || '💬'}</span>
            <span class="message-time">${new Date().toLocaleTimeString()}</span>
        </div>
                <div class="message-content">${content}</div>
            `;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        };