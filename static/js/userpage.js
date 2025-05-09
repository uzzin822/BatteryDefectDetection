// static/js/mypage.js

function saveUserInfo() {
    alert('사용자 정보가 저장되었습니다.');
}

function saveSettings() {
    const notifTime = document.getElementById('notifTime').value;
    const notifType = document.getElementById('notifType').value;
    const pushNotif = document.getElementById('pushNotif').checked;

    localStorage.setItem('notifTime', notifTime);
    localStorage.setItem('notifType', notifType);
    localStorage.setItem('pushNotif', pushNotif);

    alert('알림 설정이 저장되었습니다.');
}

document.addEventListener("DOMContentLoaded", function () {
    // 알림 설정 초기화
    const notifTime = document.getElementById('notifTime');
    const notifType = document.getElementById('notifType');
    const pushNotif = document.getElementById('pushNotif');

    if (notifTime && notifType && pushNotif) {
        notifTime.value = localStorage.getItem('notifTime') || '즉시';
        notifType.value = localStorage.getItem('notifType') || 'all';
        pushNotif.checked = localStorage.getItem('pushNotif') === 'true';
    }

    // 이메일 도메인 처리
    const domainSelect = document.getElementById('domainSelect');
    const domainInput = document.getElementById('domain');

    if (domainSelect && domainInput) {
        domainSelect.addEventListener('change', function () {
            if (this.value === '기타 입력') {
                domainInput.readOnly = false;
                domainInput.value = '';
                domainInput.focus();
            } else {
                domainInput.readOnly = true;
                domainInput.value = this.value;
            }
        });
    }
});
