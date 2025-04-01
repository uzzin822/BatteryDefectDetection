// detail-analysis.js
const IMAGES_PER_PAGE = 12; // 3줄 (한 줄에 4개 이미지)
const LOGS_PER_PAGE = 10;
let imageCurrentPage = 1;
let logCurrentPage = 1;
let logData = [];

document.addEventListener('DOMContentLoaded', function () {
    // API 호출 전에 모든 요소가 로드되었는지 확인
    const defectDetails = document.getElementById('defect-details');
    const logTable = document.getElementById('log-table');
    const defectImages = document.getElementById('defect-images');

    if (!defectDetails || !logTable || !defectImages) {
        console.error('필요한 DOM 요소가 로드되지 않았습니다.');
        return;
    }

    // API 호출을 통해 fault_visual 데이터를 가져옴
    fetch('/api/detail_data')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Fetched data:", data); // 데이터 확인용 로그
            if (!data || data.length === 0) {
                console.log("데이터가 없습니다.");
                defectDetails.innerHTML = '<p>불량 데이터가 없습니다.</p>';
                logTable.innerHTML = '<tr><td colspan="4">불량 데이터가 없습니다.</td></tr>';
                defectImages.innerHTML = '';
                return;
            }

            // fault_visual 데이터를 기반으로 데이터 매핑
            logData = data.map((item, index) => ({
                faultyIdx: item.faultyIdx || (index + 1),
                lineIdx: item.lineIdx, // fault_visual과 조인하여 가져온 데이터 가정
                faultScore: item.faultScore,
                visualImage: item.visualImage,
                status: item.status, // fault_visual과 조인하여 가져온 데이터 가정
                logDate: item.logDate
            }));

            // 첫 번째 데이터로 요약 정보 채우기
            const firstItem = logData[0];
            document.getElementById('detail-date').textContent = new Date(firstItem.logDate).toLocaleString('ko-KR');
            document.getElementById('detail-line').textContent = `라인 ${firstItem.lineIdx}`;
            document.getElementById('detail-score').textContent = `${firstItem.faultScore}/100`;
            document.getElementById('detail-level').textContent = firstItem.status;
            document.getElementById('detail-level').className = firstItem.status === "불량(심각)" ? "text-red-500" : "text-yellow-500";
            document.getElementById('main-defect-image').src = firstItem.visualImage ? `/static/visual_images/${firstItem.visualImage.split('/').pop()}` : 'https://via.placeholder.com/400x400?text=No+Image';

            // 불량 이미지 목록 채우기
            populateDefectImages();

            // 금일 로그 채우기
            populateLogTable();

            prefillCapaForm();

            // 탭 메뉴 동작
            const allTab = document.getElementById('all-tab');
            const defectTab = document.getElementById('defect-tab');
            const normalTab = document.getElementById('normal-tab');

            allTab.addEventListener('click', (e) => handleTabClick(e, 'all'));
            defectTab.addEventListener('click', (e) => handleTabClick(e, 'defect'));
            normalTab.addEventListener('click', (e) => handleTabClick(e, 'normal'));

            // 초기 상태 설정
            handleTabClick({ target: allTab }, 'all');

            // 페이지네이션 이벤트 리스너
            document.getElementById('image-prev-btn').addEventListener('click', () => changeImagePage(-1));
            document.getElementById('image-next-btn').addEventListener('click', () => changeImagePage(1));
            document.getElementById('log-prev-btn').addEventListener('click', () => changeLogPage(-1));
            document.getElementById('log-next-btn').addEventListener('click', () => changeLogPage(1));
        })
        .catch(error => {
            console.error('데이터 로드 실패:', error);
            defectDetails.innerHTML = '<p>데이터 로드에 실패했습니다.</p>';
            logTable.innerHTML = '<tr><td colspan="4">데이터 로드에 실패했습니다.</td></tr>';
            defectImages.innerHTML = '';
        });
});

function populateDefectImages() {
    const defectImages = document.getElementById('defect-images');
    defectImages.innerHTML = '';
    const start = (imageCurrentPage - 1) * IMAGES_PER_PAGE;
    const end = start + IMAGES_PER_PAGE;
    const paginatedData = logData.slice(start, end);

    paginatedData.forEach((item, index) => {
        if (item.visualImage) {
            const imageItem = document.createElement('div');
            imageItem.className = 'cursor-pointer hover:opacity-80 image-item';
            imageItem.dataset.index = start + index;
            imageItem.innerHTML = `
                <img src="/static/visual_images/${item.visualImage.split('/').pop()}" alt="불량 이미지 ${item.faultyIdx}" class="w-full h-48 object-cover rounded-lg shadow-sm"/>
                <div class="info-box">
                    <p class="text-sm text-gray-700">생산라인: 라인 ${item.lineIdx}</p>
                    <p class="text-sm text-gray-700">점수: ${item.faultScore}</p>
                    <p class="text-sm ${item.status === '불량(심각)' ? 'text-red-500' : 'text-yellow-500'}">상태: ${item.status}</p>
                </div>
            `;
            imageItem.addEventListener('click', function() {
                document.getElementById('main-defect-image').src = `/static/visual_images/${item.visualImage.split('/').pop()}`;
                document.getElementById('detail-date').textContent = new Date(item.logDate).toLocaleString('ko-KR');
                document.getElementById('detail-line').textContent = `라인 ${item.lineIdx}`;
                document.getElementById('detail-score').textContent = `${item.faultScore}/100`;
                document.getElementById('detail-level').textContent = item.status;
                document.getElementById('detail-level').className = item.status === '불량(심각)' ? 'text-red-500' : 'text-yellow-500';
            });
            defectImages.appendChild(imageItem);
        }
    });

    updateImagePaginationButtons();
}

function updateImagePaginationButtons() {
    const prevBtn = document.getElementById('image-prev-btn');
    const nextBtn = document.getElementById('image-next-btn');
    prevBtn.disabled = imageCurrentPage === 1;
    nextBtn.disabled = imageCurrentPage * IMAGES_PER_PAGE >= logData.length;
}

function changeImagePage(delta) {
    imageCurrentPage += delta;
    if (imageCurrentPage < 1) imageCurrentPage = 1;
    const maxPage = Math.ceil(logData.length / IMAGES_PER_PAGE);
    if (imageCurrentPage > maxPage) imageCurrentPage = maxPage;
    populateDefectImages();
}

function populateLogTable() {
    const logTable = document.getElementById('log-table');
    logTable.innerHTML = '';
    const start = (logCurrentPage - 1) * LOGS_PER_PAGE;
    const end = start + LOGS_PER_PAGE;
    const paginatedData = logData.slice(start, end);

    paginatedData.forEach(item => {
        const logRow = document.createElement('tr');
        logRow.className = 'log-item';

        let displayStatus = item.status;
        if (displayStatus.includes('불량사항')) {
            displayStatus = '불량(심각)';
        }

        logRow.dataset.status = displayStatus === '불량(심각)' || displayStatus === '불량(주의)' ? '불량' : '정상';

        let formattedDate = '-';
        try {
            const date = new Date(item.logDate);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleString('ko-KR');
            } else {
                console.warn(`Invalid date format for logDate: ${item.logDate}`);
                formattedDate = item.logDate;
            }
        } catch (e) {
            console.error(`Error parsing date for logDate: ${item.logDate}`, e);
            formattedDate = item.logDate;
        }

        logRow.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formattedDate}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#${item.faultyIdx}</td>
            <td class="px-6 py-4 text-sm text-gray-900">라인 ${item.lineIdx}</td>
            <td class="px-6 py-4">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                ${displayStatus === '불량(심각)' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${displayStatus}
                </span>
            </td>
        `;
        logTable.appendChild(logRow);
    });

    updateLogPaginationButtons();
}

function updateLogPaginationButtons() {
    const prevBtn = document.getElementById('log-prev-btn');
    const nextBtn = document.getElementById('log-next-btn');
    prevBtn.disabled = logCurrentPage === 1;
    nextBtn.disabled = logCurrentPage * LOGS_PER_PAGE >= logData.length;
}

function changeLogPage(delta) {
    logCurrentPage += delta;
    if (logCurrentPage < 1) logCurrentPage = 1;
    const maxPage = Math.ceil(logData.length / LOGS_PER_PAGE);
    if (logCurrentPage > maxPage) logCurrentPage = maxPage;
    populateLogTable();
}

function handleTabClick(event, status) {
    const logItems = document.querySelectorAll('.log-item');
    logItems.forEach(item => {
        const itemStatus = item.dataset.status;
        if (status === 'all' || 
           (status === 'defect' && itemStatus !== '정상') || 
           (status === 'normal' && itemStatus === '정상')) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });

    [document.getElementById('all-tab'), document.getElementById('defect-tab'), document.getElementById('normal-tab')].forEach(tab => {
        tab.classList.remove('bg-blue-100', 'border-blue-500', 'text-blue-700');
        tab.classList.add('text-gray-700', 'border-gray-300');
    });
    event.target.classList.remove('text-gray-700', 'border-gray-300');
    event.target.classList.add('bg-blue-100', 'border-blue-500', 'text-blue-700');
}

function downloadReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("불량 분석 보고서", 10, 10);
    doc.text(`날짜: ${document.getElementById('detail-date').textContent}`, 10, 20);
    doc.text(`생산 라인: ${document.getElementById('detail-line').textContent}`, 10, 30);
    doc.text(`불량 점수: ${document.getElementById('detail-score').textContent}`, 10, 40);
    doc.text(`불량 정도: ${document.getElementById('detail-level').textContent}`, 10, 50);
    doc.save("불량_분석_보고서.pdf");
}

function prefillCapaForm() {
    const form = document.getElementById('capa-form');
    form.querySelector('input[name="capa-date"]').value = document.getElementById('detail-date').textContent.split(' ')[0];
    form.querySelector('textarea[name="capa-action"]').value = `라인 ${document.getElementById('detail-line').textContent} 점검\n불량 점수: ${document.getElementById('detail-score').textContent}`;
}