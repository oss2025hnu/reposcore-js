// ContributionAnalyzer.js

class ContributionAnalyzer {
    constructor(excludeUsers = []) {
        this.excludeUsers = excludeUsers;
    }

    isExcluded(user) {
        return this.excludeUsers.includes(user);
    }

    analyzePullRequest(issue) {
        const user = issue.user.login;
        if (this.isExcluded(user)) return null;
        if (!issue.pull_request || issue.pull_request.merged_at === null) return null;

        const label = issue.labels?.[0]?.name;

        if (label === 'documentation') {
            return { user, type: 'pr', category: 'doc' };
        } else if (label === 'typo') {
            return { user, type: 'pr', category: 'typo' };
        } else if (label) {
            return { user, type: 'pr', category: 'bugAndFeat' };
        }

        return null; // 라벨이 없으면 무시
    }

    analyzeIssue(issue) {
        const user = issue.user.login;
        if (this.isExcluded(user)) return null;

        const validStates = ['completed', 'reopened', null];
        if (!validStates.includes(issue.state_reason)) return null;

        const label = issue.labels?.[0]?.name;

        if (label === 'documentation') {
            return { user, type: 'issue', category: 'doc' };
        } else if (label) {
            return { user, type: 'issue', category: 'bugAndFeat' };
        }

        return null;
    }
}

export default ContributionAnalyzer;
