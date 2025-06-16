export let activeTab = null;

export function setActiveTab(value) {
    activeTab = value;
    localStorage.setItem('active_tab', value); // 로컬스토리지에도 반영
}