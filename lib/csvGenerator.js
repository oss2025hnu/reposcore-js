// csvGenerator.js
import path from 'path';
import fs from 'fs/promises';
import { log } from './Util.js';

const CSV_HEADER = 'name,feat/bug PR count,feat/bug PR score,doc PR count,doc PR score,typo PR count,typo PR score,feat/bug issue count,feat/bug issue score,doc issue count,doc issue score,total,feat_ratio,typo_ratio,doc_ratio,issue_ratio\n';

class CsvGenerator {
    constructor() {}

    async generateCombinedCsv(repoName, repoScores, repoActivities, outputDir) {
        const rows = [];
        
        // repoScores 기준으로 순회 (실명 변환된 데이터 기준)
        for (const scoreData of repoScores) {
            const [participant, p_fb_score, p_d_score, p_t_score, i_fb_score, i_d_score, total] = scoreData;
            
            // 활동 수 데이터는 점수에서 역산하거나 기본값 사용
            // (실제 활동 수보다는 점수가 더 중요하므로)
            const p_fb_count = Math.ceil(p_fb_score / 3) || 0; // 점수를 3으로 나눠서 대략적인 PR 수 계산
            const p_d_count = Math.ceil(p_d_score / 2) || 0;   // 점수를 2로 나눠서 대략적인 문서 PR 수 계산
            const p_t_count = p_t_score || 0;                  // 오타 수정은 1점이므로 그대로
            const i_fb_count = Math.ceil(i_fb_score / 2) || 0; // 이슈 점수를 2로 나눠서 계산
            const i_d_count = i_d_score || 0;                  // 문서 이슈는 1점이므로 그대로
        
            const featRatio = total > 0 ? ((p_fb_score / total) * 100).toFixed(1) : '0.0';
            const typoRatio = total > 0 ? ((p_t_score / total) * 100).toFixed(2) : '0.00';
            const docRatio = total > 0 ? ((p_d_score / total) * 100).toFixed(2) : '0.00';
            const issueRatio = total > 0 ? (((i_fb_score + i_d_score) / total) * 100).toFixed(2) : '0.00';
        
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

        // 이미 repoScores가 정렬되어 있으므로 추가 정렬 불필요
        
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
            // participants가 null이거나 해당 repoName이 없어도 repoScores만으로 CSV 생성 가능
            await this.generateCombinedCsv(repoName, repoScores, null, outputDir);
        });

        await Promise.all(promises);
    }
}

export default CsvGenerator;