document.addEventListener('DOMContentLoaded', () => {
    loadLineOptions(); // 생산라인 옵션 로드
    loadLogs(); // 로그 데이터 로드
});

// 페이지 관련 변수
let currentPage = 1; // 현재 페이지
const itemsPerPage = 10; // 페이지당 항목 수

// 생산라인별 불량률 및 정상률 차트
const lineChart = echarts.init(document.getElementById('lineChart'));
lineChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['불량률', '정상률'] },
    xAxis: { type: 'category', data: ['라인 A', '라인 B', '라인 C'] },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    series: [
        {
            name: '불량률',
            type: 'bar',
            data: [2.5, 1.9, 2.2],
            itemStyle: { color: '#e74c3c', borderRadius: [10, 10, 0, 0] }
        },
        {
            name: '정상률',
            type: 'bar',
            data: [97.5, 98.1, 97.8],
            itemStyle: { color: '#2ecc71', borderRadius: [10, 10, 0, 0] }
        }
    ]
});

// 불량률 및 정상률 추이 차트
const barChart = echarts.init(document.getElementById('barChart'));
barChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['불량률', '정상률'] },
    xAxis: { type: 'category', data: ['2/9', '2/10', '2/11', '2/12', '2/13', '2/14', '2/15'] },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    series: [
        {
            name: '불량률',
            type: 'bar',
            data: [2.1, 2.4, 1.8, 2.8, 2.3, 2.9, 2.5],
            barWidth: '40%',
            itemStyle: { color: '#e74c3c', borderRadius: [10, 10, 0, 0] }
        },
        {
            name: '정상률',
            type: 'bar',
            data: [97.9, 97.6, 98.2, 97.2, 97.7, 97.1, 97.5],
            barWidth: '40%',
            itemStyle: { color: '#2ecc71', borderRadius: [10, 10, 0, 0] }
        }
    ]
});

// 생산라인 옵션 로드
function loadLineOptions() {
    fetch('/api/lines')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const lineFilter = document.getElementById('lineFilter');
            lineFilter.innerHTML = '<option value="">라인: 전체</option>'; // 기본 옵션 추가

            data.forEach(line => {
                const option = document.createElement('option');
                option.value = line.lineIdx; // lineIdx를 값으로 설정
                option.textContent = line.lineName; // lineName을 표시 텍스트로 설정
                lineFilter.appendChild(option);
            });

            console.log("Line options loaded successfully:", data); // 디버깅 로그
        })
        .catch(error => console.error('Error loading lines:', error));
}

// 필터 변경 이벤트 리스너
document.getElementById('statusFilter').addEventListener('change', function () {
    currentPage = 1; // 페이지를 1로 리셋
    loadLogs(); // 로그를 다시 로드
});

document.getElementById('lineFilter').addEventListener('change', function () {
    currentPage = 1; // 페이지를 1로 리셋
    loadLogs(); // 로그를 다시 로드
});

// 로그 로드 함수
function loadLogs() {
    const statusFilter = document.getElementById('statusFilter').value;
    const lineFilter = document.getElementById('lineFilter').value;

    fetch(`/api/total_log?status=${statusFilter}&line=${lineFilter}&page=${currentPage}&items_per_page=${itemsPerPage}`)
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('logTableBody');
            tbody.innerHTML = '';

            if (data.logs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5">등록된 로그가 없습니다.</td></tr>';
                return;
            }

            data.logs.forEach(log => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 cursor-pointer';
                row.innerHTML = `
                    <td>${log.logDate}</td>
                    <td>${log.STATUS === '정상' ? 'normal_' : 'fault_'}${log.idx}</td>
                    <td>${log.lineName || '-'}</td>
                    <td>${log.score ? `${log.score}점` : '-'}</td>
                    <td>
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${log.STATUS === '정상' ? 'bg-green-100 text-green-800' :
                        log.STATUS === '불량(주의)' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'}">
                        ${log.STATUS}
                        </span>
                    </td>
                `;
                row.onclick = () => {
                    if (log.STATUS === '불량(심각)' || log.STATUS === '불량(주의)') {
                        goToDetailPage(log.idx, log.logDate, log.lineName, log.score, log.STATUS, log.image || 'default_image_path.jpg');
                    }
                };
                tbody.appendChild(row);
            });

            // 총 항목 수 업데이트
            document.getElementById('totalItems').textContent = data.total_items;

            // 현재 페이지의 항목 범위 업데이트
            const startItem = (currentPage - 1) * itemsPerPage + 1;
            const endItem = Math.min(currentPage * itemsPerPage, data.total_items);
            document.getElementById('currentItemRange').textContent = `${startItem}-${endItem}`;

            // 페이지 버튼 생성
            createPaginationButtons(data.total_pages);
        })
        .catch(error => console.error('Error loading logs:', error));
}

// 페이지 버튼 생성 함수
function createPaginationButtons(totalPages) {
    const paginationContainer = document.getElementById('paginationContainer');
    paginationContainer.innerHTML = ''; // 기존 버튼 초기화

    const maxVisiblePages = 5; // 한 번에 표시할 최대 페이지 수
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // 시작 페이지 조정
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // 이전 버튼 추가
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = '이전';
        prevButton.className = 'btn';
        prevButton.addEventListener('click', () => {
            currentPage--;
            loadLogs();
        });
        paginationContainer.appendChild(prevButton);
    }

    // 페이지 번호 버튼 추가
    for (let i = startPage; i <= endPage; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.className = `btn ${i === currentPage ? 'btn-active' : ''}`;
        button.addEventListener('click', () => {
            currentPage = i;
            loadLogs();
        });
        paginationContainer.appendChild(button);
    }

    // 다음 버튼 추가
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.textContent = '다음';
        nextButton.className = 'btn';
        nextButton.addEventListener('click', () => {
            currentPage++;
            loadLogs();
        });
        paginationContainer.appendChild(nextButton);
    }
}

// 상세 페이지 이동 함수
function goToDetailPage(faultyIdx, date, line, score, status, faultyImage) {
    const imagePath = faultyImage || '/default-image.jpg';
    const url = `/detail_analysis?faultyIdx=${faultyIdx}&logDate=${encodeURIComponent(date)}&lineType=${encodeURIComponent(line)}&faultyScore=${score}&status=${encodeURIComponent(status)}&faultyImage=${encodeURIComponent(imagePath)}`;
    window.location.href = url;
}

// CSV 내보내기 버튼 이벤트
document.getElementById('exportCsv').addEventListener('click', () => {
    const statusFilter = document.getElementById('statusFilter').value;
    const lineFilter = document.getElementById('lineFilter').value;

    // URL 생성 (필터 값 추가)
    const url = `/api/export_logs?status=${statusFilter}&line=${lineFilter}`;

    // 새 창에서 다운로드 트리거
    window.location.href = url;
});

// 창 크기 조절 시 차트 리사이즈
window.addEventListener('resize', () => {
    lineChart.resize();
    barChart.resize();
});