// ✅ 승인 처리
function approveMember(userid, username) {
    if (confirm(`${username} 님을 승인 처리하시겠습니까?`)) {
      fetch(`/approve_member/${userid}`, { method: "POST" })
        .then(res => res.json())
        .then(data => {
          alert(data.message || "승인되었습니다.");
          location.reload();
        });
    }
  }
  
  // ✅ 거절 처리
  function refuseMember(userid, username) {
    if (confirm(`${username} 님을 거절 처리하시겠습니까?`)) {
      fetch(`/refuse_member/${userid}`, { method: "POST" })
        .then(res => res.json())
        .then(data => {
          alert(data.message || "거절 처리되었습니다.");
          location.reload();
        });
    }
  }
  
  // ✅ 관리자 제외 처리
  function confirmChange(username, userid) {
    if (confirm(`${username} 님을 관리자 목록에서 제외하시겠습니까?`)) {
      fetch(`/remove_admin/${userid}`, { method: "POST" })
        .then(res => res.json())
        .then(data => {
          alert(data.message || "제외되었습니다.");
          location.reload();
        });
    }
  }
  
  // ✅ 회원 삭제 처리
  function deleteMember(userid) {
    if (confirm("정말로 이 회원을 삭제하시겠습니까?")) {
      fetch(`/delete_member/${userid}`, { method: "DELETE" })
        .then(res => res.json())
        .then(data => {
          alert(data.message || "삭제되었습니다.");
          location.reload();
        });
    }
  }
  
  // ✅ 페이징
  function changePage(page, section) {
    const url = new URL(window.location.href);
    url.searchParams.set(section + "_page", page);
    window.location.href = url.toString();
  }
  
  function changeAdminPage(page) {
    changePage(page, "admin");
  }
  
  function changePendingPage(page) {
    changePage(page, "pending");
  }
  
  // ✅ 실시간 검색 (회원 ID / 이름 / 사번)
  function searchMembers() {
    const id = document.getElementById("searchId").value.toLowerCase();
    const name = document.getElementById("searchName").value.toLowerCase();
    const empNo = document.getElementById("searchEmpNo").value.toLowerCase();
  
    const rows = document.querySelectorAll("#memberTableBody tr");
  
    rows.forEach(row => {
      const tds = row.querySelectorAll("td");
      if (tds.length < 9) return; // 유효성 체크
  
      const userId = tds[1].textContent.toLowerCase();
      const userName = tds[3].textContent.toLowerCase();
      const userEmp = tds[2].textContent.toLowerCase();
  
      const match =
        userId.includes(id) &&
        userName.includes(name) &&
        userEmp.includes(empNo);
  
      row.style.display = match ? "" : "none";
    });
  }
  