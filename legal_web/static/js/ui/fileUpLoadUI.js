// static/js/ui/fileUploadUI.js

import { startFileProcessingFlow } from '../logic/fileProcessingFlow.js'; // 새로 만든 파일 임포트
// activateChatInput은 이제 fileProcessingFlow.js에서 호출하므로 여기서는 제거
// import { addMessageToChat, activateChatInput } from './chatUI.js'; // addMessageToChat은 fileProcessingFlow에서 사용할 것임

// DOM 요소 참조 (이 파일에서 필요한 것만 남김)
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
 * (이 함수는 이 파일에 그대로 둡니다.)
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
 * 실제 파일을 처리하고 UI를 업데이트하는 함수입니다.
 * 이제 이 함수에서 fileProcessingFlow.js의 startFileProcessingFlow를 호출합니다.
 * @param {File} file - 업로드할 File 객체
 */
function handleFile(file) {
    if (file && selectedDocType) {
        console.log('업로드된 파일:', file.name);
        console.log('선택된 문서 유형:', selectedDocType);
        fileNameDisplay.textContent = `선택된 파일: ${file.name}`;

        // 파일 처리 흐름 시작 함수 호출
        startFileProcessingFlow(file, selectedDocType, welcomeMessageDiv, chatInputContainer);

    } else if (!selectedDocType) {
        alert('파일을 업로드하기 전에 문서 유형을 먼저 선택해주세요.');
        fileUploadInput.value = '';
        fileNameDisplay.textContent = '';
    }
}

/**
 * 파일 업로드 관련 모든 이벤트 리스너를 초기화하는 함수입니다.
 * (이 함수는 이 파일에 그대로 둡니다.)
 */
export function initFileUpload() {
    // DOM 요소 참조
    docTypeContractBtn = document.getElementById('docTypeContract');
    docTypeTermsBtn = document.getElementById('docTypeTerms');
    fileUploadInput = document.getElementById('fileUpload');
    browseFileButton = document.getElementById('browseFileButton');
    dropArea = document.getElementById('dropArea');
    welcomeMessageDiv = document.getElementById('welcomeMessage'); // 계속 필요
    chatInputContainer = document.querySelector('.chat-input-container'); // 계속 필요
    fileNameDisplay = document.getElementById('fileNameDisplay');
    fileInfoMessage = document.querySelector('.file-upload-info');

    setDropAreaEnabled(false);

    docTypeContractBtn.addEventListener('click', function() {
        selectedDocType = 'contract';
        docTypeContractBtn.classList.add('selected');
        docTypeTermsBtn.classList.remove('selected');
        setDropAreaEnabled(true);
        fileNameDisplay.textContent = '';
    });

    docTypeTermsBtn.addEventListener('click', function() {
        selectedDocType = 'terms';
        docTypeTermsBtn.classList.add('selected');
        docTypeContractBtn.classList.remove('selected');
        setDropAreaEnabled(true);
        fileNameDisplay.textContent = '';
    });

    browseFileButton.addEventListener('click', function() {
        if (selectedDocType) {
            fileUploadInput.click();
        } else {
            alert('파일을 선택하기 전에 문서 유형을 먼저 선택해주세요.');
        }
    });

    fileUploadInput.addEventListener('change', function(event) {
        handleFile(event.target.files[0]);
    });

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