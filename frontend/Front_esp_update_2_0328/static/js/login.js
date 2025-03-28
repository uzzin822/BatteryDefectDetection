const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

signUpButton.addEventListener('click', () => {
  container.classList.add("right-panel-active");
});

signInButton.addEventListener('click', () => {
  container.classList.remove("right-panel-active");
});

window.onload = function () {
  const urlPath = window.location.pathname; // 현재 URL 경로 가져오기
  const container = document.getElementById('container'); // 전체 컨테이너
  let isIdAvailable = false; // ID 중복 체크 결과 저장 변수

  // URL이 '/join'일 때 회원가입 영역 표시
  if (urlPath === '/join') {
      container.classList.add("right-panel-active"); // 회원가입 영역 활성화
  }

  const signUpButton = document.getElementById('signUp');
  const signInButton = document.getElementById('signIn');
  const checkIdButton = document.getElementById('checkIdButton');
  const useridInput = document.getElementById('userid');

  signUpButton.addEventListener('click', () => {
      container.classList.add("right-panel-active");
      history.pushState(null, '', '/join');  // URL을 /join으로 변경
      document.title = "회원가입"; // 제목 변경
  });

  signInButton.addEventListener('click', () => {
      container.classList.remove("right-panel-active");
      history.pushState(null, '', '/login');  // URL을 /login으로 변경
      document.title = "로그인"; // 제목 변경
  });

  // ID 중복 체크 버튼 클릭 이벤트 리스너
  checkIdButton.addEventListener('click', function (event) {
      event.preventDefault(); // 기본 제출 동작을 막음
      const userId = useridInput.value;

      // 아이디 입력 여부 및 길이 확인
      if (!userId) {
          alert('아이디를 입력해 주세요.'); // 아이디 입력 안내 메시지
          return; // 함수 종료
      } else if (userId.length < 3) {
          alert('아이디는 3자리 이상이어야 합니다.'); // 아이디 길이 안내 메시지
          return; // 함수 종료
      }

      // AJAX 요청
      fetch('/check_id', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId: userId })
      })
          .then(response => {
              if (!response.ok) {
                  throw new Error('Network response was not ok');
              }
              return response.json();
          })
          .then(data => {
              if (!data.available) {
                  alert('이미 사용 중인 아이디입니다.'); // alert 창 표시
                  useridInput.value = ''; // 입력 필드 초기화
                  isIdAvailable = false; // ID 사용 불가
                  useridInput.disabled = false; // ID 입력 필드 활성화
                  checkIdButton.disabled = false; // ID 중복 체크 버튼 활성화
              } else {
                  alert('사용 가능한 아이디입니다.'); // alert 창 표시
                  isIdAvailable = true; // ID 사용 가능
                  useridInput.disabled = true; // ID 입력 필드 비활성화
                  checkIdButton.disabled = true; // ID 중복 체크 버튼 비활성화
              }
          })
          .catch(error => {
              console.error('Error:', error);
          });
  });

  // 회원가입 폼 제출 이벤트 리스너
  document.querySelector('.sign-up-container form').addEventListener('submit', function (event) {
      const password = document.querySelector('input[name="password"]').value;

      if (!isIdAvailable) {
          event.preventDefault();
          alert('아이디 중복 체크를 완료해 주세요.');
      } else if (password.length < 4) {
          event.preventDefault();
          alert('비밀번호는 4자리 이상이어야 합니다.');
      } else {
          // 제출 전에 disabled 해제하여 값이 전송되도록 함
          document.getElementById('userid').disabled = false;
      }
  });

  // 이메일 도메인 선택에 따른 입력 처리
  document.getElementById('domainSelect').addEventListener('change', function() {
      const domainInput = document.getElementById('domain');
      const selectedValue = this.value;

      if (selectedValue === '기타입력') {
          domainInput.value = ''; // 기타입력을 선택하면 입력창 비워두기
          domainInput.removeAttribute('readonly'); // 입력 가능하게 설정
      } else {
          domainInput.value = selectedValue; // 선택한 도메인으로 입력창 채우기
          domainInput.setAttribute('readonly', true); // 입력 불가능하게 설정
      }
  });
};