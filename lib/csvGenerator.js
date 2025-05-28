// csvGenerator.js
import path from 'path';
import fs from 'fs/promises';
import { log } from './Util.js';

const CSV_HEADER = 'name,feat/bug PR count,feat/bug PR score,doc PR count,doc PR score,typo PR count,typo PR score,feat/bug issue count,feat/bug issue score,doc issue count,doc issue score,total,feat_ratio,typo_ratio,doc_ratio,issue_ratio\n';


class CsvGenerator {
    constructor() {}

    async generateCombinedCsv(repoName, repoScores, repoActivities, outputDir) {
        const rows = [];
        
        for (const [participant, activities] of repoActivities.entries()) {
            const p_fb_count = activities.pullRequests.bugAndFeat || 0;
            const p_d_count = activities.pullRequests.doc || 0;
            const p_t_count = activities.pullRequests.typo || 0;
            const i_fb_count = activities.issues.bugAndFeat || 0;
            const i_d_count = activities.issues.doc || 0;
        
            const scoreData = repoScores.find(([name]) => name === participant) || [participant, 0, 0, 0, 0, 0, 0];
            const [, p_fb_score, p_d_score, p_t_score, i_fb_score, i_d_score, total] = scoreData;
        
            const featRatio = total > 0 ? ((p_fb_score / total) * 100).toFixed(1) : '0.0';
            const typoRatio = total > 0 ? ((p_t_score / total) * 100).toFixed(2) : '0.00';
            const docRatio = total > 0 ? ((p_d_score / total) * 100).toFixed(2) : '0.00';
            const issueRatio = total > 0 ? ((i_fb_score / total) * 100).toFixed(2) : '0.00';
        
            rows.push({
                participant,
                p_fb_count, p_fb_score,
                p_d_count, p_d_score,
                p_t_count, p_t_score,
                i_fb_count, i_fb_score,
                i_d_count, i_d_score,
                total,
                featRatio, typoRatio, docRatio, issueRatio
            });
        }

    // 총점 기준 내림차순 정렬
        rows.sort((a, b) => b.total - a.total);
        
        // CSV 문자열 생성
        let csvContent = CSV_HEADER;
        for (const row of rows) {
            csvContent += `${row.participant},${row.p_fb_count},${row.p_fb_score},${row.p_d_count},${row.p_d_score},${row.p_t_count},${row.p_t_score},${row.i_fb_count},${row.i_fb_score},${row.i_d_count},${row.i_d_score},${row.total},${row.featRatio},${row.typoRatio},${row.docRatio},${row.issueRatio}\n`;
        }
    
        const repoSpecificDir = path.join(outputDir, repoName);
        await fs.mkdir(repoSpecificDir, { recursive: true });
        const filePath = path.join(repoSpecificDir, `${repoName}_data.csv`);
        await fs.writeFile(filePath, csvContent);
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
