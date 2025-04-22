import { Octokit } from '@octokit/rest';
import { log } from './Util.js';

const EXCLUDE_USERS = ['kyagrd', 'kyahnu'];

function initParticipant(map, login) {
    if (!map.has(login)) {
        map.set(login, {
            pullRequests: { bugAndFeat: 0, doc: 0, typo: 0 },
            issues: { bugAndFeat: 0, doc: 0 }
        });
    }
}

export async function collectContributions(repoPaths, token) {
    log('Collecting PRs and issues...', 'INFO');

    const octokit = token ? new Octokit({ auth: token }) : new Octokit();
    const participants = new Map();

    if (repoPaths.length >= 2) participants.set('total', new Map());
    let totalMap = participants.get('total') || {};

    const repoPromises = repoPaths.map(async (repoPath) => {
        const [owner, repo] = repoPath.split('/');
        participants.set(repo, new Map());
        let repoMap = participants.get(repo);
        let page = 1;

        try {
            while (true) {
                const { data: response } = await octokit.rest.issues.listForRepo({
                    owner, repo, state: 'all', per_page: 100, page
                });

                response.forEach(issue => {
                    const login = issue.user?.login;
                    if (!login || EXCLUDE_USERS.includes(login)) return;

                    initParticipant(repoMap, login);
                    if (repoPaths.length >= 2) initParticipant(totalMap, login);

                    const isPR = issue.pull_request !== undefined;
                    const isMerged = issue.pull_request?.merged_at !== null;
                    const label = issue.labels[0]?.name;

                    if (isPR && isMerged) {
                        if (label === 'documentation') {
                            repoMap.get(login).pullRequests.doc += 1;
                            totalMap?.get(login).pullRequests.doc += 1;
                        } else if (label === 'typo') {
                            repoMap.get(login).pullRequests.typo += 1;
                            totalMap?.get(login).pullRequests.typo += 1;
                        } else if (label) {
                            repoMap.get(login).pullRequests.bugAndFeat += 1;
                            totalMap?.get(login).pullRequests.bugAndFeat += 1;
                        }
                    } else if (!isPR) {
                        const valid = ['completed', null, 'reopened'].includes(issue.state_reason);
                        if (!valid) return;

                        if (label === 'documentation') {
                            repoMap.get(login).issues.doc += 1;
                            totalMap?.get(login).issues.doc += 1;
                        } else if (label) {
                            repoMap.get(login).issues.bugAndFeat += 1;
                            totalMap?.get(login).issues.bugAndFeat += 1;
                        }
                    }
                });

                if (response.length < 100) break;
                page++;
            }

            log(`${repo} 수집 완료`, 'DEBUG');

        } catch (error) {
            const status = error?.status;
            if (status === 404) throw new Error(`레포지토리 주소 오류: ${repoPath}`);
            if ((status === 403 || status === 429) && error.message.includes('API rate limit')) {
                throw new Error('⚠️ GitHub API 사용 횟수 초과 ⚠️\n토큰을 사용하거나 캐시 옵션을 사용해주세요.');
            }
            throw new Error(`GitHub API 오류: ${error.message}`);
        }
    });

    await Promise.all(repoPromises);
    return participants;
}
