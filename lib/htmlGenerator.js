import fs from 'fs/promises';
import path from 'path';

// 특수문자 라인 거르기 + 컬럼 정리
function parseTableText(rawText) {
    const rows = rawText
        .split('\n')
        .filter(line => !/^[\s│├┤┬┴┼┌┐└┘─]+$/.test(line)) // 선긋기 문자는 제거
        .map(line => {
            // 양옆 공백 제거하고, '│' 기준으로 분리
            const cols = line.trim().split('│')
                .map(col => col.trim())
                .filter(col => col.length > 0); // 빈 컬럼 제거

            return `<tr>${cols.map(col => `<td>${col}</td>`).join('')}</tr>`;
        });

    return `<table border="1">${rows.join('\n')}</table>`;
}

export async function generateReportHtml(repoName, outputDir = '.') {
    const tablePath = path.join(outputDir, `${repoName}.txt`);
    const chartPath = `${repoName}_chart.png`;
    const csvPath = `${repoName}_score.csv`;
    const reportPath = path.join(outputDir, 'report.html');

    let tableHtml;
    try {
        const tableText = await fs.readFile(tablePath, 'utf-8');
        tableHtml = parseTableText(tableText);
    } catch {
        tableHtml = '<p><i>표 파일이 없습니다.</i></p>';
    }

    const chartHtml = `<img src="${chartPath}" alt="Chart" style="max-width:100%; border:1px solid #ccc;">`;
    const csvHtml = `<a href="${csvPath}" download>CSV 파일 다운로드</a>`;

    const finalHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>${repoName} 기여도 보고서</title>
    <style>
        body { font-family: sans-serif; padding: 2rem; line-height: 1.6; }
        h1 { font-size: 2rem; }
        h2 { margin-top: 2rem; }
        table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
        td, th { border: 1px solid #aaa; padding: 8px; text-align: center; }
        tr:nth-child(even) { background-color: #f9f9f9; }
    </style>
</head>
<body>
    <h1>${repoName} 기여도 분석 보고서</h1>

    <section>
        <h2>1. 차트</h2>
        ${chartHtml}
    </section>

    <section>
        <h2>2. 점수 테이블</h2>
        ${tableHtml}
    </section>

    <section>
        <h2>3. CSV 다운로드</h2>
        ${csvHtml}
    </section>
</body>
</html>
`;

    await fs.writeFile(reportPath, finalHtml, 'utf-8');
    console.log(`✅ 통합 HTML 보고서가 생성되었습니다: ${reportPath}`);
}