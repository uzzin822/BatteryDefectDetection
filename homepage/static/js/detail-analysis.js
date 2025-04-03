// const IMAGES_PER_PAGE = 12; // 한 페이지당 이미지 개수
// const LOGS_PER_PAGE = 10; // 한 페이지당 로그 개수
// let imageCurrentPage = 1;
// let logCurrentPage = 1;
// let logData = [];

// document.addEventListener('DOMContentLoaded', function () {
//     const defectDetails = document.getElementById('defect-details');
//     const logTable = document.getElementById('log-table');
//     const defectImages = document.getElementById('defect-images');

//     if (!defectDetails || !logTable || !defectImages) {
//         console.error('필요한 DOM 요소가 로드되지 않았습니다.');
//         return;
//     }

//     // API에서 불량 및 정상 데이터 가져오기
//     fetch('/api/detail_data')
//         .then(response => response.json())
//         .then(data => {
//             console.log("Fetched data:", data);

//             if (!data || data.length === 0) {
//                 defectDetails.innerHTML = '<p>불량 데이터가 없습니다.</p>';
//                 logTable.innerHTML = '<tr><td colspan="4">불량 데이터가 없습니다.</td></tr>';
//                 defectImages.innerHTML = '';
//                 return;
//             }

//             // 불량 및 정상 데이터 병합
//             logData = data.map((item, index) => ({
//                 faultyIdx: item.faultyIdx || (index + 1),
//                 lineIdx: item.lineIdx,
//                 faultScore: item.faultScore || null,
//                 visualImage: item.visualImage || null,
//                 status: item.status || '정상',
//                 logDate: item.logDate
//             }));

//             // 첫 번째 표시할 데이터 선택 (불량 데이터 우선)
//             const firstItem = logData.find(item => item.status !== '정상') || logData[0];

//             document.getElementById('detail-date').textContent = new Date(firstItem.logDate).toLocaleString('ko-KR');
//             document.getElementById('detail-line').textContent = `라인 ${firstItem.lineIdx}`;
//             document.getElementById('detail-score').textContent = firstItem.faultScore ? `${firstItem.faultScore}/100` : '-';
//             document.getElementById('detail-level').textContent = firstItem.status;
//             document.getElementById('detail-level').className = firstItem.status.includes('불량') ? "text-red-500" : "text-green-500";
//             document.getElementById('main-defect-image').src = firstItem.visualImage 
//                 ? `/static/visual_images/${firstItem.visualImage.split('/').pop()}`
//                 : 'https://via.placeholder.com/400x400?text=No+Image';

//             // 불량 이미지 목록 및 로그 테이블 채우기
//             populateDefectImages();
//             populateLogTable();

//             // 탭 메뉴 설정
//             document.getElementById('all-tab').addEventListener('click', (e) => handleTabClick(e, 'all'));
//             document.getElementById('defect-tab').addEventListener('click', (e) => handleTabClick(e, 'defect'));
//             document.getElementById('normal-tab').addEventListener('click', (e) => handleTabClick(e, 'normal'));

//             // 초기 탭 설정
//             handleTabClick({ target: document.getElementById('all-tab') }, 'all');
//         })
//         .catch(error => {
//             console.error('데이터 로드 실패:', error);
//         });
// });

// // 로그 테이블 필터링 함수
// function handleTabClick(event, status) {
//     const logItems = document.querySelectorAll('.log-item');
//     logItems.forEach(item => {
//         const itemStatus = item.dataset.status;
//         if (status === 'all' || 
//            (status === 'defect' && itemStatus.includes('불량')) || 
//            (status === 'normal' && itemStatus === '정상')) {
//             item.style.display = '';
//         } else {
//             item.style.display = 'none';
//         }
//     });

//     ['all-tab', 'defect-tab', 'normal-tab'].forEach(tabId => {
//         const tab = document.getElementById(tabId);
//         tab.classList.remove('bg-blue-100', 'border-blue-500', 'text-blue-700');
//         tab.classList.add('text-gray-700', 'border-gray-300');
//     });
//     event.target.classList.add('bg-blue-100', 'border-blue-500', 'text-blue-700');
// }

// // 로그 테이블 생성
// function populateLogTable() {
//     const logTable = document.getElementById('log-table');
//     logTable.innerHTML = '';
//     const start = (logCurrentPage - 1) * LOGS_PER_PAGE;
//     const end = start + LOGS_PER_PAGE;
//     const paginatedData = logData.slice(start, end);

//     paginatedData.forEach(item => {
//         const logRow = document.createElement('tr');
//         logRow.className = 'log-item';
//         logRow.dataset.status = item.status;

//         logRow.innerHTML = `
//             <td>${new Date(item.logDate).toLocaleString('ko-KR')}</td>
//             <td>#${item.faultyIdx}</td>
//             <td>라인 ${item.lineIdx}</td>
//             <td>
//                 <span class="${item.status.includes('불량') ? 'text-red-500' : 'text-green-500'}">
//                     ${item.status}
//                 </span>
//             </td>
//         `;
//         logTable.appendChild(logRow);
//     });

//     updateLogPaginationButtons();
// }

// // 로그 페이지네이션 버튼 업데이트
// function updateLogPaginationButtons() {
//     document.getElementById('log-prev-btn').disabled = logCurrentPage === 1;
//     document.getElementById('log-next-btn').disabled = logCurrentPage * LOGS_PER_PAGE >= logData.length;
// }

// // 로그 페이지네이션 변경
// function changeLogPage(delta) {
//     logCurrentPage += delta;
//     if (logCurrentPage < 1) logCurrentPage = 1;
//     if (logCurrentPage > Math.ceil(logData.length / LOGS_PER_PAGE)) logCurrentPage = Math.ceil(logData.length / LOGS_PER_PAGE);
//     populateLogTable();
// }

// // 불량 이미지 목록 생성
// function populateDefectImages() {
//     const defectImages = document.getElementById('defect-images');
//     defectImages.innerHTML = '';
//     const start = (imageCurrentPage - 1) * IMAGES_PER_PAGE;
//     const end = start + IMAGES_PER_PAGE;
//     const paginatedData = logData.slice(start, end);

//     paginatedData.forEach((item, index) => {
//         if (item.visualImage) {
//             const imageItem = document.createElement('div');
//             imageItem.className = 'cursor-pointer hover:opacity-80 image-item';
//             imageItem.innerHTML = `
//                 <img src="/static/visual_images/${item.visualImage.split('/').pop()}" class="w-full h-48 object-cover rounded-lg shadow-sm"/>
//                 <p>라인 ${item.lineIdx} - 점수: ${item.faultScore || '-'}</p>
//             `;
//             defectImages.appendChild(imageItem);
//         }
//     });

//     updateImagePaginationButtons();
// }

// // 이미지 페이지네이션 업데이트
// function updateImagePaginationButtons() {
//     document.getElementById('image-prev-btn').disabled = imageCurrentPage === 1;
//     document.getElementById('image-next-btn').disabled = imageCurrentPage * IMAGES_PER_PAGE >= logData.length;
// }
