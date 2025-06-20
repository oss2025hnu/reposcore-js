import fs from 'fs';
import path from 'path';
import Chart from 'chart.js/auto';
import { createCanvas } from 'canvas';

/**
 * ASCII 테이블 텍스트를 HTML 테이블로 변환합니다.
 */
function parseTableText(rawText) {
  const lines = rawText
    .split('\n')
    .filter(line => !/^[\s\u2500-\u257F]+$/.test(line));

  if (lines.length < 3) return '<p>No table content found.</p>';

  const titleLine = lines[0].trim();
  const generatedLine = lines[1].trim();
  const tableDataLines = lines.slice(2);
  tableDataLines.splice(0, 4);
  tableDataLines.splice(1, 1);

  const totalScores = tableDataLines
    .map(line => {
      const cols = line.trim().split('│').map(col => col.trim()).filter(col => col.length > 0);
      const score = parseFloat(cols[7]);
      return isNaN(score) ? null : score;
    })
    .filter(score => score !== null);

  const averageScore = totalScores.length > 0 ? (totalScores.reduce((sum, val) => sum + val, 0) / totalScores.length).toFixed(2) : 'N/A';
  const minScore = totalScores.length > 0 ? Math.min(...totalScores) : 'N/A';
  const maxScore = totalScores.length > 0 ? Math.max(...totalScores) : 'N/A';

  const tableRows = tableDataLines.map(line => {
    const cols = line.trim().split('│').map(col => col.trim()).filter(col => col.length > 0);
    cols[7] = `<b>${cols[7]}</b>`;
    return `<tr>${cols.map(col => `<td>${col}</td>`).join('')}</tr>`;
  });

  const colCount = tableRows[0]?.match(/<td>/g)?.length || 10;

  return `
    <table border="1" style="border-collapse: collapse; margin: auto; text-align: center;">
      <tr><td colspan="${colCount}">평균 점수: ${averageScore}</td></tr>
      <tr><td colspan="${colCount}">최저 점수: ${minScore}</td></tr>
      <tr><td colspan="${colCount}">최고 점수: ${maxScore}</td></tr>
      <tr><td colspan="${colCount}" style="font-weight: bold;">${titleLine}</td></tr>
      <tr><td colspan="${colCount}">${generatedLine}</td></tr>
      ${tableRows.join('\n')}
    </table>`;
}

/**
 * 저장소 점수 비율 그래프를 생성합니다.
 */
async function generateRepositoryScoreChart(repoScoreMap, outputPath) {
  const labels = Object.keys(repoScoreMap);
  const data = Object.values(repoScoreMap);
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'Repository Score Ratio',
        data,
        backgroundColor: [
          '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
          '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
        ]
      }]
    },
    options: {
      plugins: {
        legend: {
          position: 'right'
        },
        title: {
          display: true,
          text: '점수 기준 저장소 비율'
        }
      }
    }
  });

  const buffer = canvas.toBuffer('image/png');
  await fs.promises.writeFile(outputPath, buffer);
}

/**
 * HTML 콘텐츠 생성 함수
 */
export async function generateHTML(repositories, resultsDir) {
  const validRepos = repositories.filter(repo => /^[^/\s]+\/[^/\s]+$/.test(repo));
  const tabs = validRepos.length > 1 ? ['total', ...validRepos] : validRepos;

  const repoScoreMap = {}; // 저장소별 총점

  const tabContents = await Promise.all(tabs.map(async (tab) => {
    const repoName = tab === 'total' ? 'total' : tab.split('/')[1];
    const pngPath = path.join(repoName, `${repoName}_chart.png`);
    const txtPath = path.join(resultsDir, repoName, `${repoName}.txt`);
    const csvPath = path.join(repoName, `${repoName}_data.csv`);

    let txtContent;
    try {
      await fs.promises.access(txtPath);
      txtContent = await fs.promises.readFile(txtPath, 'utf-8');

      // 점수 추출 (total만 예외적으로 저장)
      const lines = txtContent.split('\n').slice(6);
      const totalScore = lines.map(line => parseFloat(line.split('│')[7]?.trim())).filter(score => !isNaN(score)).reduce((a, b) => a + b, 0);
      if (tab !== 'total') repoScoreMap[repoName] = totalScore;

    } catch {
      txtContent = 'No text report available.';
    }

    const tableHtml = parseTableText(txtContent);

    return `
      <div id="${tab}" class="tabcontent">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1 style="margin: 0;">${repoName}</h1>
            <div>
              <a class="download-button" href="${csvPath}" download>Download CSV</a>
              <a class="download-button" href="${txtPath}" download>Download TXT</a>
            </div>
        </div>
        <div style="display: flex; gap: 20px; align-items: flex-start; margin-top: 20px;">
          <img src="${pngPath}" width="800" />
          ${tableHtml}
        </div>
      </div>`;
  }));

  // 저장소 점수 비율 차트 생성
  if (Object.keys(repoScoreMap).length > 1) {
    const chartOutputPath = path.join(resultsDir, 'total', 'total_repository_chart.png');
    await generateRepositoryScoreChart(repoScoreMap, chartOutputPath);

    const totalChartHTML = `
      <div id="total-chart" class="tabcontent">
        <h2>저장소 별 점수 비율</h2>
        <img src="total/total_repository_chart.png" width="600" />
      </div>`;
    tabContents.unshift(totalChartHTML);
    tabs.unshift('total-chart');
  }

  const html = `
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
    table, td, th { border: 1px solid black; padding: 4px; border-collapse: collapse; }
    .download-button {
      background-color: #4CAF50;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      margin: 4px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>RepoScore 결과</h1>
  <div class="tab">
    ${tabs.map(tab => `<button class="tablinks" onclick="openTab(event, '${tab}')">${tab}</button>`).join('')}
  </div>
  ${tabContents.join('')}
  <script>
    function openTab(evt, tabName) {
      const tabcontent = document.getElementsByClassName("tabcontent");
      for (let i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";
      const tablinks = document.getElementsByClassName("tablinks");
      for (let i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");
      document.getElementById(tabName).style.display = "block";
      evt.currentTarget.className += " active";
    }
    document.getElementsByClassName("tablinks")[0].click();
  </script>
</body>
</html>`;

  return html;
}
