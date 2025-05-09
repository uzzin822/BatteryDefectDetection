// 파일명 표시
function showFileName() {
    const fileInput = document.getElementById('file-upload');
    const fileName = document.getElementById('fileName');
    if (fileInput.files.length > 0) {
        fileName.textContent = fileInput.files[0].name;
    } else {
        fileName.textContent = '선택된 파일 없음';
    }
}

// 폼 초기화
function resetForm() {
    document.querySelectorAll('input[type="text"], textarea').forEach(input => {
        input.value = '';
    });
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.checked = false;
    });
    document.getElementById('fileName').textContent = '선택된 파일 없음';
}

// 탭 전환
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(tabId).style.display = 'block';

    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
}
document.getElementById('emailExt').addEventListener('change', function () {
    const emailDomainInput = document.getElementById('emailDomain');
    const selectedValue = this.value;

    if (selectedValue === "직접 입력") {
        emailDomainInput.value = "";
        emailDomainInput.removeAttribute('readonly'); // 입력 가능하도록 변경
        emailDomainInput.focus();
    } else {
        emailDomainInput.value = selectedValue;
        emailDomainInput.setAttribute('readonly', 'readonly'); // 읽기 전용으로 설정
    }
});

// 요청 제출
function submitRequest(event) {
    event.preventDefault(); // 기본 폼 제출 방지

    // 입력값 가져오기
    const categoryIdx = document.querySelector('input[name="categoryIdx"]:checked');
    const userid = document.getElementById('userid').value.trim();
    const emailId = document.getElementById('email').value.trim();
    const emailDomain = document.getElementById('emailDomain').value.trim();
    const applyTitle = document.getElementById('applyTitle').value.trim();
    const applyContent = document.getElementById('applyContent').value.trim();

    // 유효성 검사
    if (!categoryIdx) {
        alert("점검 분야를 선택해주세요.");
        return;
    }

    if (!emailId || !emailDomain) {
        alert("이메일을 올바르게 입력해주세요.");
        return;
    }

    if (!applyTitle) {
        alert("제목을 입력해주세요.");
        return;
    }

    if (!applyContent) {
        alert("내용을 입력해주세요.");
        return;
    }

    // 모든 검사를 통과하면 form 제출
    document.querySelector('form').submit();
}