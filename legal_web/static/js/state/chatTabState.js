// state/chatTabState.js

// 열려 있는 탭들과 세션 상태를 저장
export let openTabs = JSON.parse(localStorage.getItem('open_tabs')) || {};
export let chatSessions = JSON.parse(localStorage.getItem('chat_sessions')) || {};
export let activeTab = localStorage.getItem('active_tab') || null;

// 상태 저장
export function saveTabState() {
    localStorage.setItem('open_tabs', JSON.stringify(openTabs));
    localStorage.setItem('active_tab', activeTab);
    localStorage.setItem('chat_sessions', JSON.stringify(chatSessions));
}

// 활성 탭 가져오기
export function getActiveTab() {
  return activeTab;
}
// 활성 탭 설정
export function setActiveTab(tabId) {
  activeTab = tabId;
  localStorage.setItem('active_tab', tabId);
}

// 탭 열기
export function openTab(tabId, title = '새 대화') {
  openTabs[tabId] = { title };
  localStorage.setItem('open_tabs', JSON.stringify(openTabs));
}

// 탭 닫기
export function closeTabState(tabId) {
  // 1. 해당 탭 삭제
  delete openTabs[tabId];

  // 2. 변경된 탭 목록 저장
  localStorage.setItem('open_tabs', JSON.stringify(openTabs));

  // 3. 닫는 탭이 현재 activeTab이라면 → 다른 탭을 활성화
  if (activeTab === tabId) {
    const remainingTabIds = Object.keys(openTabs);
    const newActive = remainingTabIds.length > 0 ? remainingTabIds[0] : null;
    setActiveTab(newActive); // ✅ 상태 함수 통해 변경
  }
}
