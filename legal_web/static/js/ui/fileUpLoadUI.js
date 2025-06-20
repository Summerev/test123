// legal_web/static/js/ui/fileUpLoadUI.js (정리된 최종 버전)

import { createNewSession } from '../ui/chatUI.js';
import { saveChatSessionInfo, getChatSessionList, setChatEnabled, addMessageToChatAndHistory  } from '../data/chatHistoryManager.js';
import { renderRecentChats, addMessageToUI } from './chatUI.js';
import { getActiveTab, chatSessions, openTabs } from '../state/chatTabState.js';
import { renderTabBar } from './chatTabUI.js';
import { saveTabState } from '../state/chatTabState.js';

// DOM 요소 참조
let welcomeMessageDiv;
let fileUploadInput;
let fileNameDisplay;
let selectedDocType = null;
let docTypeContractBtn;
let docTypeTermsBtn;
let browseFileButton;
let dropArea;
let fileInfoMessage;
let chatInputContainer;

// CSRF 토큰을 가져오는 헬퍼 함수 
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}




/**
 * 드래그 앤 드롭 영역의 활성화/비활성화 상태를 설정합니다.
 * @param {boolean} isEnabled 
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
    // 새 채팅방 생성 시 canChat을 false로 초기화하도록 createNewSession이 처리할 것을 기대합니다.
    if (!currentTabId || (chatSessions[currentTabId] && chatSessions[currentTabId].length > 0)) {
        console.log('새 채팅방 생성 중...');
        // createNewSession 호출 시, 새 탭의 canChat 상태는 기본적으로 false
        currentTabId = createNewSession(); 
        // 새롭게 생성된 세션의 제목을 파일명으로 즉시 업데이트
        // saveChatSessionInfo 함수를 사용하여 제목을 설정하고, 이때 canChat은 false로 유지
        saveChatSessionInfo(currentTabId, {
          titleText: chatRoomName,
          canChatStatus: false,
          docType: selectedDocType
        });
        
        // renderTabBar와 renderRecentChats는 saveChatSessionInfo 내부에서 호출되므로 여기서 따로 호출하지 않습니다.
    } else {
        // 기존 탭에 파일 업로드하는 경우에도 제목을 업데이트할 수 있음
        saveChatSessionInfo(currentTabId, {
  titleText: chatRoomName,
  canChatStatus: false,
  docType: selectedDocType
}); // canChat은 아직 false로 설정
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
    
    // 채팅 세션에 메시지 추가 (addMessageToChatAndHistory 함수 사용으로 변경)
    // chatSessions[currentTabId].push(uploadingMessage); // 이 줄은 제거
    addMessageToChatAndHistory(currentTabId, uploadingMessage, false);

    // addMessageToUI는 addMessageToChatAndHistory 내부에서 호출되므로, 여기서는 직접 호출하지 않습니다.
    // 하지만 메시지 엘리먼트를 참조하기 위해 addMessageToUI의 반환값을 사용해야 하므로,
    // addMessageToChatAndHistory를 통해 추가된 메시지 엘리먼트를 찾는 로직이 필요하거나,
    // addMessageToUI가 직접 호출되고 그 결과값을 받는 방식으로 변경해야 합니다.
    // 여기서는 addMessageToUI가 DOM에 추가된 메시지 요소를 반환한다고 가정하고, 이를 직접 호출하는 방식으로 유지하겠습니다.
    const messageElement = addMessageToUI(uploadingMessage.text, 'bot', uploadingMessage.id, uploadingMessage.timestamp);

    console.log('업로드 중 메시지 추가됨:', uploadingMessage.id);
    
    // 상태 저장 (addMessageToChatAndHistory 내부에서 saveTabState 호출되므로 필요 없을 수 있음)
    // saveTabState(); // 중복 호출 방지를 위해 제거 또는 확인 필요
    
    try {
        // 실제 파일 업로드 수행
        const uploadResult = await uploadFileToServer(file, selectedDocType, currentTabId);
        
        if (uploadResult.success) {
            console.log('파일 업로드 성공');
            
            // 🌟🌟🌟 파일 업로드 성공 시 canChat을 true로 설정 🌟🌟🌟
            setChatEnabled(currentTabId, true); 

            // 성공 메시지 생성
            const successMessage = {
                id: uploadingMessage.id, // 같은 ID 사용하여 교체
                sender: 'bot',
                text: `📄 파일 '${fileName}' (${selectedDocType} 유형) 업로드가 완료되었습니다.\n\n${uploadResult.text ? '✅ 문서 내용이 분석되었습니다. 이 문서에 대해 질문해보세요!' : '💬 이 문서에 대해 질문해보세요!'}`,
                timestamp: new Date().toISOString()
            };
            
            // 채팅 세션에서 마지막 메시지를 성공 메시지로 교체 (addMessageToChatAndHistory 사용하지 않음)
            const sessionMessages = chatSessions[currentTabId];
            if (sessionMessages && sessionMessages.length > 0) {
                sessionMessages[sessionMessages.length - 1] = successMessage;
                // 메시지 내용이 변경되었으므로 상태를 다시 저장
                saveTabState(); 
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
                    addMessageToUI(successMessage.text, 'bot', successMessage.id, successMessage.timestamp);
                }
            } else {
                console.warn('메시지 요소가 없음 - 새로 생성');
                addMessageToUI(successMessage.text, 'bot', successMessage.id, successMessage.timestamp);
            }

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
            
        } else {
            console.error('파일 업로드 실패:', uploadResult.error);
            
            // 🌟🌟🌟 파일 업로드 실패 시 canChat을 false로 유지 🌟🌟🌟
            setChatEnabled(currentTabId, false); // 이미 false로 초기화되었겠지만 명시적으로 설정

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
                saveTabState();
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
        }
        
    } catch (error) {
        console.error('파일 업로드 중 예외 발생:', error);
        
        // 🌟🌟🌟 파일 업로드 중 예외 발생 시 canChat을 false로 유지 🌟🌟🌟
        setChatEnabled(currentTabId, false);

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
            saveTabState();
        }
        
        if (messageElement) {
            const messageTextElement = messageElement.querySelector('.message-content') || 
                                       messageElement.querySelector('.message-text') ||
                                       messageElement.querySelector('.message-bubble');
            if (messageTextElement) {
                messageTextElement.textContent = exceptionMessage.text;
            }
        }
        
    } finally {
        // 성공/실패 여부와 관계없이 폼 초기화
        resetUploadForm(); 
        // UI 갱신 (탭 바, 최근 채팅 목록) - 제목 변경 및 canChat 상태 반영을 위해
        renderTabBar();
        renderRecentChats(getChatSessionList());
    }
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
		debugger;
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



 /**
 * 서버에 파일을 업로드하고 결과를 반환
 * 문서 유형(docType)에 따라 다른 API 엔드포인트를 호출
 * 
 * @param {File} file - 업로드할 파일 객체
 * @param {string} docType - 문서 유형 ('terms' 또는 'contract')
 * @param {string} sessionId - 현재 채팅 세션 ID
 * @returns {Promise<Object>} 서버 응답 결과 객체
 */
async function uploadFileToServer(file, docType, sessionId) {
    if (docType === 'terms') {
        // --- '약관' 유형일 경우: 새로운 RAG API 호출 ---
        try {
            const apiUrl = '/api/rag/analyze/'; // URL을 변수로 명확하게 선언
            console.log(`[RAG] '약관' 유형으로 ${apiUrl} API를 호출합니다.`);
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('doc_type', docType);
            formData.append('session_id', sessionId);

            const response = await fetch(apiUrl, { // 변수를 사용하여 호출
                method: 'POST',
                headers: { 'X-CSRFToken': getCookie('csrftoken') },
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error || `서버 오류 (${response.status})` };
            } else {
                // 성공 시, 'text' 키에 요약문을 담아 handleFile 함수로 반환
                return { success: true, text: data.summary, message: "분석이 완료되었습니다." };
            }
        } catch (error) {
            console.error('[RAG] 약관 분석 중 네트워크 오류:', error);
            return { success: false, error: `네트워크 오류: ${error.message}` };
        }

    } else {
        // --- '계약서' 등 다른 유형일 경우: 기존 API 호출 ---
        try {
            console.log("[기존] '계약서' 유형으로 /chatbot/upload-file/ API를 호출합니다.");
            
            const formData = new FormData();
            formData.append('file', file);
            // 기존 API는 doc_type, session_id를 받지 않으므로 보내지 않음

            const response = await fetch('/chatbot/upload-file/', {
                method: 'POST',
                body: formData
                // CSRF 토큰이 필요하다면 여기에 추가: headers: { 'X-CSRFToken': getCookie('csrftoken') }
            });

            if (response.ok) {
                const data = await response.json();
                return { 
                    success: true, 
                    text: data.text || '', 
                    message: data.message || '파일 업로드가 완료되었습니다.' 
                };
            } else {
                const errorData = await response.json().catch(() => ({}));
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
}