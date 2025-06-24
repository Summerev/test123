// static/js/chat_enhanced.js - RAG 기능 통합 JavaScript (오류 수정)

class EnhancedChatManager {
    constructor() {
        this.currentDocument = null;
        this.ragEnabled = true;
        this.language = 'korean';
        this.init();
    }

    init() {
        this.bindEvents();
        // API가 준비되지 않은 경우를 대비해 초기 문서 체크는 선택적으로
        this.checkCurrentDocumentSafely();
        this.setupLanguageSelector();
    }

    bindEvents() {
        // 기존 이벤트들
        document.getElementById('sendButton')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 파일 업로드 이벤트
        document.getElementById('fileInput')?.addEventListener('change', (e) => this.handleFileUpload(e));
        document.getElementById('fileAddBtn')?.addEventListener('click', () => {
            document.getElementById('fileInput')?.click();
        });

        // RAG 관련 이벤트들
        document.getElementById('ragToggle')?.addEventListener('change', (e) => {
            this.ragEnabled = e.target.checked;
            this.updateRagStatus();
        });

        document.getElementById('clearDocumentBtn')?.addEventListener('click', () => this.clearCurrentDocument());
    }

    setupLanguageSelector() {
        const langSelector = document.getElementById('languageSelector');
        if (langSelector) {
            langSelector.addEventListener('change', (e) => {
                this.language = e.target.value;
                this.showMessage('system', `언어가 ${e.target.value}로 변경되었습니다.`);
            });
        }
    }

    async checkCurrentDocumentSafely() {
        // API가 아직 준비되지 않은 경우를 대비한 안전한 체크
        try {
            const response = await fetch('/chatbot/api/current-document/', {
                method: 'GET',
                headers: {
                    'X-CSRFToken': this.getCSRFToken(),
                    'Content-Type': 'application/json'
                }
            });

            // 응답이 HTML인지 JSON인지 확인
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                if (data.success && data.document) {
                    this.currentDocument = data.document;
                    this.updateDocumentStatus();
                }
            } else {
                // HTML 응답인 경우 (아직 API가 준비되지 않음)
                console.log('📝 API가 아직 준비되지 않음 - 기존 방식으로 동작');
            }
        } catch (error) {
            console.log('📝 현재 문서 확인 중 오류:', error.message);
            // 오류가 발생해도 계속 진행 (기존 방식으로 동작)
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 파일 크기 체크 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showMessage('system', '❌ 파일 크기가 10MB를 초과합니다.');
            return;
        }

        // 지원 형식 체크
        const allowedTypes = ['.pdf', '.docx', '.txt'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExt)) {
            this.showMessage('system', `❌ 지원하지 않는 파일 형식입니다. (지원: ${allowedTypes.join(', ')})`);
            return;
        }

        this.showMessage('system', `📄 파일 업로드 중: ${file.name}`);
        this.setLoading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('language', this.language);

            const response = await fetch('/chatbot/upload-file/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.getCSRFToken(),
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                if (data.rag_processed) {
                    // RAG 처리 성공
                    this.currentDocument = {
                        document_id: data.document_id,
                        title: file.name,
                        contract_type: data.contract_type,
                        chunk_count: data.chunk_count
                    };

                    this.updateDocumentStatus();
                    this.showMessage('system', `✅ ${data.message}`);

                    if (data.contract_type) {
                        this.showMessage('system', `🎯 감지된 계약서 유형: ${data.contract_type}`);
                    }

                    this.showMessage('system', `📊 ${data.chunk_count}개 조항으로 분할 완료`);

                } else {
                    // 기존 방식: 텍스트만 추출
                    this.showMessage('system', `📝 텍스트 추출 완료 (${data.text.length}자)`);
                    this.showAttachmentPreview(file.name, data.text.substring(0, 500) + '...');
                }
            } else {
                this.showMessage('system', `❌ ${data.error}`);
            }

        } catch (error) {
            console.error('파일 업로드 오류:', error);
            this.showMessage('system', '❌ 파일 업로드 중 오류가 발생했습니다.');
        } finally {
            this.setLoading(false);
            event.target.value = ''; // 파일 input 초기화
        }
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();

        if (!message) return;

        // 사용자 메시지 표시
        this.showMessage('user', message);
        input.value = '';
        this.setLoading(true);

        try {
            const requestData = {
                message: message,
                language: this.language,
                use_rag: this.ragEnabled && this.currentDocument !== null
            };

            // 문서가 있으면 document_id 추가
            if (this.currentDocument) {
                requestData.document_id = this.currentDocument.document_id;
            }

            const response = await fetch('/chatbot/chat-api/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken(),
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (response.ok) {
                // AI 응답 표시
                this.showMessage('assistant', data.reply);

                // RAG 정보 표시
                if (data.rag_used) {
                    this.showRAGInfo(data);
                }
            } else {
                this.showMessage('system', `❌ ${data.error}`);
            }

        } catch (error) {
            console.error('메시지 전송 오류:', error);
            this.showMessage('system', '❌ 메시지 전송 중 오류가 발생했습니다.');
        } finally {
            this.setLoading(false);
        }
    }

    showMessage(type, content) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;

        let icon = '';
        switch (type) {
            case 'user': icon = '👤'; break;
            case 'assistant': icon = '🤖'; break;
            case 'system': icon = '📢'; break;
        }

        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-icon">${icon}</span>
                <span class="message-type">${this.getTypeLabel(type)}</span>
                <span class="message-time">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${this.formatMessage(content)}</div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Welcome 메시지 숨기기
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }

    showRAGInfo(data) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'rag-info';

        let infoContent = `<div class="rag-info-header">🔍 RAG 검색 정보</div>`;

        if (data.search_info) {
            infoContent += `<div class="search-info">${data.search_info}</div>`;
        }

        if (data.document_title) {
            infoContent += `<div class="document-info">📄 문서: ${data.document_title}</div>`;
        }

        if (data.contract_type) {
            infoContent += `<div class="contract-type">📋 유형: ${data.contract_type}</div>`;
        }

        if (data.search_results && data.search_results.length > 0) {
            infoContent += `<div class="search-results">
                <details>
                    <summary>검색된 조항들 (${data.search_results.length}개)</summary>
                    <ul>`;

            data.search_results.forEach((result, index) => {
                infoContent += `<li>${result.method} (점수: ${result.score?.toFixed(1) || 'N/A'})</li>`;
            });

            infoContent += `</ul></details></div>`;
        }

        infoDiv.innerHTML = infoContent;

        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.appendChild(infoDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    updateDocumentStatus() {
        const statusDiv = document.getElementById('documentStatus') || this.createDocumentStatusDiv();

        if (this.currentDocument) {
            statusDiv.innerHTML = `
                <div class="document-status active">
                    <div class="status-header">
                        <span class="status-icon">📄</span>
                        <span class="status-text">RAG 모드 활성</span>
                        <button id="clearDocumentBtn" class="clear-btn">×</button>
                    </div>
                    <div class="document-info">
                        <div>📁 ${this.currentDocument.title}</div>
                        ${this.currentDocument.contract_type ? `<div>📋 ${this.currentDocument.contract_type}</div>` : ''}
                        ${this.currentDocument.chunk_count ? `<div>📊 ${this.currentDocument.chunk_count}개 조항</div>` : ''}
                    </div>
                </div>
            `;

            // 이벤트 리스너 재연결
            document.getElementById('clearDocumentBtn')?.addEventListener('click', () => this.clearCurrentDocument());
            statusDiv.style.display = 'block';
        } else {
            statusDiv.innerHTML = `
                <div class="document-status inactive">
                    <span class="status-icon">📄</span>
                    <span class="status-text">문서 없음 (일반 채팅)</span>
                </div>
            `;
            statusDiv.style.display = 'block';
        }
    }

    createDocumentStatusDiv() {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'documentStatus';
        statusDiv.className = 'document-status-container';

        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.insertBefore(statusDiv, chatContainer.firstChild);
        }

        return statusDiv;
    }

    async clearCurrentDocument() {
        try {
            // API가 준비되지 않은 경우를 대비한 안전한 처리
            this.currentDocument = null;
            this.updateDocumentStatus();
            this.showMessage('system', '📄 문서가 초기화되었습니다. 일반 채팅 모드로 전환됩니다.');

            // API 호출 시도 (실패해도 무시)
            try {
                await fetch('/chatbot/api/clear-document/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': this.getCSRFToken(),
                        'Content-Type': 'application/json'
                    }
                });
            } catch (apiError) {
                console.log('API 호출 실패 (무시됨):', apiError.message);
            }
        } catch (error) {
            console.error('문서 초기화 오류:', error);
            this.showMessage('system', '❌ 문서 초기화 중 오류가 발생했습니다.');
        }
    }

    showAttachmentPreview(filename, content) {
        const previewDiv = document.getElementById('attachmentPreview');
        if (previewDiv) {
            previewDiv.innerHTML = `
                <div class="attachment-item">
                    <div class="attachment-header">
                        <span class="attachment-icon">📎</span>
                        <span class="attachment-name">${filename}</span>
                        <button class="remove-attachment" onclick="this.parentElement.parentElement.remove()">×</button>
                    </div>
                    <div class="attachment-content">
                        ${content}
                    </div>
                </div>
            `;
            previewDiv.style.display = 'block';
        }
    }

    formatMessage(content) {
        // 마크다운 스타일 포맷팅
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    getTypeLabel(type) {
        const labels = {
            'user': '사용자',
            'assistant': 'AI 어시스턴트',
            'system': '시스템'
        };
        return labels[type] || type;
    }

    setLoading(isLoading) {
        const sendButton = document.getElementById('sendButton');
        const chatInput = document.getElementById('chatInput');

        if (sendButton) {
            sendButton.disabled = isLoading;
            sendButton.textContent = isLoading ? '처리중...' : '전송';
        }

        if (chatInput) {
            chatInput.disabled = isLoading;
        }
    }

    getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
            '';
    }

    updateRagStatus() {
        const statusText = this.ragEnabled ? 'RAG 활성' : 'RAG 비활성';
        this.showMessage('system', `🔧 ${statusText}으로 설정되었습니다.`);
    }
}

// 페이지 로드 시 채팅 매니저 초기화 (안전한 방식)



// 전역 함수들 (기존 코드와의 호환성)
function sendMessage() {
    if (window.chatManager) {
        window.chatManager.sendMessage();
    } else {
        console.log('chatManager가 초기화되지 않음');
    }
}

function handleFileUpload(event) {
    if (window.chatManager) {
        window.chatManager.handleFileUpload(event);
    } else {
        console.log('chatManager가 초기화되지 않음');
    }
}