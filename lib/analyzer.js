const { Octokit } = require('@octokit/rest');
const Table = require('cli-table3');

class RepoAnalyzer {
    constructor(repoPath) {
        this.repoPath = repoPath;
        this.participants = new Map();
        this.octokit = new Octokit(); // Still included but unused in stubs
    }
        
    async collectPRs(){ // 병합된 PR의 수를 사용자별로 합산한 후 this.participants에 저장.
        console.log('Collecting pull reqeusts...');
        const [owner, repo] = this.repoPath.split('/') // 레퍼지토리 주소를 분할해 소유자와 레퍼지토리의 이름을 저장.
        try{
            let page = 1; // 1페이지부터 탐색
            while(true){
                const {data : PRs} = await this.octokit.rest.pulls.list({
                    owner, 
                    repo, 
                    state: 'closed', // 닫힌 PR만 가져오기.
                    per_page: 100, // 한 페이지에서 최대 100개의 PR데이터를 가져옴.
                    page 
                }); 


                PRs.forEach(pr => { // PRs를 순회.
                    if (pr.merged_at !== null) { // 해당 PR이 병합되었을때만 횟수를 추가.
                        if (this.participants.has(pr.user.login)){ // participants에 이미 추가된 사용자라면 pullRequests값을 + 1.
                            this.participants.get(pr.user.login).pullRequests += 1;
                        }
                        else { // 존재하지 않는 사용자라면 '사용자명' => {pullRequests : 1, issues : 0, comments : 0}으로 초기화.
                            this.participants.set(pr.user.login, {pullRequests : 1, issues : 0, comments : 0})
                        }
                    }
                })

                if (PRs.length < 100) { // 마지막 페이지라면 루프 탈출.
                    break;
                }
                page++; // 다음 페이지로 넘김.
            }
        } catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    }

    async collectIssues() {
        console.log('Collecting issues...');
        // Deterministic stub data, building on commit data
        this.participants.forEach((data, name) => {
            data.issues = 2;    // Fixed: 2 issues per participant
            data.comments = 3;  // Fixed: 3 comments per participant
        });
        // Add a new participant with fixed values
        if (!this.participants.has('charlie')) {
            this.participants.set('charlie', { commits: 1, issues: 2, comments: 3 });
        }
    }

    calculateScores() {
        const scores = {};
        for (const [participant, data] of this.participants) {
            scores[participant] = (data.pullRequests || 0) * 0.4 +
                                 (data.issues || 0) * 0.3 +
                                 (data.comments || 0) * 0.3;
        }
        return scores;
    }

    generateTable(scores) {
        const table = new Table({ head: ['Participant', 'Score'] });
        Object.entries(scores).forEach(([name, score]) => table.push([name, score.toFixed(2)]));
        console.log(table.toString());
    }

    async generateChart(scores) {
        // Placeholder: Requires a charting library and canvas setup for CLI
        console.log('Chart generation placeholder');
    }
}

module.exports = RepoAnalyzer;
