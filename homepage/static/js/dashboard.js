document.addEventListener('DOMContentLoaded', function () {
    // 데이터 로드
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
                document.getElementById('defect-details').innerHTML = '<p>불량 데이터가 없습니다.</p>';
                document.getElementById('log-table').innerHTML = '<tr><td colspan="4">불량 데이터가 없습니다.</td></tr>';
                return;
            }
  
            // 첫 번째 데이터로 요약 정보 채우기
            const firstItem = data[0];
            document.getElementById('detail-date').textContent = new Date(firstItem.logDate).toLocaleString('ko-KR');
            document.getElementById('detail-line').textContent = `라인 ${firstItem.lineIdx}`;
            document.getElementById('detail-score').textContent = `${firstItem.faultyScore}/100`;
            document.getElementById('detail-level').textContent = firstItem.status;
            document.getElementById('detail-level').className = firstItem.status === "불량(심각)" ? "text-red-500" : "text-yellow-500";
            document.getElementById('main-defect-image').src = firstItem.faultyImage ? `data:image/jpeg;base64,${firstItem.faultyImage}` : 'https://via.placeholder.com/400x400?text=No+Image';
  
            // 불량 이미지 목록 채우기
            const defectImages = document.getElementById('defect-images');
            data.forEach((item, index) => {
                if (item.faultyImage) {
                    const imageItem = document.createElement('div');
                    imageItem.className = 'cursor-pointer hover:opacity-80 image-item';
                    imageItem.dataset.index = index;
                    imageItem.innerHTML = `
                        <img src="data:image/jpeg;base64,${item.faultyImage}" alt="불량 이미지 ${index + 1}" class="w-full h-48 object-cover rounded-lg shadow-sm"/>
                        <div class="info-box">
                            <p class="text-sm text-gray-700">생산라인: 라인 ${item.lineIdx}</p>
                            <p class="text-sm text-gray-700">점수: ${item.faultyScore}</p>
                            <p class="text-sm ${item.status === '불량(심각)' ? 'text-red-500' : 'text-yellow-500'}">상태: ${item.status}</p>
                        </div>
                    `;
                    imageItem.addEventListener('click', function() {
                        document.getElementById('main-defect-image').src = `data:image/jpeg;base64,${item.faultyImage}`;
                        document.getElementById('detail-date').textContent = new Date(item.logDate).toLocaleString('ko-KR');
                        document.getElementById('detail-line').textContent = `라인 ${item.lineIdx}`;
                        document.getElementById('detail-score').textContent = `${item.faultyScore}/100`;
                        document.getElementById('detail-level').textContent = item.status;
                        document.getElementById('detail-level').className = item.status === '불량(심각)' ? 'text-red-500' : 'text-yellow-500';
                    });
                    defectImages.appendChild(imageItem);
                }
            });
  
            // 금일 로그 채우기
            const logTable = document.getElementById('log-table');
            data.forEach(item => {
                const logRow = document.createElement('tr');
                logRow.className = 'log-item';
  
                // 상태 매핑
                let displayStatus = item.status;
                if (displayStatus.includes('불량사항')) {
                    displayStatus = '불량(심각)';
                }
  
                logRow.dataset.status = displayStatus === '불량(심각)' || displayStatus === '불량(주의)' ? '불량' : '정상';
  
                // 날짜 파싱 시도
                let formattedDate = '-';
                try {
                    const date = new Date(item.logDate);
                    if (!isNaN(date.getTime())) {
                        formattedDate = date.toLocaleString('ko-KR');
                    } else {
                        console.warn(`Invalid date format for logDate: ${item.logDate}`);
                        formattedDate = item.logDate; // 날짜 파싱 실패 시 원본 값 표시
                    }
                } catch (e) {
                    console.error(`Error parsing date for logDate: ${item.logDate}`, e);
                    formattedDate = item.logDate; // 에러 발생 시 원본 값 표시
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
  
            prefillCapaForm();
        })
        .catch(error => {
            console.error('데이터 로드 실패:', error);
            document.getElementById('defect-details').innerHTML = '<p>데이터 로드에 실패했습니다.</p>';
            document.getElementById('log-table').innerHTML = '<tr><td colspan="4">데이터 로드에 실패했습니다.</td></tr>';
        });
  
    // 탭 메뉴 동작
    const allTab = document.getElementById('all-tab');
    const defectTab = document.getElementById('defect-tab');
    const normalTab = document.getElementById('normal-tab');
  
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
  
        [allTab, defectTab, normalTab].forEach(tab => {
            tab.classList.remove('bg-blue-100', 'border-blue-500', 'text-blue-700');
            tab.classList.add('text-gray-700', 'border-gray-300');
        });
        event.target.classList.remove('text-gray-700', 'border-gray-300');
        event.target.classList.add('bg-blue-100', 'border-blue-500', 'text-blue-700');
    }
  
    allTab.addEventListener('click', (e) => handleTabClick(e, 'all'));
    defectTab.addEventListener('click', (e) => handleTabClick(e, 'defect'));
    normalTab.addEventListener('click', (e) => handleTabClick(e, 'normal'));
  
    // 초기 상태 설정
    handleTabClick({ target: allTab }, 'all');
  });
  
  // 보고서 다운로드 (JSPDF 사용)
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
  
  // CAPA 폼 미리 채우기
  function prefillCapaForm() {
      const form = document.getElementById('capa-form');
      form.querySelector('input[name="capa-date"]').value = document.getElementById('detail-date').textContent.split(' ')[0];
      form.querySelector('textarea[name="capa-action"]').value = `라인 ${document.getElementById('detail-line').textContent} 점검\n불량 점수: ${document.getElementById('detail-score').textContent}`;
  }