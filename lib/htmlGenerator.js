import fs from 'fs';
import path from 'path';

/**
 * ASCII 테이블 텍스트를 HTML 테이블로 변환합니다.
 * @param {string} rawText 원본 ASCII 테이블 텍스트
 * @returns {string} HTML 테이블 문자열
 */
function parseTableText(rawText) {
    const lines = rawText
        .split('\n')
        .filter(line => !/^[\s│├┤┬┴┼┌┐└┘─]+$/.test(line)); // 선 제거

    if (lines.length < 3) return '<p>No table content found.</p>';

    const titleLine = lines[0].trim();
    const generatedLine = lines[1].trim();
    
    const tableDataLines = lines.slice(2);

    // 총점 배열 생성
    const totalScores = tableDataLines
      .map(line => {
        const cols = line.trim().split('│').map(col => col.trim()).filter(col => col.length > 0);
        const score = parseFloat(cols[7]); // '총점' 열
        return isNaN(score) ? null : score;
      })
  .filter(score => score !== null);
    
    // 평균, 최저점, 최고점 계산
    const averageScore = totalScores.length > 0
      ? (totalScores.reduce((sum, val) => sum + val, 0) / totalScores.length).toFixed(2)
      : 'N/A';
    const minScore = totalScores.length > 0 ? Math.min(...totalScores) : 'N/A';
    const maxScore = totalScores.length > 0 ? Math.max(...totalScores) : 'N/A';

    // 점수만 반복되는 라인을 제거
    const filteredTableLines = tableDataLines.filter(line => {
    // '점수'만 포함된 열인지 확인 (공백, 선 등 고려)
    const cols = line.split('│').map(col => col.trim()).filter(col => col.length > 0);
    return !(cols.length > 0 && cols.every(col => col === '점수'));
});

    const tableRows = filteredTableLines.map(line => {
        const cols = line.trim().split('│')
            .map(col => col.trim())
            .filter(col => col.length > 0);
        return `<tr>${cols.map(col => `<td>${col}</td>`).join('')}</tr>`;
    });

    // 열 개수 계산 (표시용 colspan)
    const colCount = tableRows[0]?.match(/<td>/g)?.length || 10;

    return `
    <table border="1" style="border-collapse: collapse; margin: auto; text-align: center;">
      <tr><td colspan="${colCount}">평균 점수: ${averageScore}</td></tr>
      <tr><td colspan="${colCount}">최저 점수: ${minScore}</td></tr>
      <tr><td colspan="${colCount}">최고 점수: ${maxScore}</td></tr>
      <tr><td colspan="${colCount}" style="font-weight: bold;">${titleLine}</td></tr>
      <tr><td colspan="${colCount}">${generatedLine}</td></tr>
      ${tableRows.join('\n')}
    </table>
    `;
}

/**
 * HTML 콘텐츠를 비동기로 생성합니다.
 * @param {string[]} repositories 원래의 인자 배열 (커맨드라인 전체 인자 포함)
 * @param {string} resultsDir 결과 디렉토리 경로
 * @returns {Promise<string>} HTML 문자열
 */
export async function generateHTML(repositories, resultsDir) {
    const validRepos = repositories.filter(repo => /^[^/\s]+\/[^/\s]+$/.test(repo));
    // 저장소가 2개 이상일 경우에만 total 포함
    const tabs = repositories.length > 1
      ? ['total', ...validRepos]
      : validRepos;

    const tabContents = await Promise.all(tabs.map(async (tab) => {
        const repoName = tab === 'total' ? 'total' : tab.split('/')[1];
        const pngPath =  path.join(repoName, `${repoName}_chart.png`);
        const txtPath = path.join(resultsDir, repoName, `${repoName}.txt`);
        const dataCsvPath = path.join(repoName, `${repoName}_data.csv`);
        const dataTxtPath = path.join(repoName, `${repoName}.txt`);

        let txtContent;
        try {
            await fs.promises.access(txtPath, fs.constants.R_OK);
            txtContent = await fs.promises.readFile(txtPath, 'utf-8');
        } catch (error) {
            txtContent = 'No text report available.';
        }
        
        const tableHtml = parseTableText(txtContent);
        
        return `
    <div id="${tab}" class="tabcontent">
      <div style="display: flex; justify-content: space-between; align-items: center;">
          <h1 style="margin: 0;">${repoName}</h1>
          <div>
            <a class="download-button" href="${dataCsvPath}" download="${repoName}_data.csv">Download Data CSV</a>
            <a class="download-button" href="${dataTxtPath}" download="${repoName}.txt">Download Data TXT</a>
          </div>
      </div>
      <div style="display: flex; gap: 20px; align-items: flex-start; margin-top: 20px;">
         <div>
            <img src="${pngPath}" alt="${repoName} Chart" width="800">
         </div>
         <div>
            ${tableHtml}
         </div>
      </div>
    </div>
        `;
    }));

    let html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>RepoScore Results</title>
  <style>
    body { font-family: sans-serif; }
    .tab { overflow: hidden; border: 1px solid #ccc; background-color: #f1f1f1; }
    .tab button { background-color: inherit; float: left; border: none; outline: none; cursor: pointer; padding: 14px 16px; transition: 0.3s; }
    .tab button:hover { background-color: #ddd; }
    .tabcontent { display: none; padding: 6px 12px; border: 1px solid #ccc; border-top: none; }
    table { 
      font-family: monospace; 
      text-align: left; 
      overflow-x: auto;
      margin: auto;
      border-collapse: collapse;
    }
    table, td, th { border: 1px solid black; padding: 4px; }
    .download-button {
      background-color: #4CAF50; /* 초록색 배경 */
      color: white;
      padding: 10px 20px;
      text-align: center;
      text-decoration: none;
      display: inline-block;
      font-size: 14px;
      margin: 4px 2px;
      cursor: pointer;
      border-radius: 4px;
      border: none;
    }
  </style>
</head>
<body>
  <h1>RepoScore Results</h1>
  <div class="tab">
    ${tabs.map(tab => `<button class="tablinks" onclick="openTab(event, '${tab}')">${tab}</button>`).join('')}
  </div>
  ${tabContents.join('')}
  <script>
    function openTab(evt, tabName) {
      var tabcontent = document.getElementsByClassName("tabcontent");
      for (var i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
      }
      var tablinks = document.getElementsByClassName("tablinks");
      for (var i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
      }
      document.getElementById(tabName).style.display = "block";
      evt.currentTarget.className += " active";
    }
    document.getElementsByClassName("tablinks")[0].click();
  </script>
</body>
</html>
`;
    return html;
}