const { Octokit } = require('@octokit/rest');
const Table = require('cli-table3');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const ChartDataLabels = require('chartjs-plugin-datalabels');
const fs = require('fs');
const path = require('path');
const { log } = require('./Utill');

const colorRanges = [
    [0, 0, 0],          // 0~9: 검은색
    [60, 60, 60],       // 10~19: 어두운 회색
    [120, 120, 120],    // 20~29: 중간 회색
    [180, 180, 180],    // 30~39: 밝은 회색
    [144, 238, 144],    // 40~49: 연두색
    [100, 200, 100],    // 50~59: 진한 연두
    [30, 144, 255],     // 60~69: 청색
    [65, 105, 225],     // 70~79: 진한 청색
    [138, 43, 226],     // 80~89: 보라색
    [186, 85, 211],     // 90~99: 연보라색
    [255, 0, 0],        // 100: 빨간색
];

const SCORE = {
    prFeature: 3,
    prDoc: 2,
    issueFeature: 2,
    issueDoc: 1
};

// 사용자 초기화 함수
function initParticipant(map, login) {
    if (!map.has(login)) {
        map.set(login, {
            pullRequests: { bugAndFeat: 0, doc: 0 },
            issues: { bugAndFeat: 0, doc: 0 }
        });
    }
}

class RepoAnalyzer {
    constructor(repoPath, token) {
        this.repoPaths = repoPath;
        this.token = token; // 자신의 github token
        this.participants = new Map();
        this.octokit = token ? new Octokit({auth: token}) : new Octokit(); // 토큰이 등록되었을 경우 인증, 안되었을 경우는 비인증 상태로 진행
    }

    async validateToken(){ // API 토큰 인증
        if(!this.token){
            log('등록된 토큰이 없어 비인증 상태로 진행합니다.');
            return;
        }
        log('토큰 인증을 진행합니다...')
        try{
            await this.octokit.rest.users.getAuthenticated();
            log('토큰이 인증에 성공했습니다.');
        }catch(error){
            if(error.status == 401){
                throw new Error('Github 토큰 인증에 실패하여 프로그램을 종료합니다, 유효한 토큰인지 확인해주세요.');
            }else{
                throw new Error(`Github 토큰 인증 중 오류가 발생했습니다. ${error.message}`);

            }
        }
    }

    async collectPRsAndIssues() {
        log('Collecting PRs and issues...');

        if (this.repoPaths.length >= 2)
            this.participants.set('total', new Map()); 

        let totalMap = this.participants.get('total', {});

        for (const repoPath of this.repoPaths){
            const [owner, repo] = repoPath.split('/') // 사용자, 저장소 이름 추출
            
            // PR, 이슈 통계 확인용 카운터
            let bugFeatPRcnt = 0, docPRcnt = 0;
            let bugFeatissueCnt = 0, docissueCnt = 0;

            this.participants.set(repo, new Map());
            let repoMap = this.participants.get(repo);
            let page = 1
            try{
                while(true){
                    const {data : response} = await this.octokit.rest.issues.listForRepo({ // 이슈(일반 이슈 + PR) 데이터를 요청.
                        owner, 
                        repo, 
                        state: 'all',
                        per_page: 100,
                        page
                    });
                    
                    
                    response.forEach(issue => {
                        initParticipant(repoMap, issue.user.login); // 사용자 초기화
                        if(this.repoPaths .length >= 2){
                            initParticipant(totalMap, issue.user.login);
                        }
        
                        if (issue.pull_request !== undefined){  // PR인 경우.
                            if (issue.pull_request.merged_at !== null) {  // PR이 병합되었는지 확인.
                                // 라벨에 따른 분류, 라벨은 문서, 기능, 버그 세 종류만 존재하며 한 이슈/PR에 하나의 라벨만 붙는다고 가정. 라벨이 없다면 개수를 추가하지 않음.
                                if (issue.labels.length != 0 && issue.labels[0].name == 'documentation'){  
                                    repoMap.get(issue.user.login).pullRequests.doc += 1;
                                    if (this.repoPaths.length >= 2) totalMap.get(issue.user.login).pullRequests.doc += 1
                                    docPRcnt++;
                                }
                                else if (issue.labels.length != 0){
                                    repoMap.get(issue.user.login).pullRequests.bugAndFeat += 1
                                    if (this.repoPaths.length >= 2) totalMap.get(issue.user.login).pullRequests.bugAndFeat += 1
                                    bugFeatPRcnt++;
                                }
                            }
                        }
                        else { // 이슈인 경우.
                            if ( // 반려된 이슈들을 제외시킴.
                                issue.state_reason == 'completed' ||  // 정상적으로 닫힌 이슈.
                                issue.state_reason == null ||         // 아직 열려있는 이슈는 null로 표시됨.
                                issue.state_reason == 'reopened'      // 닫혔던 이슈가 다시 열린 경우.
                            ){
                                if (issue.labels.length != 0 && issue.labels[0].name == 'documentation'){
                                    repoMap.get(issue.user.login).issues.doc += 1
                                    if (this.repoPaths.length >= 2) totalMap.get(issue.user.login).issues.doc += 1
                                    docissueCnt++;
                                }
                                else if (issue.labels.length != 0){
                                    repoMap.get(issue.user.login).issues.bugAndFeat += 1
                                    if (this.repoPaths.length >= 2) totalMap.get(issue.user.login).issues.bugAndFeat += 1
                                    bugFeatissueCnt++;
                                }
                            } 
                        }
                    });
        
                    if (response.length < 100){ // 마지막 페이지라면 루프를 탈출.
                        break;
                    }
                    page++; // 다음 페이지로 넘어감.
                }
            }catch(error){
                const status = error?.status;
                if (status === 404){
                    throw new Error("레포지토리 주소가 잘못되었습니다.");
                }else if(status === undefined){
                    throw new Error(`알 수 없는 오류 발생 (status 없음): ${error.message}`);
                } 
                else{
                    throw new Error(`레포지토리 정보를 불러오는 중 오류가 발생했습니다. 상태 코드: ${status}, 메시지: ${error.message}`);
                }
            }
                // PR, 이슈 통계 확인용 log
                log(`\n***${repo}***\n`)
                log(`bug and Feat PRs : ${bugFeatPRcnt}`)
                log(`doc PRs : ${docPRcnt}`)
                log(`bug and Feat issues : ${bugFeatissueCnt}`)
                log(`doc issues : ${docissueCnt}\n`)
        }
    }

    calculateAverageScore(allRepoScores) {
        allRepoScores.forEach((repoScores, repoName) => {
            const values = repoScores.map(item => item[1]);
            if (values.length === 0) {
                log('참가자가 없어 평균을 계산할 수 없습니다.\n');
            }

            const total = values.reduce((sum, val) => sum + val, 0);
            const average = total / values.length;
        
            log(`${repoName} Average Score: ${average.toFixed(2)}\n`);
            return average;
        });
    }

    calculateScores() {
        const allRepoScores = new Map();
    
        this.participants.forEach((repoActivities, repoName) => {
            const repoScores = [];  
    
            for (const [participant, activities] of repoActivities.entries()) {
                const p_fb = activities.pullRequests.bugAndFeat || 0;
                const p_d = activities.pullRequests.doc || 0;
                const i_fb = activities.issues.bugAndFeat || 0;
                const i_d = activities.issues.doc || 0;
    
                let p_fb_at, p_d_at, i_fb_at, i_d_at;
    
                const total_pr = p_fb + p_d;
                const total_issue = i_fb + i_d;
    
                if (total_pr === 0 && total_issue === 0) {
                    p_fb_at = 0;
                    p_d_at = 0;
                    i_fb_at = 0;
                    i_d_at = 0;
                } else if ((p_fb > 0 || p_d > 0) && (total_pr > 1 || total_issue > 1)) {
                    const temp_p_fb = (p_fb === 0 && p_d > 0) ? 1 : p_fb;
                    const p_valid = temp_p_fb + Math.min(p_d, 3 * temp_p_fb);
                    const i_valid = Math.min(i_fb + i_d, 4 * p_valid);
    
                    p_fb_at = p_fb;
                    p_d_at = p_valid - p_fb_at;
                    i_fb_at = Math.min(i_fb, i_valid);
                    i_d_at = i_valid - i_fb_at;
                } else {
                    p_fb_at = p_fb;
                    p_d_at = p_d;
                    i_fb_at = i_fb;
                    i_d_at = i_d;
                }
    
                const p_fb_score = p_fb_at * 3;
                const p_d_score = p_d_at * 2;
                const i_fb_score = i_fb_at * 2;
                const i_d_score = i_d_at * 1;
    
                const totalScore = p_fb_score + p_d_score + i_fb_score + i_d_score;
    
                repoScores.push([
                    participant,
                    p_fb_score,
                    p_d_score,
                    i_fb_score,
                    i_d_score,
                    totalScore
                ]);
    
            }
    
            // 정렬 후 저장
            repoScores.sort((a, b) => b[5] - a[5]);
            allRepoScores.set(repoName, repoScores);
        });
    
        return allRepoScores;
    }
    
    generateTable(allRepoScores, text) {
        allRepoScores.forEach((repoScores, repoName) => {
          const table = new Table({
            head: ['참가자', 'feat/bug PR 점수', 'doc PR 점수', 'feat/bug 이슈 점수', 'doc 이슈 점수', '총점', '참여율(%)'],
            colWidths: [20, 16, 12, 16, 12, 10, 11],
            style: { head: ['yellow'] }
          });
      
          // 리포지토리 전체 합(= 모든 기여자의 totalScore 합)
          const totalScore = repoScores.reduce((sum, row) => sum + row[5], 0);
      
          // -t 옵션이 켜져 있으면, 텍스트 파일로도 저장하기 위해 문자열 준비
          let textOutput = `=== ${repoName} 기여도 테이블 ===\n\n` +
            `참가자,feat/bug PR 점수,doc PR 점수,feat/bug 이슈 점수,doc 이슈 점수,총점,참여율(%)\n`;
      
          repoScores.forEach(([name, p_fb_score, p_d_score, i_fb_score, i_d_score, total]) => {
            const rate = totalScore > 0 ? ((total / totalScore) * 100).toFixed(2) : '0.00';
      
            // CLI에 표시될 테이블 행
            table.push([
              name,
              p_fb_score,
              p_d_score,
              i_fb_score,
              i_d_score,
              total,
              `${rate}%`
            ]);
      
            // 텍스트 출력 내용
            textOutput += `${name},${p_fb_score},${p_d_score},${i_fb_score},${i_d_score},${total},${rate}%\n`;
          });
      
          // 콘솔 출력
          log(`${repoName} 점수 집계가 완료되었습니다.`);
          log(table.toString());
      
          // -t 옵션이 있으면 텍스트 파일 저장
          if (text) {
            const resultsDir = path.join(__dirname, '..', 'results');
            if (!fs.existsSync(resultsDir)) {
              fs.mkdirSync(resultsDir);
            }
            const filePath = path.join(resultsDir, `${repoName}.txt`);
            fs.writeFileSync(filePath, textOutput, 'utf-8');
            log(`점수 집계 텍스트 파일이 생성되었습니다: ${filePath}`);
          }
        });
      }

    async generateChart(allRepoScores, outputDir = '.') {
        for (const [repoName, repoScores] of allRepoScores){
            const width = 800; // px
            const participantCount = repoScores.length;
            const barHeight = 30;
            const height = participantCount * barHeight; // px
            const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, plugins:{modern: ['chartjs-plugin-datalabels']} });
            const labels = repoScores.map(([name]) => name);
            const data = repoScores.map(([_, score]) => score);
            const barColors = data.map(score => {
                const clamped = Math.max(0, Math.min(score, 100));
            const index = Math.floor(clamped / 10);
            const [r, g, b] = colorRanges[index];
            return `rgb(${r}, ${g}, ${b})`;
            })
            const configuration = {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Score',
                        data: data,
                        backgroundColor : barColors
                    }],
                },

                options: {
                    responsive: false,
                    indexAxis: 'y',
                    plugins: {
                        title: {
                            display: true,
                            text: 'Contribution Score by Participant'
                        },
                        subtitle: {
                            display: true,
                            text: `Total number of student : ${participantCount}`,
                            align: 'end', // 우측 정렬
                            color: '#888',
                            font: {
                                size: 12
                            },
                            padding: {
                                top: 0,
                                bottom: 10
                            }
                        },
                        datalabels: {
                            color: '#ffffff',
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                autoSkip: false,
                            }
                        },
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            };

        
            const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
            const filePath = path.join(outputDir, `${repoName}_chart.png`);
            fs.writeFileSync(filePath, buffer);
            log(`차트 이미지가 저장되었습니다: ${filePath}`);
        }
    }
    
    async generateCsv(allRepoScores, outputDir = '.'){
        allRepoScores.forEach((repoScores, repoName) => {
            let csvContent = `name,feat/bug PR,doc PR,feat/bug issue,doc issue,total\n`;

            repoScores.forEach(([name, prFeat, prDoc, issueFeat, issueDoc, total]) => {
                csvContent += `${name},${prFeat},${prDoc},${issueFeat},${issueDoc},${total}\n`;
              });

            const filePath = path.join(outputDir, `csv_${repoName}.csv`);
            fs.writeFileSync(filePath, csvContent);
            log(`csv_${repoName}.csv 생성.`);
        });
    }
}

module.exports = RepoAnalyzer;
