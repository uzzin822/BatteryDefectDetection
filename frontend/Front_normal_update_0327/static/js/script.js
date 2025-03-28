// ===============================
// 실시간 이상 알림 + 모달 연동 (테스트용 메시지 추가)
// ===============================

let unreadCount = 0;
let lastReadTime = Date.now();
let unreadMessages = [];
let unreadNotificationVisible = false;

// 읽지 않은 메시지 UI 반영
function updateUnreadAnomalyCount() {
  const countElement = document.getElementById("unreadAnomalyCount");
  countElement.textContent = unreadCount > 0 ? unreadCount : "";
  countElement.classList.toggle("hidden", unreadCount === 0);
}

// 알림 모달에 추가
function addNotification(message) {
  const list = document.getElementById("notificationItems");
  const item = document.createElement("div");
  const now = new Date();
  const time = now.toLocaleTimeString("ko-KR");
  const date = now.toISOString().split("T")[0];

  item.classList.add("notification-item");
  item.innerHTML = `
    <span class="notification-text">${date} ${time} - ${message}</span>
    <button class="delete-btn" onclick="removeNotification(this)">❌</button>
  `;

  list.prepend(item);
}

function removeNotification(button) {
  const text = button.parentElement.textContent;
  unreadMessages = unreadMessages.filter(msg => !text.includes(msg));
  button.parentElement.remove();
  unreadCount = unreadMessages.length;
  updateUnreadAnomalyCount();
}

function clearAllNotifications() {
  document.getElementById("notificationItems").innerHTML = "";
  unreadMessages = [];
  unreadCount = 0;
  updateUnreadAnomalyCount();
}

// 📌 이상 알림 생성 및 3초 유지
function addAnomalyAlert(message) {
  const container = document.getElementById("anomalyAlertContainer");

  if (unreadNotificationVisible) {
    unreadMessages.push(message);
    unreadCount = unreadMessages.length;
    updateUnreadAnomalyCount();
    showUnreadMessageNotification();
    return;
  }

  const alert = document.createElement("div");
  alert.className = "anomaly-alert";
  alert.innerHTML = `
    <span>${message}</span>
    <button class="confirm-btn" onclick="markAnomalyAsRead(this, '${message}')">확인</button>
  `;
  container.appendChild(alert);

  unreadMessages.push(message);
  unreadCount++;
  updateUnreadAnomalyCount();
  addNotification(message);

  // ✅ 3초 후 자동 제거
  setTimeout(() => {
    if (alert && alert.parentElement) {
      alert.remove();
    }
  }, 3000);

  // ⏱️ 마지막 읽은 시간 기록
  lastReadTime = Date.now();
}

function markAnomalyAsRead(button, message) {
  button.parentElement.remove();
  lastReadTime = Date.now();
  unreadNotificationVisible = false;

  unreadMessages = unreadMessages.filter(msg => msg !== message);
  unreadCount = unreadMessages.length;
  updateUnreadAnomalyCount();

  document.querySelectorAll(".notification-item").forEach(item => {
    if (item.innerText.includes(message)) {
      item.classList.add("read-notification");
    }
  });
}

function checkUnreadMessages() {
  const elapsed = Date.now() - lastReadTime;
  if (elapsed >= 30000 && unreadMessages.length > 0) {
    showUnreadMessageNotification();
  }
}

function showUnreadMessageNotification() {
  const container = document.getElementById("anomalyAlertContainer");

  if (unreadNotificationVisible) {
    const span = document.querySelector(".unread-message-notification span");
    if (span) span.textContent = `⚠ 안 읽은 메시지 ${unreadCount}건이 있습니다.`;
    return;
  }

  const alert = document.createElement("div");
  alert.className = "anomaly-alert unread-message-notification";
  alert.innerHTML = `
    <span>⚠ 안 읽은 메시지 ${unreadCount}건이 있습니다.</span>
    <button class="confirm-btn" onclick="markUnreadMessagesAsRead()">확인</button>
  `;

  container.innerHTML = "";
  container.appendChild(alert);
  unreadNotificationVisible = true;
}

function markUnreadMessagesAsRead() {
  const container = document.getElementById("anomalyAlertContainer");
  container.innerHTML = "";
  unreadNotificationVisible = false;
  lastReadTime = Date.now();
  unreadMessages = [];
  unreadCount = 0;
  updateUnreadAnomalyCount();
}

function toggleNotificationDropdown() {
  const dropdown = document.getElementById("notificationDropdown");
  dropdown.classList.toggle("hidden");
  dropdown.style.display = dropdown.classList.contains("hidden") ? "none" : "block";
}

document.addEventListener("click", function (event) {
  const dropdown = document.getElementById("notificationDropdown");
  const icon = document.querySelector(".notification-icon");
  const closeBtn = document.querySelector(".close-dropdown");

  if (!dropdown.contains(event.target) && !icon.contains(event.target) && !closeBtn.contains(event.target)) {
    return; // 외부 클릭 무시
  }
});

// 📌 서버에서 이상 알림 데이터 가져오기 (주석 처리)
// async function fetchAnomalyData() {
//     try {
//         const response = await fetch('/api/anomalies'); // 서버에서 이상 알림 데이터 가져오기
//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         const data = await response.json();
//         addAnomalyAlert(`⚠ ${data.message}`);
//     } catch (error) {
//         console.error("Error fetching anomaly data:", error);
//     }
// }

// 📌 테스트용 알림 생성
setInterval(() => {
  const lines = ["A", "B", "C", "D"];
  const randomLine = lines[Math.floor(Math.random() * lines.length)];
  const message = `⚠ 라인 ${randomLine}에서 불량 발생`;
  addAnomalyAlert(message);
}, 5000); // 5초마다 테스트 알림 생성

// ⏱️ 30초마다 읽지 않은 메시지 체크
setInterval(() => {
  checkUnreadMessages();
}, 30000);