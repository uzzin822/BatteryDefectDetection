// 생산라인별 차트 업데이트 함수
function updateLineChart(period) {
    lineChart.data.labels = chartData.line[period].labels;
    lineChart.data.datasets[0].data = chartData.line[period].defectData;
    lineChart.data.datasets[1].data = chartData.line[period].normalData;
    lineChart.update();
}

// 생산라인별 셀렉트 박스 이벤트 추가
document.getElementById('linePeriod').addEventListener('change', function() {
    updateLineChart(this.value); // 'day', 'week', 'month' 중 하나 선택
});

// 차트 데이터 (임시 데이터 유지)
const chartData = {
    line: {
        day: {
            labels: ['라인 A', '라인 B', '라인 C'],
            defectData: [2.1, 1.8, 2.5],
            normalData: [97.9, 98.2, 97.5]
        },
        week: {
            labels: ['라인 A', '라인 B', '라인 C'],
            defectData: [15.3, 12.7, 14.9],
            normalData: [84.7, 87.3, 85.1]
        },
        month: {
            labels: ['라인 A', '라인 B', '라인 C'],
            defectData: [20.5, 18.2, 22.1],
            normalData: [79.5, 81.8, 77.9]
        }
    },
    trend: {
        3: {
            labels: ['0시', '1시', '2시', '3시'],
            defectData: [12, 14, 16, 18],
            normalData: [300, 310, 320, 350]
        },
        6: {
            labels: ['0시', '1시', '2시', '3시', '4시', '5시', '6시'],
            defectData: [10, 13, 17, 20, 18, 14, 12],
            normalData: [290, 300, 310, 320, 315, 305, 295]
        },
        12: { // 12시간 데이터 추가
            labels: ['0시', '2시', '4시', '6시', '8시', '10시', '12시'],
            defectData: [8, 12, 14, 11, 13, 9, 7],
            normalData: [280, 290, 300, 295, 310, 305, 300]
        },
        24: { // 24시간 데이터 추가
            labels: ['0시', '4시', '8시', '12시', '16시', '20시', '24시'],
            defectData: [5, 7, 9, 6, 8, 10, 12],
            normalData: [270, 280, 290, 285, 300, 310, 320]
        }
    }
};

// 차트 초기화
const lineCtx = document.getElementById('lineChart').getContext('2d');
const lineChart = new Chart(lineCtx, {
    type: 'bar',
    data: {
        labels: chartData.line.day.labels,
        datasets: [
            {
                label: '불량률 (%)',
                data: chartData.line.day.defectData,
                backgroundColor: ['#e74c3c', '#3498db', '#f1c40f']
            },
            {
                label: '정상률 (%)',
                data: chartData.line.day.normalData,
                backgroundColor: ['#2ecc71']
            }
        ]
    },
    options: { responsive: true }
});

// 시간대별 불량 및 정상 추이 차트 초기화
const trendCtx = document.getElementById('trendChart');
if (trendCtx) {
    const trendChart = new Chart(trendCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: chartData.trend[3].labels,
            datasets: [
                {
                    label: '불량 건수',
                    data: chartData.trend[3].defectData,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231,76,60,0.2)',
                    fill: true,
                },
                {
                    label: '정상 건수',
                    data: chartData.trend[3].normalData,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46,204,113,0.2)',
                    fill: true,
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // 시간대 선택 이벤트 핸들러
    document.getElementById('timePeriod').addEventListener('change', function () {
        const period = parseInt(this.value);
        trendChart.data.labels = chartData.trend[period].labels;
        trendChart.data.datasets[0].data = chartData.trend[period].defectData;
        trendChart.data.datasets[1].data = chartData.trend[period].normalData;
        trendChart.update();
    });
}
// 상세 페이지 이동 함수
function goToDetailPage(faultyIdx, date, line, score, status, faultyImage) {
    const url = `/detail_analysis?faultyIdx=${faultyIdx}&logDate=${encodeURIComponent(date)}&lineType=${encodeURIComponent(line)}&faultyScore=${score}&status=${encodeURIComponent(status)}&faultyImage=${encodeURIComponent(faultyImage)}`;
    window.location.href = url;
}

// 불량 로그 새로고침 함수
function refreshLogs() {
    const logBody = document.getElementById('logBody');
    const today_fault = document.getElementById('today_fault');
    const today_normal = document.getElementById('today_normal');
    const seenLogs = new Set(); // 중복 제거를 위한 Set

    logBody.innerHTML = ''; // 초기화

    fetch('/api/defective_logs')
        .then(response => response.json())
        .then(data => {
            today_fault.innerText = `${data.fault_total_items}건`;
            today_normal.innerText = `${data.normal_total_items}건`;

            if (!data.fault_logs || data.fault_logs.length === 0) {
                logBody.innerHTML = '<tr><td colspan="5">금일 등록된 불량 데이터가 없습니다.</td></tr>';
                return;
            }

            data.fault_logs.forEach(item => {
                const identifier = `${item.faultyIdx}-${item.logDate}-${item.linename}`;
                if (!seenLogs.has(identifier)) { // 중복 확인
                    seenLogs.add(identifier);

                    const row = document.createElement('tr');
                    row.className = 'log-item';
                    row.onclick = () => goToDetailPage(item.faultyIdx, item.logDate, item.linename, item.faultyScore, item.status, item.faultyImage);
                    row.innerHTML = `
                        <td>${item.logDate}</td>
                        <td>fault_${item.faultyIdx}</td>
                        <td>${item.linename}</td>
                        <td>${item.faultyScore}점</td>
                        <td>
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${item.status === '불량(주의)' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                            ${item.status}
                            </span>
                        </td>
                    `;
                    logBody.appendChild(row);
                }
            });
        })
        .catch(error => console.error("Error fetching logs:", error));
}

// WebSocket 연결
document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // 핵심 기능: 새로운 이미지 수신 및 경고 메시지 숨김
    socket.on('new_image', function(data) {
        console.log('new_image 이벤트 수신:', data);
        if (data.image_path) {
            const camera1 = document.getElementById("camera1");
            camera1.src = data.image_path;
            camera1.style.display = "block"; // 이미지가 로드되면 표시
            // 이미지가 수신되면 경고 메시지 숨김
            const warningElement = document.getElementById("camera1-warning");
            if (warningElement) {
                warningElement.style.display = "none";
            } else {
                console.error('camera1-warning 요소를 찾을 수 없음');
            }
        }
    });
    
    socket.on('new_alert', function (data) {
        if (data.message) {
            const logBody = document.getElementById('logBody');
            const identifier = `${data.faultyIdx}-${data.logDate}-${data.linename}`;

            const isDuplicate = Array.from(logBody.children).some(row =>
                row.querySelector('td:nth-child(2)').textContent === `fault_${data.faultyIdx}`
            );

            if (!isDuplicate) { // 중복 확인
                const row = document.createElement('tr');
                row.className = 'log-item';
                row.innerHTML = `
                    <td>${data.logDate}</td>
                    <td>fault_${data.faultyIdx}</td>
                    <td>${data.linename}</td>
                    <td>${data.fault_score}점</td>
                    <td>${data.status}</td>
                `;
                logBody.insertBefore(row, logBody.firstChild);

                // 로그 최대 개수 제한
                if (logBody.children.length > 10) {
                    logBody.removeChild(logBody.lastChild);
                }
            }
        }
    });

    refreshLogs(); // 페이지 로드 시 초기화
});


