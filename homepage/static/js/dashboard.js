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
            12: {
                labels: ['0시', '1시', '2시', '3시', '4시', '5시', '6시', '7시', '8시', '9시', '10시', '11시', '12시'],
                defectData: [8, 12, 14, 11, 13, 9, 7, 6, 8, 12, 11, 14, 10],
                normalData: [280, 290, 300, 295, 310, 305, 300, 295, 290, 300, 310, 320, 315]
            },
            24: {
                labels: ['0시', '2시', '4시', '6시', '8시', '10시', '12시', '14시', '16시', '18시', '20시', '22시', '24시'],
                defectData: [3, 5, 6, 4, 5, 8, 12, 11, 13, 10, 9, 7, 5],
                normalData: [270, 280, 290, 285, 300, 310, 320, 315, 310, 305, 300, 295, 290]
            }
        }
    };

    // 생산라인별 불량률 및 정상률 차트
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    const lineChart = new Chart(lineCtx, {
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
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });

    // 시간대별 불량 및 정상 추이 차트
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    const trendChart = new Chart(trendCtx, {
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
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });

    // 라인 차트 데이터 업데이트
    document.getElementById('linePeriod').addEventListener('change', function () {
        const period = this.value;
        lineChart.data.labels = chartData.line[period].labels;
        lineChart.data.datasets[0].data = chartData.line[period].defectData;
        lineChart.data.datasets[1].data = chartData.line[period].normalData;
        lineChart.update();
    });

    // 시간대별 차트 데이터 업데이트
    document.getElementById('timePeriod').addEventListener('change', function () {
        const period = parseInt(this.value);
        trendChart.data.labels = chartData.trend[period].labels;
        trendChart.data.datasets[0].data = chartData.trend[period].defectData;
        trendChart.data.datasets[1].data = chartData.trend[period].normalData;
        trendChart.update();
    });


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
        logBody.innerHTML = ''; // 초기화

        // 서버에서 불량 로그 가져오기
        fetch('/api/defective_logs')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                today_fault.innerText = data.fault_total_items + '건'; // 불량 건수 업데이트
                if (data.fault_total_items === 0) {
                    today_fault.innerText = '0건'; // 불량 건수 0일 경우
                }

                if (!data.fault_logs || data.fault_logs.length === 0) {
                    logBody.innerHTML = '<tr><td colspan="5">금일 등록된 불량 데이터가 없습니다.</td></tr>';
                    return;
                }
                today_normal.innerText = data.normal_total_items + '건'; // 정상 건수 업데이트
                if (data.normal_total_items === 0) {
                    today_normal.innerText = '0건'; // 정상 건수 0일 경우
                }

                // 상위 10개만 표시 (서버에서 정렬된 상태로 반환된다고 가정)
                const latestData = data.fault_logs.slice(0, 10);

                latestData.forEach(item => {
                    const row = document.createElement('tr');
                    row.className = 'log-item';
                    const dateTime = item.logDate; // 서버에서 받은 문자열 그대로 사용
                    const faultyIdx = item.faultyIdx;
                    const line = item.linename;
                    const status = item.status;
                    const score = item.faultyScore;
                    const faultyImage = item.faultyImage;

                    row.onclick = () => goToDetailPage(faultyIdx, dateTime, line, score, status, faultyImage);
                    row.innerHTML = `
                    <td>${dateTime}</td>
                    <td>fault_${faultyIdx}</td>
                    <td>${line}</td>
                    <td>${score}점</td>
                    <td>
                        ${status === '불량(주의)' ? `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">불량(주의)</span>` : status === '불량(심각)' ? `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">불량(심각)</span>` : '알 수 없음'}
                    </td>
                `;
                    logBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error("Error fetching defective logs:", error);
                logBody.innerHTML = '<tr><td colspan="5">금일 불량 로그 로드에 실패했습니다.</td></tr>';
            });
    }




    // 웹소켓 연결 및 실시간 업데이트
    const socket = io();
    socket.on('new_image', function (data) {
        if (data.image_path) {
            document.getElementById("camera1").src = data.image_path;
        }
    });

    socket.on('new_alert', function (data) {
        if (data.message) {
            const logBody = document.getElementById('logBody');
            const row = document.createElement('tr');
            row.className = 'log-item';
            const dateTime = new Date().toLocaleString('ko-KR'); // 날짜와 시간 함께 표시
            const line = data.message.match(/라인 (\d+)/) ? data.message.match(/라인 (\d+)/)[1] : '알 수 없음';
            const status = data.message.includes('심각') ? '심각' : '주의';
            const score = data.fault_score || 'N/A';
            // row.onclick = () => goToDetailPage(dateTime, line, score, status);
            row.innerHTML = `
            <td>${dateTime}</td>
            <td>라인 ${line}</td>
            <td>${score}점</td>
            <td>
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                ${status === '정상' ? 'bg-green-100 text-green-800' :
                    status === '불량(주의)' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'}">
                    ${status}
                </span>
            </td>
        `;
            logBody.insertBefore(row, logBody.firstChild); // 최신 로그를 맨 위에 추가

            // 로그 최대 10개로 제한
            const logs = logBody.getElementsByTagName('tr');
            if (fault_logs.length > 10) {
                logBody.removeChild(fault_logs[fault_logs.length - 1]);
            }
        }
    });

    // 페이지 로드 시 초기화
    document.addEventListener('DOMContentLoaded', function () {
        refreshLogs();
    });

    // 웹소켓 연결 및 실시간 업데이트
document.addEventListener('DOMContentLoaded', function() {
    console.log('dashboard.html JavaScript 초기화 시작');

    try {
        // 핵심 기능: 웹소켓 연결
        const socket = io();

        // SocketIO 연결 상태 확인
        socket.on('connect', function() {
            console.log('SocketIO 연결 성공');
        });

        socket.on('connect_error', function(error) {
            console.error('SocketIO 연결 실패:', error);
        });

        socket.on('disconnect', function() {
            console.log('SocketIO 연결 끊김');
        });

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

        // 핵심 기능: 새로운 알림 수신 및 알림 패널에 추가
        socket.on('new_alert', function(data) {
            console.log('new_alert 이벤트 수신:', data);
            if (data.message) {
                const logBody = document.getElementById('logBody');
                const row = document.createElement('tr');
                row.className = 'log-item';
                const dateTime = new Date().toLocaleString('ko-KR'); // 날짜와 시간 함께 표시
                const line = data.message.match(/라인 (\d+)/) ? data.message.match(/라인 (\d+)/)[1] : '알 수 없음';
                const status = data.message.includes('심각') ? '심각' : '주의';
                const score = data.fault_score || 'N/A';
                // row.onclick = () => goToDetailPage(dateTime, line, score, status);
                row.innerHTML = `
                    <td>${dateTime}</td>
                    <td>라인 ${line}</td>
                    <td>${score}점</td>
                    <td>
                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${status === '정상' ? 'bg-green-100 text-green-800' : 
                          status === '불량(주의)' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}">
                            ${status}
                        </span>
                    </td>
                `;
                logBody.insertBefore(row, logBody.firstChild); // 최신 로그를 맨 위에 추가

                // 로그 최대 10개로 제한
                const logs = logBody.getElementsByTagName('tr');
                if (logs.length > 10) {
                    logBody.removeChild(logs[logs.length - 1]);
                }
            }
        });

        // 페이지 로드 시 초기화
        refreshLogs();
        console.log('dashboard.html JavaScript 초기화 완료');
    } catch (error) {
        console.error('JavaScript 실행 중 오류 발생:', error);
    }
});