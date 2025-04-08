// // 차트 데이터 (임시 데이터 유지)
// const chartData = {
//     line: {
//         day: { labels: ['라인 A', '라인 B', '라인 C'], defectData: [2.1, 1.8, 2.5], normalData: [97.9, 98.2, 97.5] },
//         week: { labels: ['라인 A', '라인 B', '라인 C'], defectData: [15.3, 12.7, 14.9], normalData: [84.7, 87.3, 85.1] },
//         month: { labels: ['라인 A', '라인 B', '라인 C'], defectData: [20.5, 18.2, 22.1], normalData: [79.5, 81.8, 77.9] }
//     },
//     trend: {
//         3: { labels: ['0시', '1시', '2시', '3시'], defectData: [12, 14, 16, 18], normalData: [300, 310, 320, 350] },
//         6: { labels: ['0시', '1시', '2시', '3시', '4시', '5시', '6시'], defectData: [10, 13, 17, 20, 18, 14, 12], normalData: [290, 300, 310, 320, 315, 305, 295] },
//         12: { labels: ['0시', '1시', '2시', '3시', '4시', '5시', '6시', '7시', '8시', '9시', '10시', '11시', '12시'], defectData: [8, 12, 14, 11, 13, 9, 7, 6, 8, 12, 11, 14, 10], normalData: [280, 290, 300, 295, 310, 305, 300, 295, 290, 300, 310, 320, 315] },
//         24: { labels: ['0시', '2시', '4시', '6시', '8시', '10시', '12시', '14시', '16시', '18시', '20시', '22시', '24시'], defectData: [3, 5, 6, 4, 5, 8, 12, 11, 13, 10, 9, 7, 5], normalData: [270, 280, 290, 285, 300, 310, 320, 315, 310, 305, 300, 295, 290] }
//     }
// };

// // 생산라인별 불량률 및 정상률 차트
// const lineCtx = document.getElementById('lineChart');
// if (lineCtx) {
//     const lineChart = new Chart(lineCtx.getContext('2d'), {
//         type: 'bar',
//         data: {
//             labels: chartData.line.day.labels,
//             datasets: [
//                 {
//                     label: '불량률 (%)',
//                     data: chartData.line.day.defectData,
//                     backgroundColor: ['#e74c3c', '#3498db', '#f1c40f'],
//                     borderColor: ['#e74c3c', '#3498db', '#f1c40f'],
//                     borderWidth: 1
//                 },
//                 {
//                     label: '정상률 (%)',
//                     data: chartData.line.day.normalData,
//                     backgroundColor: ['#2ecc71', '#2ecc71', '#2ecc71'],
//                     borderColor: ['#2ecc71', '#2ecc71', '#2ecc71'],
//                     borderWidth: 1
//                 }
//             ]
//         },
//         options: {
//             responsive: true,
//             scales: { y: { beginAtZero: true } }
//         }
//     });

//     // 라인 차트 데이터 업데이트
//     document.getElementById('linePeriod').addEventListener('change', function () {
//         const period = this.value;
//         lineChart.data.labels = chartData.line[period].labels;
//         lineChart.data.datasets[0].data = chartData.line[period].defectData;
//         lineChart.data.datasets[1].data = chartData.line[period].normalData;
//         lineChart.update();
//     });
// }

// // 시간대별 불량 및 정상 추이 차트
// const trendCtx = document.getElementById('trendChart');
// if (trendCtx) {
//     const trendChart = new Chart(trendCtx.getContext('2d'), {
//         type: 'line',
//         data: {
//             labels: chartData.trend[3].labels,
//             datasets: [
//                 {
//                     label: '불량 건수',
//                     data: chartData.trend[3].defectData,
//                     borderColor: '#e74c3c',
//                     fill: true
//                 },
//                 {
//                     label: '정상 건수',
//                     data: chartData.trend[3].normalData,
//                     borderColor: '#2ecc71',
//                     fill: true
//                 }
//             ]
//         },
//         options: {
//             responsive: true,
//             scales: { y: { beginAtZero: true } }
//         }
//     });

//     // 시간대별 차트 데이터 업데이트
//     document.getElementById('timePeriod').addEventListener('change', function () {
//         const period = parseInt(this.value);
//         trendChart.data.labels = chartData.trend[period].labels;
//         trendChart.data.datasets[0].data = chartData.trend[period].defectData;
//         trendChart.data.datasets[1].data = chartData.trend[period].normalData;
//         trendChart.update();
//     });
// }

// // 상세 페이지 이동 함수
// function goToDetailPage(date, line, score, status) {
//     window.location.href = `/detail-analysis?date=${date}&line=${line}&score=${score}&status=${status}`;
// }

// // 로그 새로고침 함수
// function refreshLogs() {
//     const logBody = document.getElementById('logBody');
//     logBody.innerHTML = ''; // 초기화

//     // DB에서 데이터 가져오기
//     fetch('/api/detail_data')
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }
//             return response.json();
//         })
//         .then(data => {
//             console.log("Fetched log data:", data); // 데이터 확인용 로그
//             if (!data || data.length === 0) {
//                 logBody.innerHTML = '<tr><td colspan="5">불량 데이터가 없습니다.</td></tr>';
//                 return;
//             }

//             data.forEach(item => {
//                 const row = document.createElement('tr');
//                 row.className = 'log-item';
//                 const date = new Date(item.logDate).toLocaleDateString('ko-KR');
//                 const line = item.lineIdx;
//                 const status = item.status;
//                 const score = item.faultyScore;
//                 row.onclick = () => goToDetailPage(date, line, score, status);
//                 row.innerHTML = `
//                     <td>${date}</td>
//                     <td>라인 ${line}</td>
//                     <td class="${status === '불량(심각)' ? 'severity-high' : 'severity-medium'}">${score}점</td>
//                     <td class="${status === '불량(심각)' ? 'severity-high' : 'severity-medium'}">${status}</td>
//                 `;
//                 logBody.appendChild(row);
//             });
//         })
//         .catch(error => {
//             console.error("Error fetching logs:", error);
//             logBody.innerHTML = '<tr><td colspan="5">로그 로드에 실패했습니다.</td></tr>';
//         });
// }

// // 페이지 로드 시 로그 새로고침
// refreshLogs();

document.addEventListener('DOMContentLoaded', () => {
    // loadLineOptions(); // 생산라인 옵션 로드
    loadLogs(); // 로그 데이터 로드
});



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



// 로그 테이블 동적 로드 및 필터링
let currentPage = 1; // 현재 페이지
const itemsPerPage = 10; // 페이지당 항목 수

function loadLogs() {
    const statusFilter = document.getElementById('statusFilter').value; // 상태 필터 값
    const lineFilter = document.getElementById('lineFilter').value; // 라인 필터 값

    fetch(`/api/total_log?status=${statusFilter}&line=${lineFilter}&page=${currentPage}&items_per_page=${itemsPerPage}`)
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('logTableBody');
            tbody.innerHTML = '';

            console.log("Fetched Logs:", data.logs); // 디버깅 로그

            data.logs.forEach(log => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 cursor-pointer';

                // const dateTime = new Date(log.logDate).toLocaleString('ko-KR');
                row.innerHTML = `
                    <td>${log.logDate}</td>
                    <td>
                        ${log.STATUS === '정상' ? 'nomal_' : log.STATUS === '불량(주의)' ? 'fault_' :'fault_'}${log.idx}
                    </td>
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

                row.onclick = () => window.location.href = `/detail_analysis?faultyIdx=${log.faultyIdx}&logDate=${encodeURIComponent(log.logDate)}&lineType=${encodeURIComponent(log.linName)}&faultyScore=${log.score}&status=${encodeURIComponent(log.STATUS)}&faultyImage=${encodeURIComponent(faultyImage)}``;
                tbody.appendChild(row);
            });

            // 총 항목 수 업데이트
            document.getElementById('totalItems').textContent = data.total_items;

            // 페이지 버튼 생성
            createPaginationButtons(data.total_pages);
        })
        .catch(error => console.error('Error loading logs:', error));
}

function createPaginationButtons(totalPages) {
    const paginationContainer = document.getElementById('paginationContainer');
    paginationContainer.innerHTML = ''; // 기존 버튼 초기화

    const maxVisiblePages = 5; // 한 번에 표시할 최대 페이지 수
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2)); // 시작 페이지 계산
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1); // 끝 페이지 계산

    // 시작 페이지가 1보다 크면 조정
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // "이전" 버튼 추가
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

    // "다음" 버튼 추가
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

document.getElementById('exportCsv').addEventListener('click', () => {
    const statusFilter = document.getElementById('statusFilter').value;
    const lineFilter = document.getElementById('lineFilter').value;

    // URL 생성 (필터 값 추가)
    const url = `/api/export_logs?status=${statusFilter}&line=${lineFilter}`;
    
    // 새 창에서 다운로드 트리거
    window.location.href = url;
});

// 필터 및 페이지네이션 이벤트
document.getElementById('statusFilter').addEventListener('change', () => { currentPage = 1; loadLogs(); });
document.getElementById('lineFilter').addEventListener('change', () => { currentPage = 1; loadLogs(); });
document.getElementById('prevPage').addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadLogs(); } });
document.getElementById('nextPage').addEventListener('click', () => { currentPage++; loadLogs(); });

// 초기 로드
loadLogs();

// 창 크기 조절 시 차트 리사이즈
window.addEventListener('resize', () => {
    lineChart.resize();
    barChart.resize();
});



