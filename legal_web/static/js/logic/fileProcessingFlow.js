// static/js/logic/fileProcessingFlow.js

// addMessageToChat 대신 addMessageToUI를 임포트합니다.
import { addMessageToUI, activateChatInput } from '../ui/chatUI.js';
// TODO: 나중에 AI API 연동 시 필요한 함수를 이곳에 import 할 수 있습니다.
// import { callAIForSummary } from '../api/aiService.js';

/**
 * 파일 업로드 후 초기 처리 흐름을 관리합니다.
 * 임시 메시지를 띄우고, AI 처리 로직을 시작합니다.
 * @param {File} file - 업로드된 File 객체.
 * @param {string} docType - 선택된 문서 유형.
 * @param {HTMLElement} welcomeMessageDiv - 환영 메시지 DIV 엘리먼트.
 * @param {HTMLElement} chatInputContainer - 채팅 입력 컨테이너 엘리먼트.
 */
export function startFileProcessingFlow(file, docType, welcomeMessageDiv, chatInputContainer) {
    // 1. UI 전환: 환영 메시지 숨기고 채팅 입력 필드 표시
    welcomeMessageDiv.style.display = 'none';
    chatInputContainer.style.display = 'block';
    activateChatInput(true); // chatUI.js에서 가져온 함수 호출 (이제 true를 전달하여 활성화)

    // 2. 임시 메시지 띄우기
    // addMessageToChat 대신 addMessageToUI 함수를 사용합니다.
    const temporaryMessageElement = addMessageToUI(
        `파일 '${file.name}' (${docType} 유형)을 업로드 중입니다. AI가 문서를 분석하고 요약할 준비를 하고 있습니다...`,
        'system', // 시스템 메시지로 표시
        null,     // messageId는 시스템 메시지에서는 필요 없을 수 있습니다.
        null,     // timestamp도 시스템 메시지에서는 필요 없을 수 있습니다.
        false,    // isHistory 아님
        true      // 임시 메시지임을 나타냄
    );

    // 3. TODO: 여기에 실제 AI API 호출 로직을 시작하는 부분을 추가합니다.
    // ... (이전과 동일한 AI 연동 TODO 및 시뮬레이션 로직) ...

    // 현재는 AI 연동이 없으므로, 잠시 후 임시 메시지를 완료 메시지로 변경하는 시뮬레이션
    setTimeout(() => {
        if (temporaryMessageElement) {
            // 임시 메시지를 업데이트할 때도 addMessageToUI가 반환한 엘리먼트를 직접 수정합니다.
            // 필요에 따라 새로운 메시지를 추가할 수도 있습니다.
            temporaryMessageElement.innerHTML = `<div class="message-bubble">파일 '${file.name}' (${docType} 유형) 업로드 및 초기 분석이 완료되었습니다. 무엇을 도와드릴까요?</div>`;
            temporaryMessageElement.classList.remove('temporary-message');
            temporaryMessageElement.classList.add('ai-message'); // 최종적으로 AI가 보낸 메시지처럼 보이게

            // 추가적인 AI 응답 메시지를 띄울 수 있음 (새로운 메시지로)
            addMessageToUI(
                "궁금한 점을 질문하거나, 특정 내용을 요약해달라고 요청해보세요.",
                "ai",
                null, // messageId
                new Date().toISOString() // 현재 시각 타임스탬프
            );
        }
    }, 3000); // 3초 후에 메시지 변경 (시뮬레이션)
}