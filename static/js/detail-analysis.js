let currentPage = 1;
const logsPerPage = 10;
let currentType = 'all';

function filterLogs(type) {
    const url = new URL(window.location.href);
    url.searchParams.set('type', type);
    url.searchParams.set('log_page', 1); // 필터 바뀔 때 첫 페이지로 이동

    window.location.href = url.toString();
}


function updatePaginationAndDisplay() {
    const logs = document.querySelectorAll("#logs-table tbody tr");
    let filteredLogs = [];

    logs.forEach(log => {
        const text = log.children[1].innerText.trim(); // 공백 제거
        const isFaulty = text.startsWith("fault_");
        const isNormal = text.startsWith("normal_");

        if (currentType === 'all' ||
            (currentType === 'faulty' && isFaulty) ||
            (currentType === 'normal' && isNormal)) {
            filteredLogs.push(log);
        } else {
            log.classList.add("hidden");
        }
    });

    // 전체 숨기고, 현재 페이지에 맞는 것만 보여줌
    filteredLogs.forEach(log => log.classList.add("hidden"));
    const start = (currentPage - 1) * logsPerPage;
    const end = start + logsPerPage;
    filteredLogs.slice(start, end).forEach(log => log.classList.remove("hidden"));

    renderPagination(filteredLogs.length);
}

function renderPagination(totalLogs) {
    const totalPages = Math.ceil(totalLogs / logsPerPage);
    const paginationContainer = document.getElementById("pagination");
    paginationContainer.innerHTML = ""; // 기존 버튼 제거

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.innerText = i;
        btn.className = "mx-1 px-2 py-1 rounded border" + (i === currentPage ? " bg-gray-400" : "");
        btn.onclick = () => {
            currentPage = i;
            updatePaginationAndDisplay();
        };
        paginationContainer.appendChild(btn);
    }
}
document.addEventListener('DOMContentLoaded', function () {
    // URL에서 쿼리 매개변수 가져오기
    const urlParams = new URLSearchParams(window.location.search);

    const faultyIdx = urlParams.get('faultyIdx');
    const logDate = urlParams.get('logDate');
    const lineType = urlParams.get('lineType');
    const faultyScore = urlParams.get('faultyScore');
    const status = urlParams.get('status');
    const faultyImage = urlParams.get('faultyImage');

    // 모든 데이터가 존재하면 showDefectDetails 실행
    if (faultyIdx && logDate && lineType && faultyScore && status && faultyImage) {
        showDefectDetails(faultyIdx, logDate, lineType, faultyScore, status, faultyImage);
    } else {
        console.error('필요한 데이터가 부족합니다.');
    }
});


// showDefectDetails 함수 수정
function showDefectDetails(faultyIdx, logDate, lineType, faultyScore, status, faultyImage) {
    // 이미지 경로 보정
    const imagePath = faultyImage.startsWith('static/') ? `/${faultyImage}` : faultyImage;
    
    document.getElementById('detail-faultyIdx').innerText = `fault_${faultyIdx}`;
    document.getElementById('detail-date').innerText = logDate;
    document.getElementById('detail-line').innerText = lineType;
    document.getElementById('detail-score').innerText = faultyScore;
    document.getElementById('detail-status').innerText = status;
    document.getElementById('main-defect-image').src = imagePath; // 수정된 경로 사용
    document.getElementById('defect-detail').style.display = 'block';
}
