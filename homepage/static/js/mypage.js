document.addEventListener('DOMContentLoaded', function () {
    const domainInput = document.getElementById('domain'); // 도메인 입력창
    const domainSelect = document.getElementById('domainSelect'); // 도메인 선택 박스

    // 초기 설정
    const initialDomain = domainInput.value; // 입력된 도메인
    let domainMatched = false;

    for (let i = 0; i < domainSelect.options.length; i++) {
        if (domainSelect.options[i].value === initialDomain) {
            domainSelect.selectedIndex = i;
            domainMatched = true;
            break;
        }
    }

    if (!domainMatched) {
        domainSelect.value = '기타 입력';
        domainInput.removeAttribute('readonly');
        console.log("Custom domain detected");
    } else {
        domainInput.setAttribute('readonly', true);
        console.log("Domain matched with select box");
    }

    // 셀렉트 박스 변경 이벤트
    domainSelect.addEventListener('change', function () {
        const selectedValue = this.value;
        if (selectedValue === '기타 입력') {
            domainInput.value = '';
            domainInput.removeAttribute('readonly');
            domainInput.focus();
        } else {
            domainInput.value = selectedValue;
            domainInput.setAttribute('readonly', true);
        }
        console.log("Selected value:", selectedValue);
    });
});

// 회원 탈퇴 확인
function confirmWithdrawal() {
    if (confirm("정말로 회원 탈퇴하시겠습니까?")) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/withdraw';
        document.body.appendChild(form);
        form.submit();
    }
}
