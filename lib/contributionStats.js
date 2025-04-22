const SCORE = {
    prFeatureBug: 3,
    prDoc: 2,
    prTypo: 1,
    issueFeatureBug: 2,
    issueDoc: 1
};

/**
 * 활동 수에 따라 조정된 PR과 이슈 개수를 계산합니다.
 */
function calculateAdjustedCounts(prFeature, prDoc, prTypo, issueFeature, issueDoc) {
    const totalPR = prFeature + prDoc + prTypo;
    const totalIssue = issueFeature + issueDoc;

    if (totalPR === 0 && totalIssue === 0) {
        return {
            pr: { feature: 0, doc: 0, typo: 0 },
            issue: { feature: 0, doc: 0 }
        };
    }

    if ((prFeature > 0 || prDoc > 0 || prTypo > 0) && (totalPR > 1 || totalIssue > 1)) {
        const tempPRFeature = (prFeature === 0 && prDoc > 0) ? 1 : prFeature;
        const validPR = tempPRFeature + Math.min(prDoc, 3 * tempPRFeature) + Math.min(prTypo, 3 * tempPRFeature);
        const validIssue = Math.min(issueFeature + issueDoc, 4 * validPR);

        return {
            pr: {
                feature: prFeature,
                doc: Math.min(prDoc, 3 * tempPRFeature),
                typo: Math.min(prTypo, 3 * tempPRFeature)
            },
            issue: {
                feature: Math.min(issueFeature, validIssue),
                doc: validIssue - Math.min(issueFeature, validIssue)
            }
        };
    }

    return {
        pr: { feature: prFeature, doc: prDoc, typo: prTypo },
        issue: { feature: issueFeature, doc: issueDoc }
    };
}

/**
 * 조정된 개수를 바탕으로 점수를 계산합니다.
 */
function calculateScoresFromCounts(counts) {
    return {
        pr: {
            feature: counts.pr.feature * SCORE.prFeatureBug,
            doc: counts.pr.doc * SCORE.prDoc,
            typo: counts.pr.typo * SCORE.prTypo
        },
        issue: {
            feature: counts.issue.feature * SCORE.issueFeatureBug,
            doc: counts.issue.doc * SCORE.issueDoc
        }
    };
}

/**
 * 개별 참여자의 점수를 계산합니다.
 */
function calculateParticipantScore(participant, activities) {
    const prFeature = activities.pullRequests.bugAndFeat || 0;
    const prDoc = activities.pullRequests.doc || 0;
    const prTypo = activities.pullRequests.typo || 0;
    const issueFeature = activities.issues.bugAndFeat || 0;
    const issueDoc = activities.issues.doc || 0;

    const adjusted = calculateAdjustedCounts(prFeature, prDoc, prTypo, issueFeature, issueDoc);
    const scores = calculateScoresFromCounts(adjusted);

    const total = 
        Object.values(scores.pr).reduce((a, b) => a + b, 0) +
        Object.values(scores.issue).reduce((a, b) => a + b, 0);

    return [
        participant,
        scores.pr.feature,
        scores.pr.doc,
        scores.pr.typo,
        scores.issue.feature,
        scores.issue.doc,
        total
    ];
}

/**
 * 전체 저장소의 점수를 계산합니다.
 */
function calculateAllScores(participantsMap) {
    const allRepoScores = new Map();

    participantsMap.forEach((repoActivities, repoName) => {
        const repoScores = Array.from(repoActivities.entries())
            .map(([participant, activities]) =>
                calculateParticipantScore(participant, activities)
            )
            .sort((a, b) => b[6] - a[6]); // 총점 기준 내림차순

        allRepoScores.set(repoName, repoScores);
    });

    return allRepoScores;
}

export {
    calculateAdjustedCounts,
    calculateScoresFromCounts,
    calculateParticipantScore,
    calculateAllScores
};
