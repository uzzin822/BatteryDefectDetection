
    const lineChart = echarts.init(document.getElementById('lineChart'));
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

    const barChart = echarts.init(document.getElementById('barChart'));
    barChart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: ['2/9', '2/10', '2/11', '2/12', '2/13', '2/14', '2/15'] },
        yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
        series: [{
            data: [2.1, 2.4, 1.8, 2.8, 2.3, 2.9, 2.5],
            type: 'bar',
            barWidth: '40%',
            itemStyle: { color: '#3498db', borderRadius: [10, 10, 0, 0] }
        }]
    });

    window.addEventListener('resize', function() {
        lineChart.resize();
        barChart.resize();
    });

    function openNotificationModal() {
        document.getElementById('notificationModal').classList.remove('hidden');
    }

    function closeNotificationModal() {
        document.getElementById('notificationModal').classList.add('hidden');
    }