// lib/analyzer.js
const { Octokit } = require('@octokit/rest');
const Table = require('cli-table3');
const { loadEnvToken } = require('./utils/env');

class RepoAnalyzer {
    constructor(repoPath, cliToken) {
        this.repoPath = repoPath;
        this.token = cliToken || loadEnvToken(); // CLI 토큰이 없으면 .env에서 불러옴
        this.participants = new Map();
        this.octokit = this.token ? new Octokit({ auth: this.token }) : new Octokit();
    }

    async validateToken() {
        if (!this.token) {
            console.log('등록된 토큰이 없어 비인증 상태로 진행합니다.');
            return;
        }
        console.log('토큰 인증을 진행합니다...');
        try {
            await this.octokit.rest.users.getAuthenticated();
            console.log('토큰이 정상적으로 등록되었습니다.');
        } catch (error) {
            if (error.status == 401) {
                throw new Error('Github 토큰 인증에 실패하여 프로그램을 종료합니다, 유효한 토큰인지 확인해주세요.');
            } else {
                throw new Error(`Github 토큰 인증 중 오류가 발생했습니다. ${error.message}`);
            }
        }
    }

    async collectPRsAndIssues() {
        console.log('Collecting PRs and issues...');

        const [owner, repo] = this.repoPath.split('/')
        let page = 1

        let bugFeatPRcnt = 0, docPRcnt = 0;
        let bugFeatissueCnt = 0, docissueCnt = 0;

        while (true) {
            const { data: response } = await this.octokit.rest.issues.listForRepo({
                owner,
                repo,
                state: 'all',
                per_page: 100,
                page
            });

            response.forEach(issue => {
                if (!this.participants.has(issue.user.login)) {
                    this.participants.set(issue.user.login, {
                        pullRequests: { bugAndFeat: 0, doc: 0 },
                        issues: { bugAndFeat: 0, doc: 0 },
                        comments: 0
                    });
                }

                if (issue.pull_request !== undefined) {
                    if (issue.pull_request.merged_at !== null) {
                        if (issue.labels.length != 0 && issue.labels[0].name == 'documentation') {
                            this.participants.get(issue.user.login).pullRequests.doc += 1
                            docPRcnt++;
                        }
                        else if (issue.labels.length != 0) {
                            this.participants.get(issue.user.login).pullRequests.bugAndFeat += 1
                            bugFeatPRcnt++;
                        }
                    }
                }
                else {
                    if (
                        issue.state_reason == 'completed' ||
                        issue.state_reason == null ||
                        issue.state_reason == 'reopened'
                    ) {
                        if (issue.labels.length != 0 && issue.labels[0].name == 'documentation') {
                            this.participants.get(issue.user.login).issues.doc += 1
                            docissueCnt++;
                        }
                        else if (issue.labels.length != 0) {
                            this.participants.get(issue.user.login).issues.bugAndFeat += 1
                            bugFeatissueCnt++;
                        }
                    }
                }
            });

            if (response.length < 100) {
                break;
            }
            page++;
        }
        

        console.log('\n***수집한 정보를 출력합니다.***\n')

        console.log('\n***total***\n')
        console.log(`bug and Feat PRs : ${bugFeatPRcnt}`)
        console.log(`doc PRs : ${docPRcnt}`)
        console.log(`bug and Feat issues : ${bugFeatissueCnt}`)
        console.log(`doc issues : ${docissueCnt}\n`)
    }

    calculateScores() {
        const scores = {};

        for (const [participant, activities] of this.participants.entries()) {
            const p_fb = activities.pullRequests.bugAndFeat || 0;
            const p_d = activities.pullRequests.doc || 0;

            const i_fb = activities.issues.bugAndFeat || 0;
            const i_d = activities.issues.doc || 0;

            const p_valid = p_fb + Math.min(p_d, 3 * p_fb);
            const i_valid = Math.min(i_fb + i_d, 4 * p_valid);

            const p_fb_at = Math.min(p_fb, p_valid);
            const p_d_at = p_valid - p_fb_at;

            const i_fb_at = Math.min(i_fb, i_valid);
            const i_d_at = i_valid - i_fb_at;

            const S = 3 * p_fb_at + 2 * p_d_at + 2 * i_fb_at + 1 * i_d_at;
            scores[participant] = S;
        }

        return scores;
    }

    generateTable(scores) {
        const table = new Table({
            head: ['참가자', '점수'],
            colWidths: [20, 10],
            style: { head: ['yellow'] }
        });

        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

        sorted.forEach(([name, score]) => {
            table.push([name, score]);
        });

        console.log('점수 집계가 완료되었습니다.');
        console.log(table.toString());
    }

    generateChart(scores) {
        console.log('\n기여도 차트를 생성합니다...\n');

        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        const maxNameLength = Math.max(...sorted.map(([name]) => name.length));
        const maxScore = Math.max(...sorted.map(([_, score]) => score));
        const barMaxWidth = 40;

        for (const [name, score] of sorted) {
            const barLength = Math.round((score / maxScore) * barMaxWidth);
            const bar = '█'.repeat(barLength);
            const paddedName = name.padEnd(maxNameLength, ' ');
            console.log(`${paddedName} | ${bar} ${score}`);
        }

        console.log('\n차트 생성이 완료되었습니다.\n');
    }

}

module.exports = RepoAnalyzer;
