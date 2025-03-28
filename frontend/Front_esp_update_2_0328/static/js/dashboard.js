// 차트 데이터
const chartData = {
    line: {
        day: { labels: ['라인 A', '라인 B', '라인 C'], data: [2.1, 1.8, 2.5] },
        week: { labels: ['라인 A', '라인 B', '라인 C'], data: [15.3, 12.7, 14.9] },
        month: { labels: ['라인 A', '라인 B', '라인 C'], data: [20.5, 18.2, 22.1] }
    },
    trend: {
        3: { labels: ['0시', '1시', '2시', '3시'], data: [12, 14, 16, 18] },
        6: { labels: ['0시', '1시', '2시', '3시', '4시', '5시', '6시'], data: [10, 13, 17, 20, 18, 14, 12] },
        12: { labels: ['0시', '1시', '2시', '3시', '4시', '5시', '6시', '7시', '8시', '9시', '10시', '11시', '12시'], data: [8, 12, 14, 11, 13, 9, 7, 6, 8, 12, 11, 14, 10] },
        24: { labels: ['0시', '2시', '4시', '6시', '8시', '10시', '12시', '14시', '16시', '18시', '20시', '22시', '24시'], data: [3, 5, 6, 4, 5, 8, 12, 11, 13, 10, 9, 7, 5] }
    }
};

// 생산라인별 불량률 차트
const lineCtx = document.getElementById('lineChart').getContext('2d');
const lineChart = new Chart(lineCtx, {
    type: 'bar',
    data: {
        labels: chartData.line.day.labels,
        datasets: [{
            label: '불량률 (%)',
            data: chartData.line.day.data,
            backgroundColor: ['#e74c3c', '#3498db', '#f1c40f'],
            borderColor: ['#e74c3c', '#3498db', '#f1c40f'],
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        scales: { y: { beginAtZero: true } }
    }
});

// 시간대별 불량 추이 차트
const trendCtx = document.getElementById('trendChart').getContext('2d');
const trendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
        labels: chartData.trend[3].labels,
        datasets: [{
            label: '불량 건수',
            data: chartData.trend[3].data,
            borderColor: '#2ecc71',
            fill: true
        }]
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
    lineChart.data.datasets[0].data = chartData.line[period].data;
    lineChart.update();
});

// 시간대별 차트 데이터 업데이트
document.getElementById('timePeriod').addEventListener('change', function () {
    const period = parseInt(this.value);
    trendChart.data.labels = chartData.trend[period].labels;
    trendChart.data.datasets[0].data = chartData.trend[period].data;
    trendChart.update();
});

// 상세 페이지 이동 함수
function goToDetailPage(type, date, scoreSeverity) {
    window.location.href = `{{ url_for('detail_analysis') }}?type=${type}&date=${date}&scoreSeverity=${scoreSeverity}`;
}

// 새로고침 함수
function refreshLogs() {
    const newLog = ``;
}

// 이미지 업데이트 함수
function updateImage() {
    fetch('/api/get-latest-image')
        .then(response => response.json())
        .then(data => {
            if (data.image_path) {
                document.getElementById("camera1").src = data.image_path + "?t=" + new Date().getTime();
            }
        })
        .catch(error => console.error("Error fetching latest image:", error));
}

// 1초마다 이미지 업데이트 실행
setInterval(updateImage, 1000);

// 페이지 로드 시 즉시 이미지 업데이트 실행
updateImage();