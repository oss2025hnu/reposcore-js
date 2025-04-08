const { Octokit } = require('@octokit/rest');
const Table = require('cli-table3');
const fs = require('fs');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const path = require('path');

class RepoAnalyzer {
    constructor(repoPath, token) {
        this.repoPath = repoPath;
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
            console.log('토큰이 정상적으로 등록되었습니다.');
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

        const [owner, repo] = this.repoPath.split('/') // 사용자, 저장소 이름 추출
        let page = 1

        // 확인용 카운터, 추후 제거.
        let bugFeatPRcnt = 0, docPRcnt = 0;
        let bugFeatissueCnt = 0, docissueCnt = 0;
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
                    if (!this.participants.has(issue.user.login)){ // 존재하지 않는 사용자라면 초기화.
                        this.participants.set(issue.user.login, {
                            pullRequests : {bugAndFeat : 0, doc : 0}, 
                            issues : {bugAndFeat : 0, doc : 0}, 
                            comments : 0
                        });
                    }
    
                    if (issue.pull_request !== undefined){  // PR인 경우.
                        if (issue.pull_request.merged_at !== null) {  // PR이 병합되었는지 확인.
                            // 라벨에 따른 분류, 라벨은 문서, 기능, 버그 세 종류만 존재하며 한 이슈/PR에 하나의 라벨만 붙는다고 가정. 라벨이 없다면 개수를 추가하지 않음.
                            if (issue.labels.length != 0 && issue.labels[0].name == 'documentation'){  
                                this.participants.get(issue.user.login).pullRequests.doc += 1
                                docPRcnt++;
                            }
                            else if (issue.labels.length != 0){
                                this.participants.get(issue.user.login).pullRequests.bugAndFeat += 1
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
                                this.participants.get(issue.user.login).issues.doc += 1
                                docissueCnt++;
                            }
                            else if (issue.labels.length != 0){
                                this.participants.get(issue.user.login).issues.bugAndFeat += 1
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
        

        // 확인용 console.log, 추후 제거.
        
        console.log('\n***수집한 정보를 출력합니다.***\n')
        
        console.log('\n***total***\n')
        console.log(`bug and Feat PRs : ${bugFeatPRcnt}`)
        console.log(`doc PRs : ${docPRcnt}`)
        console.log(`bug and Feat issues : ${bugFeatissueCnt}`)
        console.log(`doc issues : ${docissueCnt}`)
    }

    calculateScores() {
        const scores = {};
    
        for (const [participant, activities] of this.participants.entries()) {
            const p_fb = activities.pullRequests.bugAndFeat || 0;
            const p_d = activities.pullRequests.doc || 0;
    
            const i_fb = activities.issues.bugAndFeat || 0;
            const i_d = activities.issues.doc || 0;
            
            const total_pr = p_fb + p_d;
            const total_issue = i_fb + i_d;

            let S;

            //최소 1개의 PR, 1개의 이슈가 있다면 이후부터 기존의 비율 계산
            if (total_pr === 0 || total_issue === 0) {
                S = 0;
            }
            else if (p_fb > 0 && total_issue > 0 && (total_pr > 1 || total_issue > 1)) {
                const p_valid = p_fb + Math.min(p_d, 3 * p_fb);
                const i_valid = Math.min(i_fb + i_d, 4 * p_valid);

                const p_fb_at = Math.min(p_fb, p_valid);
                const p_d_at = p_valid - p_fb_at;

                const i_fb_at = Math.min(i_fb, i_valid);
                const i_d_at = i_valid - i_fb_at;

                S = 3 * p_fb_at + 2 * p_d_at + 2 * i_fb_at + 1 * i_d_at;
            } 
            else {
                S = 3 * p_fb + 2 * p_d + 2 * i_fb + 1 * i_d;
            }
            scores[participant] = S;
        }
    
        return scores;
    }

    calculateAverageScore(scores) {
        const values = Object.values(scores);
        if (values.length === 0) {
            console.log('참가자가 없어 평균을 계산할 수 없습니다.\n');
            return 0;
        }
    
        const total = values.reduce((sum, val) => sum + val, 0);
        const average = total / values.length;
    
        console.log(`Average Score: ${average.toFixed(2)}\n`);
        return average;
    }

    generateTable(scores, text) {

        const table = new Table({
            head: ['참가자', '점수'],
            colWidths: [20, 10],
            style: {head : ['yellow']}
        });


        const sorted = Object.entries(scores).sort((a,b) => b[1] - a[1]); // 내림차순 정렬

        if(text){ // txt 파일 생성 옵션 (-t) 활성화 시 
            const textOutput = sorted
            .map(([name, score]) => `${name} : ${score}`)
            .join('\n');

            fs.writeFileSync('score_table.txt', textOutput, 'utf-8');
            console.log('점수 집계 텍스트 파일이 생성되었습니다.');
        }

        sorted.forEach(([name, score]) => {
            table.push([name, score]);
        });
        
        console.log('점수 집계가 완료되었습니다.');
        console.log(table.toString());
    }

    async generateChart(scores, outputDir = '.') {
        const width = 800; // px
        const height = 600; // px
        const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });
    
        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const labels = sorted.map(([name]) => name);
        const data = sorted.map(([_, score]) => score);
    
        const configuration = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '점수',
                    data: data,
                }]
            },
            options: {
                responsive: false,
                plugins: {
                    title: {
                        display: true,
                        text: '참가자 기여도 점수'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        };
    
        const buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
        const filePath = path.join(outputDir, 'participation_chart.png');
        fs.writeFileSync(filePath, buffer);
        console.log(`차트 이미지가 저장되었습니다: ${filePath}`);
    }
    
}

module.exports = RepoAnalyzer;
