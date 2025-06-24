

import { $, $$, on, addClass, removeClass, escapeRegExp } from '../utils/domHelpers.js';
import { addMessageToUI, activateChatInput } from './chatUI.js';
import { openTabs, closeTabState, saveTabState, chatSessions, setActiveTab, getActiveTab } from '../state/chatTabState.js';
import { getChatTitle, getChatEnabled } from '../data/chatHistoryManager.js';
import { forceResetWelcomeMessage } from '../ui/fileUpLoadUI.js'

const welcomeMessage = $('#welcomeMessage');

export function createTab(sessionId, title, shouldSwitch = true, skipPush = false) {
    // 1) 중복 탭 방지
    if ([...tabBar.children].some(tab => tab.dataset.sessionId === sessionId)) return;

    // 2) DOM으로 탭 요소 생성
    const tab = document.createElement('div');
    tab.classList.add('chat-tab');
    tab.dataset.sessionId = sessionId;
    tab.dataset.sessionTitle = title;

    const titleSpan = document.createElement('span');
    titleSpan.classList.add('tab-title', 'chat-title');
    titleSpan.textContent = title.length > 12 ? title.slice(0, 12) + '...' : title;

    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.classList.add('close-tab');
    closeBtn.onclick = e => { e.stopPropagation(); closeTabUI(sessionId); };

    tab.onclick = () => switchTab(sessionId);

    tab.appendChild(titleSpan);
    tab.appendChild(closeBtn);
    tabBar.appendChild(tab);

    // 3) 상태 저장
    if (!skipPush) {
        openTabs[sessionId] = { title };
        saveTabState();
    }

    if (shouldSwitch) {
        setActiveTab(sessionId);
        switchTab(sessionId); // ✅ 이때 .active 붙음 + 메시지 출력
        tabBar.scrollLeft = tabBar.scrollWidth;
    }
}

export function renderTabBar() {
    if (!tabBar) return;
    tabBar.innerHTML = '';

    Object.entries(openTabs).forEach(([id, tab]) => {
        if (!tab || typeof tab !== 'object') return;  // ✅ null/비객체 보호

        const title = getChatTitle(id) || (tab?.title ?? '새 대화');  // ✅ 안전한 접근
        const isActive = id === getActiveTab();
        createTab(id, title, isActive, true);
    });

    // ❌ 탭 개수에 따라 tabBar의 width를 강제로 고정하던 코드 → 주석 처리
    // ✅ CSS overflow-x: auto 처리로 자동 스크롤 되도록 유지
    /*
    requestAnimationFrame(() => {
        const children = tabBar.children;
        const total = children.length;
        const visible = Math.min(total, 10);

        if (total <= 10) {
            tabBar.style.width = '';
            return;
        }

        let sum = 0;
        for (let i = 0; i < visible; i++) {
            const tab = children[i];
            if (tab && tab.getBoundingClientRect) {
                sum += tab.getBoundingClientRect().width;
            }
        }
        sum += (visible - 1) * 6;

        tabBar.style.width = sum + 'px';
    });
    */
}

export function switchTab(sessionId) {
    // 1. sessionId 유효성 검사 및 전체 초기화 (탭이 없을 경우)
    if (!sessionId) {
        console.warn('switchTab: sessionId가 null 또는 undefined입니다. 초기 상태로 돌아갑니다.');
        setActiveTab(null);
        localStorage.removeItem('active_tab');

        if (chatMessages) chatMessages.innerHTML = ''; // 메시지 영역 비움

        // 🌟🌟🌟 탭이 없는 경우 웰컴 메시지 보이기 🌟🌟🌟
        if (welcomeMessage) {
            welcomeMessage.classList.remove('hidden'); // hidden 클래스 제거
            // 중요: welcomeMessage가 chatMessages의 자식으로 계속 유지되어야 한다면,
            // 이 부분을 활성화하세요. 그렇지 않다면 제거합니다.
            // if (!chatMessages.contains(welcomeMessage)) { 
            //     chatMessages.appendChild(welcomeMessage); 
            // }
        }

        // 탭이 없으므로 채팅 입력창 비활성화
        activateChatInput(false);

        if (tabBar) {
            [...tabBar.children].forEach(tab => {
                tab.classList.remove('active');
            });
        }
        return; // 함수 종료
    }

    console.log('탭 전환 시작:', sessionId);

    setActiveTab(sessionId);
    localStorage.setItem('active_tab', sessionId);

    // 2. 탭 UI 업데이트 (active 클래스 토글)
    if (tabBar) {
        [...tabBar.children].forEach(tab => {
            tab.classList.toggle('active', tab.dataset.sessionId === sessionId);
        });
    }

    const messages = chatSessions[sessionId] || [];
    console.log('탭 전환 - 메시지 수:', messages.length);

    // 3. 채팅 메시지 컨테이너 초기화
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }

    // 🌟🌟🌟 4. 현재 탭의 canChat 상태를 가져옴 🌟🌟🌟
    const canChatForThisSession = getChatEnabled(sessionId);
    console.log(`세션 '${sessionId}'의 canChat 상태: ${canChatForThisSession}`);

    if (messages.length === 0) {
        // 5. 메시지가 없는 경우 (새로 생성된 탭)
        console.log('빈 채팅방 - 웰컴 메시지 표시');

        // 🌟🌟🌟 웰컴 메시지 보이기 (기존 로직 유지) 🌟🌟🌟
        if (welcomeMessage && chatMessages) { // chatMessages가 필요하다면
            welcomeMessage.classList.remove('hidden');
            // 기존 코드: chatMessages.appendChild(welcomeMessage);
            // 이 줄은 welcomeMessage가 chatMessages의 자식으로 계속 존재해야 할 때만 유효합니다.
            // 만약 welcomeMessage가 독립적인 요소라면 이 줄은 제거해야 합니다.
            // 새 탭 생성 시 appendChild로 추가하는 것이 원래 의도였다면, 그 로직을 유지하세요.
            if (!chatMessages.contains(welcomeMessage)) { // 중복 추가 방지
                chatMessages.appendChild(welcomeMessage);
            }
        }

        // sendButton 활성화 로직은 activateChatInput으로 일원화됩니다.
        // if (sendButton) {
        //     sendButton.disabled = true; // 이 줄은 activateChatInput이 처리하도록 제거
        // }

        // 파일 업로드 관련 모든 상태 강제 리셋 (약간의 지연) - 기존 로직 유지
        setTimeout(() => {
            if (typeof forceResetWelcomeMessage === 'function') {
                forceResetWelcomeMessage();
            }
        }, 50);

        // 채팅 입력창 초기화 - 기존 로직 유지
        const chatInput = $('#chatInput');
        if (chatInput) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
            // chatInput.placeholder 및 disabled는 activateChatInput에서 제어합니다.
            // chatInput.placeholder = '법률 문서나 조항을 입력하거나, 질문을 입력하세요...'; // 이 줄은 activateChatInput이 처리하도록 제거
            // chatInput.disabled = false; // 이 줄은 activateChatInput이 처리하도록 제거
        }

        // 🌟🌟🌟 빈 채팅방의 canChat 상태에 따라 입력창 활성화 🌟🌟🌟
        activateChatInput(canChatForThisSession); // 이 줄이 핵심!

    } else {
        // 6. 메시지가 있는 경우 (기존 탭)
        console.log('기존 채팅방 - 메시지 복원');

        // 🌟🌟🌟 웰컴 메시지 숨기기 (기존 로직 유지) 🌟🌟🌟
        if (welcomeMessage) {
            welcomeMessage.classList.add('hidden');
            // chatMessages에서 welcomeMessage를 제거해야 한다면 이 부분 활성화:
            // if (chatMessages.contains(welcomeMessage)) {
            //     chatMessages.removeChild(welcomeMessage);
            // }
        }

        // 메시지 순차적으로 복원 - 기존 로직 유지
        messages.forEach((msg, index) => {
            console.log(`메시지 복원 ${index + 1}/${messages.length}:`, msg.id || 'no-id', msg.text.substring(0, 30) + '...');
            addMessageToUI(msg.text, msg.sender, msg.id, msg.timestamp, true);
        });

        // 채팅 입력창 초기화 - 기존 로직 유지
        const chatInput = $('#chatInput');
        if (chatInput) {
            chatInput.value = '';
            chatInput.style.height = 'auto';
            // chatInput.placeholder 및 disabled는 activateChatInput에서 제어합니다.
            // chatInput.disabled = false; // 이 줄은 activateChatInput이 처리하도록 제거
            // chatInput.placeholder = '메시지를 입력하세요...'; // 이 줄은 activateChatInput이 처리하도록 제거
        }

        // sendButton 활성화 로직은 activateChatInput으로 일원화됩니다.
        // if (sendButton) {
        //     sendButton.disabled = chatInput && chatInput.value.trim() === ''; // 이 줄은 activateChatInput이 처리하도록 제거
        // }

        // 🌟🌟🌟 기존 채팅방의 canChat 상태에 따라 입력창 활성화 🌟🌟🌟
        activateChatInput(canChatForThisSession); // 이 줄이 핵심!
    }

    // 7. 메시지 컨테이너 스크롤 (가장 아래로) - 기존 로직 유지
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    console.log('탭 전환 완료:', sessionId);
}

export function restoreTabs() {
    const currentTabId = getActiveTab();
    Object.keys(openTabs).forEach((id) => {
        const tab = openTabs[id];
        if (!tab || typeof tab !== 'object' || !('title' in tab)) {
            delete openTabs[id];  // ✅ title 없는 이상값 제거
        }
    });
    renderTabBar();
    if (currentTabId) {
        switchTab(currentTabId);
    }
}

export function closeTabUI(sessionId) {
    closeTabState(sessionId);  // 상태만 변경

    renderTabBar();  // 탭 UI 다시 그리기

    const currentTab = getActiveTab();  // ✅ 최신 activeTab 사용
    if (currentTab) {
        switchTab(currentTab);
    } else {
        chatMessages.innerHTML = '';
        welcomeMessage.classList.remove('hidden');
    }
}

export function updateTabTitle(sessionId, newTitle) {
    const tab = [...tabBar.children].find(t => t.dataset.sessionId === sessionId);
    if (tab) {
        const titleSpan = tab.querySelector('.chat-title');
        if (titleSpan) {
            titleSpan.textContent = newTitle.length > 12 ? newTitle.slice(0, 12) + '...' : newTitle;
        }
        tab.dataset.sessionTitle = newTitle;
    }

    // ✅ 객체 구조에 맞게 수정
    if (openTabs[sessionId]) {
        openTabs[sessionId].title = newTitle;
        saveTabState();
    }
}