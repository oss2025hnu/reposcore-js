// csvGenerator.js
import path from 'path';
import fs from 'fs/promises';
import { log } from './Util.js';

const CSV_HEADER = 'name,feat/bug PR count,feat/bug PR score,doc PR count,doc PR score,typo PR count,typo PR score,feat/bug issue count,feat/bug issue score,doc issue count,doc issue score,total,feat_ratio,doc_ratio,issue_ratio\n';


class CsvGenerator {
    constructor() {}

    async generateCombinedCsv(repoName, repoScores, repoActivities, outputDir) {
        let csvContent = CSV_HEADER;
        let totalScore = 0;

        // 참여자별로 점수와 횟수를 결합
        for (const [participant, activities] of repoActivities.entries()) {
            const p_fb_count = activities.pullRequests.bugAndFeat || 0;
            const p_d_count = activities.pullRequests.doc || 0;
            const p_t_count = activities.pullRequests.typo || 0;
            const i_fb_count = activities.issues.bugAndFeat || 0;
            const i_d_count = activities.issues.doc || 0;

            // 해당 참여자의 점수 찾기
            const scoreData = repoScores.find(([name]) => name === participant) || [participant, 0, 0, 0, 0, 0, 0];
            const [, p_fb_score, p_d_score, p_t_score, i_fb_score, i_d_score, total] = scoreData;

            // Calculate featRatio and issueRatio as percentages
            const featRatio = total > 0 ? ((p_fb_score / total) * 100).toFixed(1) : '0.0';
            const docRatio = total > 0 ? ((p_d_score / total) * 100).toFixed(2) : '0.00';
            const issueRatio = total > 0 ? ((i_fb_score / total) * 100).toFixed(2) : '0.00';

            totalScore += total;
            csvContent += `${participant},
            ${p_fb_count},${p_fb_score},${p_d_count},${p_d_score},${p_t_count},
            ${p_t_score},${i_fb_count},${i_fb_score},${i_d_count},${i_d_score},
            ${total},${featRatio},${docRatio},${issueRatio}\n`;
        }

        const repoSpecificDir = path.join(outputDir, repoName);
        await fs.mkdir(repoSpecificDir, { recursive: true });
        const filePath = path.join(repoSpecificDir, `${repoName}_data.csv`);
        await fs.writeFile(filePath, csvContent);
        log(`통합 CSV 파일이 생성되었습니다: ${filePath}`, 'INFO');
    }

    async generateCsv(allRepoScores, participants, outputDir = '.') {
        const promises = Array.from(allRepoScores).map(async ([repoName, repoScores]) => {
            // 통합 CSV 생성
            const repoActivities = participants.get(repoName);
            if (repoActivities) {
                await this.generateCombinedCsv(repoName, repoScores, repoActivities, outputDir);
            }
        });

        await Promise.all(promises);
    }
}

export default CsvGenerator;