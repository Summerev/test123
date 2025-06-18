// legal_web/static/js/ui/fileUpLoadUI.js (정리된 최종 버전)

import { createNewSession } from '../ui/chatUI.js';
import { saveChatHistoryWithTitle, getChatSessionList } from '../data/chatHistoryManager.js';
import { renderRecentChats, addMessageToUI } from './chatUI.js';
import { getActiveTab, chatSessions, openTabs } from '../state/chatTabState.js';
import { renderTabs, generateSessionId } from '../main.js';
import { saveTabState } from '../state/chatTabState.js';

// DOM 요소 참조
let welcomeMessageDiv;
let chatInputContainer;
let fileUploadInput;
let fileNameDisplay;
let selectedDocType = null;
let docTypeContractBtn;
let docTypeTermsBtn;
let browseFileButton;
let dropArea;
let fileInfoMessage;

/**
 * 드래그 앤 드롭 영역의 활성화/비활성화 상태를 설정합니다.
 */
function setDropAreaEnabled(isEnabled) {
    if (isEnabled) {
        dropArea.classList.remove('disabled');
        dropArea.classList.add('enabled');
        fileInfoMessage.style.display = 'none';
    } else {
        dropArea.classList.add('disabled');
        dropArea.classList.remove('enabled');
        fileInfoMessage.style.display = 'block';
    }
}

/**
 * 실제 파일 업로드를 서버로 전송하고 결과를 처리합니다.
 * @param {File} file - 업로드할 파일 객체
 */
async function handleFile(file) {
    if (!file || !selectedDocType) {
        if (!selectedDocType) {
            alert('파일을 업로드하기 전에 문서 유형을 먼저 선택해주세요.');
            if (fileUploadInput) fileUploadInput.value = '';
            if (fileNameDisplay) fileNameDisplay.textContent = '';
        }
        return;
    }

    console.log('파일 처리 시작:', file.name, '타입:', selectedDocType);
    
    // 파일 이름에서 확장자 제거하여 채팅방 이름으로 사용
    const fileName = file.name;
    const chatRoomName = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    
    let currentTabId = getActiveTab();
    
    // 현재 활성 탭이 없거나, 현재 채팅방에 메시지가 있는 경우 새 채팅방 생성
    if (!currentTabId || (chatSessions[currentTabId] && chatSessions[currentTabId].length > 0)) {
        console.log('새 채팅방 생성 중...');
        currentTabId = createNewSession();
    }
    
    // 웰컴 메시지 숨기기
    if (welcomeMessageDiv) {
        welcomeMessageDiv.classList.add('hidden');
    }
    
    // 채팅 메시지 컨테이너 찾기
    const chatMessagesContainer = document.getElementById('chatMessages');
    if (!chatMessagesContainer) {
        console.error('채팅 메시지 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    // 업로드 진행 메시지 생성 및 표시
    const uploadingMessage = {
        id: 'upload-' + Date.now(),
        sender: 'bot',
        text: `파일 '${fileName}' 업로드 중...`,
        timestamp: new Date().toISOString()
    };
    
    // 채팅 세션에 메시지 추가
    if (!chatSessions[currentTabId]) {
        chatSessions[currentTabId] = [];
    }
    chatSessions[currentTabId].push(uploadingMessage);
    
    // UI에 업로드 중 메시지 표시
    const messageElement = addMessageToUI(uploadingMessage.text, 'bot', uploadingMessage.id, uploadingMessage.timestamp);
    console.log('업로드 중 메시지 추가됨:', uploadingMessage.id);
    
    // 상태 저장
    saveTabState();
    
    try {
        // 실제 파일 업로드 수행
        const uploadResult = await uploadFileToServer(file);
        
        if (uploadResult.success) {
            console.log('파일 업로드 성공');
            
            // 성공 메시지 생성
            const successMessage = {
                id: uploadingMessage.id, // 같은 ID 사용하여 교체
                sender: 'bot',
                text: `📄 파일 '${fileName}' (${selectedDocType} 유형) 업로드가 완료되었습니다.\n\n${uploadResult.text ? '✅ 문서 내용이 분석되었습니다. 이 문서에 대해 질문해보세요!' : '💬 이 문서에 대해 질문해보세요!'}`,
                timestamp: new Date().toISOString()
            };
            
            // 채팅 세션에서 마지막 메시지를 성공 메시지로 교체
            const sessionMessages = chatSessions[currentTabId];
            if (sessionMessages && sessionMessages.length > 0) {
                sessionMessages[sessionMessages.length - 1] = successMessage;
            }
            
            // UI에서 메시지 내용 업데이트
            if (messageElement) {
                const messageTextElement = messageElement.querySelector('.message-content') || 
                                         messageElement.querySelector('.message-text') ||
                                         messageElement.querySelector('.message-bubble');
                if (messageTextElement) {
                    messageTextElement.innerHTML = successMessage.text.replace(/\n/g, '<br>');
                    console.log('메시지 내용 업데이트 완료');
                } else {
                    console.warn('메시지 텍스트 요소를 찾을 수 없음');
                    // 메시지 요소를 다시 생성
                    addMessageToUI(successMessage.text, 'bot', successMessage.id, successMessage.timestamp);
                }
            } else {
                console.warn('메시지 요소가 없음 - 새로 생성');
                // 메시지 요소가 없으면 새로 생성
                addMessageToUI(successMessage.text, 'bot', successMessage.id, successMessage.timestamp);
            }

            
        } else {
            console.error('파일 업로드 실패:', uploadResult.error);
            
            // 실패 메시지 생성
            const errorMessage = {
                id: uploadingMessage.id,
                sender: 'bot',
                text: `❌ 파일 업로드 실패: ${uploadResult.error}`,
                timestamp: new Date().toISOString()
            };
            
            // 채팅 세션에서 마지막 메시지를 에러 메시지로 교체
            const sessionMessages = chatSessions[currentTabId];
            if (sessionMessages && sessionMessages.length > 0) {
                sessionMessages[sessionMessages.length - 1] = errorMessage;
            }
            
            // UI에서 메시지 내용 업데이트
            if (messageElement) {
                const messageTextElement = messageElement.querySelector('.message-content') || 
                                         messageElement.querySelector('.message-text') ||
                                         messageElement.querySelector('.message-bubble');
                if (messageTextElement) {
                    messageTextElement.textContent = errorMessage.text;
                }
            }
            
            // 에러 시 웰컴 메시지 다시 표시
            if (welcomeMessageDiv) {
                welcomeMessageDiv.classList.remove('hidden');
            }
            
            resetUploadForm();
            return;
        }
        
    } catch (error) {
        console.error('파일 업로드 중 예외 발생:', error);
        
        // 예외 메시지 생성
        const exceptionMessage = {
            id: uploadingMessage.id,
            sender: 'bot',
            text: `❌ 파일 업로드 중 오류가 발생했습니다: ${error.message}`,
            timestamp: new Date().toISOString()
        };
        
        // 채팅 세션 및 UI 업데이트
        const sessionMessages = chatSessions[currentTabId];
        if (sessionMessages && sessionMessages.length > 0) {
            sessionMessages[sessionMessages.length - 1] = exceptionMessage;
        }
        
        if (messageElement) {
            const messageTextElement = messageElement.querySelector('.message-content') || 
                                     messageElement.querySelector('.message-text') ||
                                     messageElement.querySelector('.message-bubble');
            if (messageTextElement) {
                messageTextElement.textContent = exceptionMessage.text;
            }
        }
        
        resetUploadForm();
        return;
    }
    
    // 성공적으로 완료된 경우에만 채팅방 이름 변경 및 UI 업데이트
    saveChatHistoryWithTitle(currentTabId, chatRoomName);
    
    // openTabs에도 제목 업데이트
    if (openTabs[currentTabId]) {
        openTabs[currentTabId].title = chatRoomName;
    }
    
    // 상태 저장
    saveTabState();
    
    // UI 업데이트
    renderTabs();
    renderRecentChats(getChatSessionList());
    
    // 파일 이름 표시 업데이트
    if (fileNameDisplay) {
        fileNameDisplay.textContent = `업로드 완료: ${fileName}`;
        fileNameDisplay.style.display = 'block';
    }
    
    // 채팅 입력창 활성화
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    if (chatInput) {
        chatInput.disabled = false;
        chatInput.placeholder = '업로드된 문서에 대해 질문해보세요...';
        chatInput.focus();
    }
    if (sendButton) {
        sendButton.disabled = chatInput && chatInput.value.trim() === '';
    }
    
    console.log(`채팅방 '${chatRoomName}' 생성 및 파일 업로드 완료`);
    
    // 폼 초기화
    resetUploadForm();
}

/**
 * 업로드 폼 초기화
 */
function resetUploadForm() {
    selectedDocType = null;
    
    // 문서 유형 버튼 초기화
    if (docTypeContractBtn) {
        docTypeContractBtn.classList.remove('selected');
    }
    if (docTypeTermsBtn) {
        docTypeTermsBtn.classList.remove('selected');
    }
    
    // 파일 입력 초기화
    if (fileUploadInput) {
        fileUploadInput.value = '';
    }
    
    // 파일 이름 표시 초기화
    if (fileNameDisplay) {
        fileNameDisplay.textContent = '';
    }
    
    // 드롭 영역 비활성화
    setDropAreaEnabled(false);
    
    // 안내 메시지 다시 표시
    if (fileInfoMessage) {
        fileInfoMessage.style.display = 'block';
        fileInfoMessage.textContent = '(문서 유형을 먼저 선택해야 합니다.)';
    }
}

/**
 * 새 채팅방 생성 시 웰컴 메시지 표시
 */
export function showWelcomeMessage() {
    console.log('웰컴 메시지 초기화 시작');
    
    // 웰컴 메시지 표시
    if (welcomeMessageDiv) {
        welcomeMessageDiv.classList.remove('hidden');
    }
    
    // 파일 업로드 폼 완전 초기화
    resetUploadForm();
    
    // 채팅 입력창 플레이스홀더 초기화
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.value = '';
        chatInput.placeholder = '법률 문서나 조항을 입력하거나, 질문을 입력하세요...';
        chatInput.disabled = false; // 입력창 활성화
    }
    
    console.log('웰컴 메시지 초기화 완료');
}

/**
 * 웰컴 메시지를 강제로 완전 초기 상태로 리셋합니다.
 * (새 채팅방 생성 시 호출)
 */
export function forceResetWelcomeMessage() {
    console.log('웰컴 메시지 강제 리셋 시작');
    
    // DOM 요소들을 다시 찾아서 확실히 초기화
    const docTypeContract = document.getElementById('docTypeContract');
    const docTypeTerms = document.getElementById('docTypeTerms');
    const fileUpload = document.getElementById('fileUpload');
    const fileNameDisplayEl = document.getElementById('fileNameDisplay');
    const dropAreaEl = document.getElementById('dropArea');
    const fileInfoEl = document.querySelector('.file-upload-info');
    
    // 선택된 문서 타입 초기화
    selectedDocType = null;
    
    // 버튼 상태 초기화
    if (docTypeContract) {
        docTypeContract.classList.remove('selected');
    }
    if (docTypeTerms) {
        docTypeTerms.classList.remove('selected');
    }
    
    // 파일 입력 초기화
    if (fileUpload) {
        fileUpload.value = '';
    }
    
    // 파일 이름 표시 완전 제거
    if (fileNameDisplayEl) {
        fileNameDisplayEl.textContent = '';
        fileNameDisplayEl.style.display = 'none'; // 아예 숨김
    }
    
    // 드롭 영역 초기화
    if (dropAreaEl) {
        dropAreaEl.classList.remove('enabled', 'active');
        dropAreaEl.classList.add('disabled');
    }
    
    // 안내 메시지 복원
    if (fileInfoEl) {
        fileInfoEl.style.display = 'block';
        fileInfoEl.textContent = '(문서 유형을 먼저 선택해야 합니다.)';
    }
    
    console.log('웰컴 메시지 강제 리셋 완료');
}

/**
 * 파일 업로드 관련 모든 이벤트 리스너를 초기화하는 함수
 */
export function initFileUpload() {
    // DOM 요소 참조
    docTypeContractBtn = document.getElementById('docTypeContract');
    docTypeTermsBtn = document.getElementById('docTypeTerms');
    fileUploadInput = document.getElementById('fileUpload');
    browseFileButton = document.getElementById('browseFileButton');
    dropArea = document.getElementById('dropArea');
    welcomeMessageDiv = document.getElementById('welcomeMessage');
    chatInputContainer = document.querySelector('.chat-input-container');
    fileNameDisplay = document.getElementById('fileNameDisplay');
    fileInfoMessage = document.querySelector('.file-upload-info');

    if (!docTypeContractBtn || !docTypeTermsBtn || !fileUploadInput || !browseFileButton || !dropArea) {
        console.warn('File upload elements not found');
        return;
    }

    setDropAreaEnabled(false);

    // 문서 유형 선택 이벤트
    docTypeContractBtn.addEventListener('click', function() {
        selectedDocType = 'contract';
        docTypeContractBtn.classList.add('selected');
        docTypeTermsBtn.classList.remove('selected');
        setDropAreaEnabled(true);
        if (fileNameDisplay) fileNameDisplay.textContent = '';
    });

    docTypeTermsBtn.addEventListener('click', function() {
        selectedDocType = 'terms';
        docTypeTermsBtn.classList.add('selected');
        docTypeContractBtn.classList.remove('selected');
        setDropAreaEnabled(true);
        if (fileNameDisplay) fileNameDisplay.textContent = '';
    });

    // 파일 선택 버튼 클릭
    browseFileButton.addEventListener('click', function() {
        if (selectedDocType) {
            fileUploadInput.click();
        } else {
            alert('파일을 선택하기 전에 문서 유형을 먼저 선택해주세요.');
        }
    });

    // 파일 선택 변경
    fileUploadInput.addEventListener('change', function(event) {
        handleFile(event.target.files[0]);
    });

    // 드래그 앤 드롭 이벤트
    dropArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (selectedDocType) {
            dropArea.classList.add('active');
        }
    });

    dropArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove('active');
    });

    dropArea.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove('active');

        if (selectedDocType) {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFile(files[0]);
            }
        } else {
            alert('파일을 업로드하기 전에 문서 유형을 먼저 선택해주세요.');
        }
    });
}

// 전역 파일 드롭 지원 (선택사항 - 기존 chatUI.js와 중복될 수 있음)
export function initGlobalFileDrop() {
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && !selectedDocType) {
            alert('파일을 업로드하기 전에 문서 유형을 먼저 선택해주세요.');
        } else if (file && selectedDocType) {
            handleFile(file);
        }
    });
}

async function uploadFileToServer(file) {
    try {
        console.log('서버로 파일 업로드 시작:', file.name);
        
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/chatbot/upload-file/', {
            method: 'POST',
            body: formData
        });

        console.log('서버 응답 상태:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('파일 업로드 성공:', data);
            return { 
                success: true, 
                text: data.text || '', 
                message: data.message || '파일 업로드가 완료되었습니다.' 
            };
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('파일 업로드 실패:', response.status, errorData);
            return { 
                success: false, 
                error: errorData.error || `서버 오류 (${response.status}): ${response.statusText}` 
            };
        }
    } catch (error) {
        console.error('파일 업로드 중 네트워크 오류:', error);
        return { 
            success: false, 
            error: `네트워크 오류: ${error.message}` 
        };
    }
}