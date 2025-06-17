// static/js/ui/fileUploadUI.js

import { openModal, closeModal } from './modalManager.js';
import { addMessageToUI } from './chatUI.js'; // 채팅창 메시지 표시 함수
import { $ } from '../utils/domHelpers.js'; // DOM 헬퍼 (선택적 사용)

let uploadedFileName = null;

/**
 * 파일 업로드 모달을 초기화하고 이벤트 핸들러를 연결합니다.
 */
export function initFileUploadModal() {
  const fileAddBtn = $('#fileAddBtn');
  const confirmBtn = $('#uploadConfirmBtn');
  const fileInput = $('#fileInput');
  const modeSelect = $('#modeSelect');
  const chatInput = $('#chatInput');
  const sendButton = $('#sendButton');

  if (!fileAddBtn || !confirmBtn || !fileInput || !modeSelect) {
    console.warn('❗ 업로드 모달 초기화에 필요한 요소가 누락되었습니다.');
    return;
  }

  // 📎 업로드 버튼 클릭 시 모달 열기
  fileAddBtn.addEventListener('click', () => {
    openModal('uploadModal');
  });

  // ✅ 업로드 확인 버튼 클릭 시
  confirmBtn.addEventListener('click', () => {
    const file = fileInput.files[0];
    const mode = modeSelect.value;

    if (!file) {
      alert("📂 파일을 선택하세요.");
      return;
    }

    uploadedFileName = file.name;

    // 💬 봇이 파일 업로드 확인 메시지 출력
    addMessageToUI({ sender: 'bot', text: `✅ ${uploadedFileName} 업로드 완료 (${mode})` });

    // ✏️ 채팅창 활성화
    if (chatInput) chatInput.disabled = false;
    if (sendButton) sendButton.disabled = false;

    closeModal('uploadModal');
  });
}
