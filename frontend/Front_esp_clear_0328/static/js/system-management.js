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

// 요청 제출
function submitRequest(event) {
    event.preventDefault(); // 기본 폼 제출 방지

    const categoryIdx = document.querySelector('input[name="categoryIdx"]:checked');
    const userid = document.getElementById('userid').value;
    const emailId = document.getElementById('email').value;
    const emailDomain = document.getElementById('emailDomain').value;
    const applyTitle = document.getElementById('applyTitle').value;
    const applyContent = document.getElementById('applyContent').value;

    let errorMessage = '';
    if (!categoryIdx) errorMessage += '점검 분야를 선택해주세요.\n';
    if (!userid) errorMessage += '이름을 입력해주세요.\n';
    if (!emailId) errorMessage += '이메일 아이디를 입력해주세요.\n';
    if (!emailDomain) errorMessage += '이메일 도메인을 입력해주세요.\n';
    if (!applyTitle) errorMessage += '제목을 입력해주세요.\n';
    if (!applyContent) errorMessage += '내용을 입력해주세요.\n';

    if (errorMessage) {
        alert(errorMessage);
        return;
    }

    // 폼 제출
    document.querySelector('form').submit();
}
