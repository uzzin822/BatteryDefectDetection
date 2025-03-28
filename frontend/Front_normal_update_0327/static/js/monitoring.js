document.addEventListener('DOMContentLoaded', function() {
    // 날짜/시간 업데이트 함수
    function updateDateTime() {
        const now = new Date();
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeek = days[now.getDay()];
        
        let hours = now.getHours();
        const ampm = hours >= 12 ? '오후' : '오전';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0시를 12시로 변환
        
        const dateTimeStr = now.getFullYear() + '. ' + 
            String(now.getMonth() + 1).padStart(2, '0') + '. ' + 
            String(now.getDate()).padStart(2, '0') + ' (' + dayOfWeek + ') ' + 
            ampm + ' ' + 
            String(hours).padStart(2, '0') + ': ' + 
            String(now.getMinutes()).padStart(2, '0');
        
        document.getElementById('currentDateTime').textContent = dateTimeStr;
    }

    // 초기 실행 및 1초마다 업데이트
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // 전체화면 기능
    const toggleFullScreen = (element) => {
        if (!document.fullscreenElement) {
            element.requestFullscreen().catch(err => {
                console.log('전체화면 전환 중 오류 발생:', err);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // 카메라 피드 전체화면 버튼 이벤트
    document.querySelectorAll('.camera-feed').forEach(feed => {
        const fullscreenBtn = feed.querySelector('.camera-control-btn[title="전체화면"]');
        fullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFullScreen(feed);
        });
    });

    // 컨트롤 버튼 활성화 토글
    document.querySelectorAll('.monitoring-controls .control-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.monitoring-controls .control-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // 호버 효과 개선
    document.querySelectorAll('.camera-feed').forEach(feed => {
        feed.addEventListener('mouseenter', () => {
            feed.querySelector('.camera-controls').style.opacity = '1';
        });
        feed.addEventListener('mouseleave', () => {
            feed.querySelector('.camera-controls').style.opacity = '0.8';
        });
    });

    // 카메라 피드 새로고침 함수
    window.reloadCameraFeeds = function() {
        document.querySelectorAll('video').forEach(video => {
            const currentTime = video.currentTime;
            video.src = video.src;
            video.load();
            video.currentTime = currentTime;
            video.play();
        });
    };

    // 자동 새로고침 (5분마다)
    setInterval(reloadCameraFeeds, 300000);
});