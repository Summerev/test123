

import { $, $$, on, addClass, removeClass, escapeRegExp } from '../utils/domHelpers.js';
import { addMessageToUI, } from './chatUI.js';
import { openTabs, closeTabState, saveTabState, chatSessions, setActiveTab, getActiveTab } from '../state/chatTabState.js';
import { getChatTitle } from '../data/chatHistoryManager.js';
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
	titleSpan.classList.add('tab-title');
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
		const title = getChatTitle(id) || tab.title || '새 대화';
		const isActive = id === getActiveTab(); // 🔥 activeTab이면 shouldSwitch = true
		createTab(id, title, isActive, true);
	});

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
}

export function switchTab(sessionId) {
    if (!sessionId) {
        console.warn('switchTab: sessionId가 null 또는 undefined입니다.');
        return;
    }
    
    console.log('탭 전환 시작:', sessionId);
    
    setActiveTab(sessionId);
    localStorage.setItem('active_tab', sessionId);

    // 탭 UI 업데이트
    [...tabBar.children].forEach(tab => {
        tab.classList.toggle('active', tab.dataset.sessionId === sessionId);
    });

    const messages = chatSessions[sessionId] || [];
    console.log('탭 전환 - 메시지 수:', messages.length);
    
    // 채팅 메시지 컨테이너 초기화
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
    
    if (messages.length === 0) {
        // 메시지가 없는 경우 웰컴 메시지 표시
        console.log('빈 채팅방 - 웰컴 메시지 표시');
        
        if (welcomeMessage && chatMessages) {
            welcomeMessage.classList.remove('hidden');
            chatMessages.appendChild(welcomeMessage);
        }
        
        if (sendButton) {
            sendButton.disabled = true;
        }
        
        // 파일 업로드 관련 모든 상태 강제 리셋 (약간의 지연)
        setTimeout(() => {
            if (forceResetWelcomeMessage) {
                forceResetWelcomeMessage();
            }
        }, 50);
        
        // 채팅 입력창 초기화
        const chatInput = $('#chatInput');
        if (chatInput) {
            chatInput.value = '';
            chatInput.placeholder = '법률 문서나 조항을 입력하거나, 질문을 입력하세요...';
            chatInput.disabled = false;
            chatInput.style.height = 'auto';
        }
        
    } else {
        // 메시지가 있는 경우 채팅 내역 표시
        console.log('기존 채팅방 - 메시지 복원');
        
        if (welcomeMessage) {
            welcomeMessage.classList.add('hidden');
        }
        
        // 메시지 순차적으로 복원
        messages.forEach((msg, index) => {
            console.log(`메시지 복원 ${index + 1}/${messages.length}:`, msg.id || 'no-id', msg.text.substring(0, 30) + '...');
            addMessageToUI(msg.text, msg.sender, msg.id, msg.timestamp, true); // isHistory = true
        });
        
        // 채팅이 있는 경우 입력창 활성화
        const chatInput = $('#chatInput');
        if (chatInput) {
            chatInput.disabled = false;
            chatInput.placeholder = '메시지를 입력하세요...';
        }
        
        if (sendButton) {
            sendButton.disabled = chatInput && chatInput.value.trim() === '';
        }
    }
    
    console.log('탭 전환 완료:', sessionId);
}

export function restoreTabs() {
	if (Object.keys(openTabs).length > 0) {
		renderTabBar();
		const currentTabId = getActiveTab();
		if (currentTabId) {
			switchTab(currentTabId);
		}
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
		const titleSpan = tab.querySelector('.tab-title');
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