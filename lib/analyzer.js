const { Octokit } = require('@octokit/rest');
const Table = require('cli-table3');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const ChartDataLabels = require('chartjs-plugin-datalabels');
const fs = require('fs');
const path = require('path');

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



class RepoAnalyzer {
    constructor(repoPath, token) {
        this.repoPaths = repoPath;
        this.token = token; // 자신의 github token
        this.participants = new Map();
        this.octokit = token ? new Octokit({auth: token}) : new Octokit(); // 토큰이 등록되었을 경우 인증, 안되었을 경우는 비인증 상태로 진행
    }

    async validateToken(){ // API 토큰 인증
        if(!this.token){
            console.log('등록된 토큰이 없어 비인증 상태로 진행합니다.');
            return;
        }
        console.log('토큰 인증을 진행합니다...')
        try{
            await this.octokit.rest.users.getAuthenticated();
            console.log('토큰이 인증에 성공했습니다.');
        }catch(error){
            if(error.status == 401){
                throw new Error('Github 토큰 인증에 실패하여 프로그램을 종료합니다, 유효한 토큰인지 확인해주세요.');
            }else{
                throw new Error(`Github 토큰 인증 중 오류가 발생했습니다. ${error.message}`);

            }
        }
    }
        

    async collectPRsAndIssues() {
        console.log('Collecting PRs and issues...');

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
                        if (!repoMap.has(issue.user.login)){ // 존재하지 않는 사용자라면 초기화.
                            repoMap.set(issue.user.login, {
                                pullRequests : {bugAndFeat : 0, doc : 0}, 
                                issues : {bugAndFeat : 0, doc : 0}
                            });
                        }
                        
                        if (this.repoPaths.length >= 2 && !totalMap.has(issue.user.login)){ // 존재하지 않는 사용자라면 초기화.
                            totalMap.set(issue.user.login, {
                                pullRequests : {bugAndFeat : 0, doc : 0}, 
                                issues : {bugAndFeat : 0, doc : 0}
                            });
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
                if (error.status == 404){
                    throw new Error("레포지토리 주소가 잘못되었습니다.");
                } else{
                    throw new Error("레포지토리 정보를 불러오는 중 오류가 발생했습니다.");
                }
            }
                    // PR, 이슈 통계 확인용 console.log
                    console.log(`\n***${repo}***\n`)
                    console.log(`bug and Feat PRs : ${bugFeatPRcnt}`)
                    console.log(`doc PRs : ${docPRcnt}`)
                    console.log(`bug and Feat issues : ${bugFeatissueCnt}`)
                    console.log(`doc issues : ${docissueCnt}\n`)
        }
    }

    calculateAverageScore(allRepoScores) {
        allRepoScores.forEach((repoScores, repoName) => {
            const values = repoScores.map(item => item[1]);
            if (values.length === 0) {
                console.log('참가자가 없어 평균을 계산할 수 없습니다.\n');
            }

            const total = values.reduce((sum, val) => sum + val, 0);
            const average = total / values.length;
        
            console.log(`${repoName} Average Score: ${average.toFixed(2)}\n`);
            return average;
        });
    }

    calculateScores() {
        const allRepoScores = new Map();
    
        this.participants.forEach((repoActivities, repoName) => {
            allRepoScores.set(repoName, []);
    
            for (const [participant, activities] of repoActivities.entries()) {
                const p_fb = activities.pullRequests.bugAndFeat || 0;
                const p_d = activities.pullRequests.doc || 0;
    
                const i_fb = activities.issues.bugAndFeat || 0;
                const i_d = activities.issues.doc || 0;
    
                const total_pr = p_fb + p_d;
                const total_issue = i_fb + i_d;
    
                let S;
    
                // 기능 PR이 없고 문서 PR도 없고 이슈도 없을 때는 0점 처리
                if (total_pr === 0 && total_issue === 0) {
                    S = 0;
                }
                // 비율 계산 조건 충족 시 적용
                else if ((p_fb > 0 || p_d > 0) && (total_pr > 1 || total_issue > 1)) {
                    // 기능 PR이 없지만 문서 PR이 있는 경우, temp 기능 PR 1개로 간주해 계산
                    const temp_p_fb = (p_fb === 0 && p_d > 0) ? 1 : p_fb;
    
                    // 인정 가능한 PR/이슈 개수 계산
                    const p_valid = temp_p_fb + Math.min(p_d, 3 * temp_p_fb);
                    const i_valid = Math.min(i_fb + i_d, 4 * p_valid);
    
                    // 점수 계산은 실제 기여량 기준
                    const p_fb_at = p_fb;
                    const p_d_at = p_valid - p_fb_at;
    
                    const i_fb_at = Math.min(i_fb, i_valid);
                    const i_d_at = i_valid - i_fb_at;
    

                    S = SCORE.prFeature * p_fb_at +
                        SCORE.prDoc * p_d_at +
                        SCORE.issueFeature * i_fb_at +
                        SCORE.issueDoc * i_d_at;
                } else {
                    // 단순 계산 (비율 조건 미충족)
                    S = SCORE.prFeature * p_fb +
                    SCORE.prDoc * p_d +
                    SCORE.issueFeature * i_fb +
                    SCORE.issueDoc * i_d;
                }
    
                allRepoScores.get(repoName).push([participant, S]);
            }
        });
    
        allRepoScores.forEach((repoScores, repoName) => {
            allRepoScores.set(repoName, repoScores.sort((a, b) => b[1] - a[1]));
        });
    
        return allRepoScores;
    }
    
    

    generateTable(allRepoScores, text) {
        allRepoScores.forEach((repoScores, repoName) => {
            const table = new Table({
                head: ['참가자', '점수', '참여율(%)'],
                colWidths: [20, 10, 15],
                style: { head: ['yellow'] }
            });
            
            const totalScore = repoScores.reduce((sum, [_, score]) => sum + score, 0);

            if (text) { // -t 옵션이 활성화된 경우
                const textOutput = repoScores
                    .map(([name, score]) => {
                        const participation = totalScore > 0 ? ((score / totalScore) * 100).toFixed(2) : '0.00';
                        return `${name} : ${score} (${participation}%)`;
                    })
                    .join('\n');
    
                // results 디렉토리 경로 설정
                const resultsDir = path.join(__dirname, '..', 'results');
                if (!fs.existsSync(resultsDir)) {
                    fs.mkdirSync(resultsDir);
                }
    
                const filePath = path.join(resultsDir, `${repoName}.txt`);
                fs.writeFileSync(filePath, textOutput, 'utf-8');
                console.log(`점수 집계 텍스트 파일이 생성되었습니다: ${filePath}`);
            }
    
            repoScores.forEach(([name, score]) => {
                const participation = totalScore > 0 ? ((score / totalScore) * 100).toFixed(2) : '0.00';
                table.push([name, score, `${participation}%`]);
            });
    
            console.log(`${repoName} 점수 집계가 완료되었습니다.`);
            console.log(table.toString());
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
                        datalabels : {
                            color : '#ffffff',
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                autoSkip: false, // 레이블 건너뛰지 않음
                            }
                        },
                        y: {
                            beginAtZero: true
                        }
                    }
                },
                plugins: [ ChartDataLabels]
            
            };

            
            // output 폴더가 생성되어 있는지 확인
            // 없을 경우 폴더를 생성합니다.
            if(!fs.existsSync(outputDir)){
                fs.mkdirSync(outputDir, {recursive: true});
                console.log(`차트 저장 폴더가 생성되었습니다. ${outputDir}`);
            }


            const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
            const filePath = path.join(outputDir, `${repoName}_chart.png`);
            fs.writeFileSync(filePath, buffer);
            console.log(`차트 이미지가 저장되었습니다: ${filePath}`);
        }
    }
    
    async generateCsv(allRepoScores, outputDir = '.'){
        allRepoScores.forEach((repoScores, repoName) => {
            let csvContent = `name,score\n`

            repoScores.forEach(participants => { // ['사용자', 점수] 의 값을 csvContent에 저장
                csvContent += `${participants[0]},${participants[1]}\n`
            })

            if(!fs.existsSync(outputDir)){
                fs.mkdirSync(outputDir);
            }

            const filePath = path.join(outputDir, `csv_${repoName}.csv`);
            fs.writeFileSync(filePath, csvContent);
            console.log(`csv_${repoName}.csv 생성.`);
        });
    }
}

module.exports = RepoAnalyzer;
