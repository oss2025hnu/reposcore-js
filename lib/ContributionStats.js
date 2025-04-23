// ContributionStats.js

function initParticipant(map, user) {
    if (!map.has(user)) {
        map.set(user, {
            pullRequests: { bugAndFeat: 0, doc: 0, typo: 0 },
            issues: { bugAndFeat: 0, doc: 0 }
        });
    }
}

class ContributionStats {
    constructor() {
        this.participantMap = new Map(); // user -> 활동 정보
    }

    addContribution({ user, type, category }) {
        initParticipant(this.participantMap, user);

        const userData = this.participantMap.get(user);

        if (type === 'pr') {
            userData.pullRequests[category]++;
        } else if (type === 'issue') {
            userData.issues[category]++;
        }
    }

    generateSummary() {
        return this.participantMap;
    }
}

export default ContributionStats;
