document.addEventListener('DOMContentLoaded', function () {
    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const container = document.getElementById('container');
    const checkIdButton = document.getElementById('checkIdButton');
    const useridInput = document.getElementById('userid');
    let isIdAvailable = false;

    // URL 경로에 따른 초기 상태 설정
    const urlPath = window.location.pathname;
    if (urlPath === '/join') {
        container.classList.add("right-panel-active");
    }

    // 회원가입 버튼 클릭 이벤트
    if (signUpButton) {
        signUpButton.addEventListener('click', () => {
            container.classList.add("right-panel-active");
            history.pushState(null, '', '/join');
            document.title = "회원가입";
        });
    }

    // 로그인 버튼 클릭 이벤트
    if (signInButton) {
        signInButton.addEventListener('click', () => {
            container.classList.remove("right-panel-active");
            history.pushState(null, '', '/login');
            document.title = "로그인";
        });
    }

    // ID 중복 체크 버튼 클릭 이벤트
    if (checkIdButton && useridInput) {
        checkIdButton.addEventListener('click', function (event) {
            event.preventDefault();
            const userId = useridInput.value;

            // 아이디 입력 여부 확인
            if (!userId) {
                alert('아이디를 입력해 주세요.');
                return;
            } else if (userId.length < 3) {
                alert('아이디는 3자리 이상이어야 합니다.');
                return;
            }

            // AJAX 요청
            fetch('/check_id', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId })
            })
                .then(response => response.json())
                .then(data => {
                    if (!data.available) {
                        alert('이미 사용 중인 아이디입니다.');
                        useridInput.value = '';
                        isIdAvailable = false;
                        useridInput.disabled = false;
                        checkIdButton.disabled = false;
                    } else {
                        alert('사용 가능한 아이디입니다.');
                        isIdAvailable = true;
                        useridInput.disabled = true;
                        checkIdButton.disabled = true;
                    }
                })
                .catch(error => console.error('Error:', error));
        });
    }

    // 회원가입 폼 제출 이벤트 리스너
    const signUpForm = document.querySelector('.sign-up-container form');
    if (signUpForm) {
        signUpForm.addEventListener('submit', function (event) {
            const password = document.querySelector('input[name="password"]').value;

            if (!isIdAvailable) {
                event.preventDefault();
                alert('아이디 중복 체크를 완료해 주세요.');
            } else if (password.length < 4) {
                event.preventDefault();
                alert('비밀번호는 4자리 이상이어야 합니다.');
            } else {
                useridInput.disabled = false; // 제출 전에 disabled 해제
            }
        });
    }

    // 이메일 도메인 선택 이벤트 리스너
    const domainSelect = document.getElementById('domainSelect');
    if (domainSelect) {
        domainSelect.addEventListener('change', function () {
            const domainInput = document.getElementById('domain');
            const selectedValue = this.value;

            if (selectedValue === '기타입력') {
                domainInput.value = '';
                domainInput.removeAttribute('readonly');
            } else {
                domainInput.value = selectedValue;
                domainInput.setAttribute('readonly', true);
            }
        });
    }
});
