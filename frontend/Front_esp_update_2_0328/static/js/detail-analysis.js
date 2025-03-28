document.addEventListener('DOMContentLoaded', function () {
    const defectData = window.defectData || [];
  
    let currentIndex = 0;
  
    // 상세 정보 업데이트 함수
    function updateDefectDetails(index) {
      const data = defectData[index];
      document.getElementById('main-defect-image').src = data.img;
      document.getElementById('detail-date').textContent = data.date;
      document.getElementById('detail-line').textContent = data.line;
      document.getElementById('detail-score').textContent = `${data.score}/100`;
      document.getElementById('detail-level').textContent = data.level;
      document.getElementById('detail-level').className = data.level === "심각" ? "text-red-500" : "text-yellow-500";
      currentIndex = index;
    }
  
    // 이미지 클릭 이벤트 등록
    document.querySelectorAll('#defect-images > div').forEach((item, index) => {
      item.addEventListener('click', () => {
        updateDefectDetails(index);
      });
    });
  
    // 이전 버튼 이벤트
    document.getElementById('prev-btn').addEventListener('click', () => {
      if (currentIndex > 0) {
        updateDefectDetails(currentIndex - 1);
      }
    });
  
    // 다음 버튼 이벤트
    document.getElementById('next-btn').addEventListener('click', () => {
      if (currentIndex < defectData.length - 1) {
        updateDefectDetails(currentIndex + 1);
      }
    });
  
    // range input과 number input 동기화 함수
    function syncRangeWithNumber(rangeId, numberId) {
      const range = document.querySelector(rangeId);
      const number = document.querySelector(numberId);
      if (range && number) {
        range.addEventListener('input', function (e) {
          number.value = e.target.value;
        });
        number.addEventListener('input', function (e) {
          range.value = e.target.value;
        });
      }
    }
  
    syncRangeWithNumber('#id-108', '#sensitivity-number');
    syncRangeWithNumber('#id-113', '#false-detection-number');
  
    // ECharts 바 차트 초기화 및 반응형 처리
    const lineChartDom = document.getElementById('lineChart');
    if (lineChartDom) {
      const lineChart = echarts.init(lineChartDom);
      lineChart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: ['불량률'] },
        xAxis: { type: 'category', data: ['라인 A', '라인 B', '라인 C'] },
        yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
        series: [{
          name: '불량률',
          type: 'bar',
          data: [2.5, 1.9, 2.2],
          itemStyle: { color: '#e74c3c', borderRadius: [10, 10, 0, 0] }
        }]
      });
  
      window.addEventListener('resize', () => {
        lineChart.resize();
      });
    }
  
    // 알림 모달 열기/닫기
    window.openNotificationModal = function () {
      document.getElementById('notificationModal').classList.remove('hidden');
    }
  
    window.closeNotificationModal = function () {
      document.getElementById('notificationModal').classList.add('hidden');
    }
  });
  