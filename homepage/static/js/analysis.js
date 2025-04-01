// 차트 데이터 (임시 데이터 유지)
const chartData = {
    line: {
        day: { labels: ['라인 A', '라인 B', '라인 C'], defectData: [2.1, 1.8, 2.5], normalData: [97.9, 98.2, 97.5] },
        week: { labels: ['라인 A', '라인 B', '라인 C'], defectData: [15.3, 12.7, 14.9], normalData: [84.7, 87.3, 85.1] },
        month: { labels: ['라인 A', '라인 B', '라인 C'], defectData: [20.5, 18.2, 22.1], normalData: [79.5, 81.8, 77.9] }
    },
    trend: {
        3: { labels: ['0시', '1시', '2시', '3시'], defectData: [12, 14, 16, 18], normalData: [300, 310, 320, 350] },
        6: { labels: ['0시', '1시', '2시', '3시', '4시', '5시', '6시'], defectData: [10, 13, 17, 20, 18, 14, 12], normalData: [290, 300, 310, 320, 315, 305, 295] },
        12: { labels: ['0시', '1시', '2시', '3시', '4시', '5시', '6시', '7시', '8시', '9시', '10시', '11시', '12시'], defectData: [8, 12, 14, 11, 13, 9, 7, 6, 8, 12, 11, 14, 10], normalData: [280, 290, 300, 295, 310, 305, 300, 295, 290, 300, 310, 320, 315] },
        24: { labels: ['0시', '2시', '4시', '6시', '8시', '10시', '12시', '14시', '16시', '18시', '20시', '22시', '24시'], defectData: [3, 5, 6, 4, 5, 8, 12, 11, 13, 10, 9, 7, 5], normalData: [270, 280, 290, 285, 300, 310, 320, 315, 310, 305, 300, 295, 290] }
    }
};

// 생산라인별 불량률 및 정상률 차트
const lineCtx = document.getElementById('lineChart');
if (lineCtx) {
    const lineChart = new Chart(lineCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: chartData.line.day.labels,
            datasets: [
                {
                    label: '불량률 (%)',
                    data: chartData.line.day.defectData,
                    backgroundColor: ['#e74c3c', '#3498db', '#f1c40f'],
                    borderColor: ['#e74c3c', '#3498db', '#f1c40f'],
                    borderWidth: 1
                },
                {
                    label: '정상률 (%)',
                    data: chartData.line.day.normalData,
                    backgroundColor: ['#2ecc71', '#2ecc71', '#2ecc71'],
                    borderColor: ['#2ecc71', '#2ecc71', '#2ecc71'],
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });

    // 라인 차트 데이터 업데이트
    document.getElementById('linePeriod').addEventListener('change', function () {
        const period = this.value;
        lineChart.data.labels = chartData.line[period].labels;
        lineChart.data.datasets[0].data = chartData.line[period].defectData;
        lineChart.data.datasets[1].data = chartData.line[period].normalData;
        lineChart.update();
    });
}

// 시간대별 불량 및 정상 추이 차트
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
                    fill: true
                },
                {
                    label: '정상 건수',
                    data: chartData.trend[3].normalData,
                    borderColor: '#2ecc71',
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });

    // 시간대별 차트 데이터 업데이트
    document.getElementById('timePeriod').addEventListener('change', function () {
        const period = parseInt(this.value);
        trendChart.data.labels = chartData.trend[period].labels;
        trendChart.data.datasets[0].data = chartData.trend[period].defectData;
        trendChart.data.datasets[1].data = chartData.trend[period].normalData;
        trendChart.update();
    });
}

// 상세 페이지 이동 함수
function goToDetailPage(date, line, score, status) {
    window.location.href = `/detail-analysis?date=${date}&line=${line}&score=${score}&status=${status}`;
}

// 로그 새로고침 함수
function refreshLogs() {
    const logBody = document.getElementById('logBody');
    logBody.innerHTML = ''; // 초기화

    // DB에서 데이터 가져오기
    fetch('/api/detail_data')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Fetched log data:", data); // 데이터 확인용 로그
            if (!data || data.length === 0) {
                logBody.innerHTML = '<tr><td colspan="5">불량 데이터가 없습니다.</td></tr>';
                return;
            }

            data.forEach(item => {
                const row = document.createElement('tr');
                row.className = 'log-item';
                const date = new Date(item.logDate).toLocaleDateString('ko-KR');
                const line = item.lineIdx;
                const status = item.status;
                const score = item.faultyScore;
                row.onclick = () => goToDetailPage(date, line, score, status);
                row.innerHTML = `
                    <td>${date}</td>
                    <td>라인 ${line}</td>
                    <td class="${status === '불량(심각)' ? 'severity-high' : 'severity-medium'}">${score}점</td>
                    <td class="${status === '불량(심각)' ? 'severity-high' : 'severity-medium'}">${status}</td>
                `;
                logBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error("Error fetching logs:", error);
            logBody.innerHTML = '<tr><td colspan="5">로그 로드에 실패했습니다.</td></tr>';
        });
}

// 페이지 로드 시 로그 새로고침
refreshLogs();



