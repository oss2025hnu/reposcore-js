import path from 'path';
import fs from 'fs/promises';
import Table from 'cli-table3';

import { getBadge, log } from './Util.js';

export default class TableGenerator {
    constructor(themeManager) {
        this.themeManager = themeManager;
    }

    async generateTable(allRepoScores, output, options) {
        const promises = Array.from(allRepoScores).map(async ([repoName, repoScores]) => {
            let theme = this.themeManager.getCurrentTheme();
            
            // 테마 null 체크
            if (!theme || !theme.table) {
                console.error('테이블 테마를 불러올 수 없습니다. 기본 설정을 사용합니다.');
                theme = {
                    table: {
                        head: ['yellow'],
                        border: ['gray']
                    }
                };
            }

            // 한국어와 이모지의 실제 표시 너비 계산 함수
            const calculateDisplayWidth = (str) => {
                let width = 0;
                for (const char of str) {
                    // 한국어: 2바이트로 계산
                    if (/[\u3131-\uD79D]/.test(char)) {
                        width += 2;
                    }
                    // 이모지: 2바이트로 계산 (터미널마다 다를 수 있지만 기본적으로 2로 가정)
                    else if (/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(char)) {
                        width += 2;
                    }
                    // 그 외 ASCII 문자: 1바이트
                    else {
                        width += 1;
                    }
                }
                return width;
            };

            // 참가자의 최대 너비 계산
            let maxNameWidth = 20; // 최소 너비
            // 총점 배열 생성
            const totalScores = repoScores.map(row => row[6]);
            // 평균, 최저점, 최고점 계산
            const averageScore = (totalScores.reduce((sum, val) => sum + val, 0) / totalScores.length).toFixed(2);
            const minScore = Math.min(...totalScores);
            const maxScore = Math.max(...totalScores);

            repoScores.forEach(([name, , , , , , total]) => {
                // 뱃지
                const badge = getBadge(total);
                // 뱃지에서 이모지만 추출
                const badgeEmoji = badge.split(' ')[0];
                const nameWithBadge = `${badgeEmoji} ${name}`;
                const displayWidth = calculateDisplayWidth(nameWithBadge);
                maxNameWidth = Math.max(maxNameWidth, displayWidth + 2); // 여유 공간 추가
            });

            // 순위 계산 함수
            function calculateRank(currentIndex, currentTotal, prevTotal, prevRank) {
                return currentTotal === prevTotal ? prevRank : currentIndex + 1;
            }
            // 참여율 계산 함수
            function calculateRate(score, totalScore) {
                return totalScore > 0 ? ((score / totalScore) * 100).toFixed(2) : '0.00';
            }
            // 동적 colWidths 설정
            const colWidths = [
                6,            //순위
                maxNameWidth, // 참가자 열 (동적)
                16,           // feat/bug PR 점수
                12,           // doc PR 점수
                12,           // typo PR 점수
                16,           // feat/bug 이슈 점수
                12,           // doc 이슈 점수
                10,           // 총점
                11,           // 참여율(%)
                18,           // feat/bug PR 비율(%)
                18,           // doc PR 비율(%)
                18,           // typo PR 비율(%)
                18,           // feat/bug 이슈 비율(%)
                18            // doc 이슈 비율(%)
            ];

            const table = new Table({
                head: [
                    '순위', '참가자',
                    'feat/bug PR 점수', 'doc PR 점수', 'typo PR 점수', 'feat/bug 이슈 점수', 'doc 이슈 점수',
                    '총점', '참여율(%)',
                    'feat/bug PR 비율(%)', 'doc PR 비율(%)', 'typo PR 비율(%)', 'feat/bug 이슈 비율(%)', 'doc 이슈 비율(%)'
                ],
                colWidths: colWidths,
                style: { 
                    head: theme.table.head,
                    border: theme.table.border
                },
                wordWrap: true // 긴 텍스트 자동 줄바꿈
            });

            // 하위 70% 구분을 위한 기준 인덱스 (상위 30% 제외)
            const shouldColor = options?.coloredOutput;
            const highlightStartIndex = Math.ceil(repoScores.length * 0.3);
            function getRGB(r, g, b) {
            return `\x1b[38;2;${r};${g};${b}m`; // ANSI escape code for RGB
            }

            // 리포지토리 전체 합(= 모든 기여자의 totalScore 합)
            const totalScore = repoScores.reduce((sum, row) => sum + row[6], 0); // total 인덱스 6

            // 텍스트 파일로 저장하기 위해 문자열 준비
            let prevTotal = null;
            let rank = 0;
            repoScores.forEach(([name, p_fb_score, p_d_score, p_t_score, i_fb_score, i_d_score, total], index) => {
                // 5개 항목 점수 합
                const sum = p_fb_score + p_d_score + p_t_score + i_fb_score + i_d_score;

                // 각 항목별 비율 (합이 100%가 되도록)
                const p_fb_ratio = sum > 0 ? ((p_fb_score / sum) * 100).toFixed(2) : '0.00';
                const p_d_ratio = sum > 0 ? ((p_d_score / sum) * 100).toFixed(2) : '0.00';
                const p_t_ratio = sum > 0 ? ((p_t_score / sum) * 100).toFixed(2) : '0.00';
                const i_fb_ratio = sum > 0 ? ((i_fb_score / sum) * 100).toFixed(2) : '0.00';
                const i_d_ratio = sum > 0 ? ((i_d_score / sum) * 100).toFixed(2) : '0.00';

                // 순위 계산
                rank = calculateRank(index, total, prevTotal, rank);
                prevTotal = total;

                // 참여율 계산 (전체 총점 대비 개인 총점 비율)
                const rate = calculateRate(total, totalScore);

                // 뱃지
                const badge = getBadge(total);
                // 뱃지에서 이모지만 추출
                const badgeEmoji = badge.split(' ')[0];

                const ranges = [
                    // [0, 10], Green
                    {
                        gte: 0,
                        lte: 10,
                        color: {
                            r: 0x00,
                            g: 0xff,
                            b: 0x00
                        }
                    },
                    // [11, 30], Yellow
                    {
                        gte: 11,
                        lte: 30,
                        color: {
                            r: 0xff,
                            g: 0xff,
                            b: 0x00
                        }
                    },
                    // [31, 60], Orange
                    {
                        gte: 31,
                        lte: 60,
                        color: {
                            r: 0xff,
                            g: 0x5a,
                            b: 0x00
                        }
                    },
                    // [61, 80], Red
                    {
                        gte: 61,
                        lte: 80,
                        color: {
                            r: 0xff,
                            g: 0x00,
                            b: 0x00
                        }
                    },
                    // [81, 100], Gray
                    {
                        gte: 81,
                        lte: 100,
                        color: {
                            r: 0x80,
                            g: 0x80,
                            b: 0x80
                        }
                    },
                ];
                let color;
                for (const range of ranges) {
                    const {gte, lte} = range;
                    // console.log(index, Math.ceil(index / repoScores.length * 100), gte, lte);
                    const rank = Math.ceil(index / repoScores.length * 100);
                    if(rank >= gte && rank <= lte) {  
                        color = range.color;
                        break;
                    }
                }
                const coloredName = getRGB(color.r, color.g, color.b) + name + '\x1b[0m';

                const nameWithBadge = `${badgeEmoji} ${coloredName}`;

                // CLI에 표시될 테이블 행
                table.push([
                    rank,
                    nameWithBadge,
                    p_fb_score,
                    p_d_score,
                    p_t_score,
                    i_fb_score,
                    i_d_score,
                    total,
                    `${rate}%`,
                    `${p_fb_ratio}%`,
                    `${p_d_ratio}%`,
                    `${p_t_ratio}%`,
                    `${i_fb_ratio}%`,
                    `${i_d_ratio}%`
                ]);
            });

            const repoSpecificDir = path.join(output, repoName);
            await fs.mkdir(repoSpecificDir, { recursive: true });
            const filePath = path.join(repoSpecificDir, `${repoName}.txt`);

            const now = new Date();
            const dateStr = now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' });

            const headerTextLines = [
                'Contribution Score by Participant',
                `Generated at ${dateStr}`,
                '' // 줄바꿈 한 줄 추가
            ];
            // 통계 정보 추가
            headerTextLines.push(`평균 점수: ${averageScore}`);
            headerTextLines.push(`최저 점수: ${minScore}`);
            headerTextLines.push(`최고 점수: ${maxScore}`);
            headerTextLines.push(''); // 줄바꿈 한 줄 추가

            const headerText = headerTextLines.join('\n');

            // 테이블 문자열
            const tableString = table.toString();
            
            // ANSI 색상 코드를 제거한 텍스트를 저장
            // 정규식을 사용하여 ANSI 이스케이프 시퀀스 제거
            const stripAnsi = (str) => {
                // ANSI 이스케이프 시퀀스 제거 정규식
                return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
            };

            // 최종 출력 문자열: 헤더 + 테이블
            const finalOutput = headerText + tableString;

            // 콘솔 출력 (옵션 있을 때만 컬러포함 출력)
            if (shouldColor) {
                console.log(finalOutput);
            }

            // ANSI escape code 제거하고 파일로 저장
            await fs.writeFile(filePath, stripAnsi(finalOutput), 'utf-8');
            log(`점수 집계 텍스트 파일이 생성되었습니다: ${filePath}`, 'INFO');
        });

        await Promise.all(promises);
    }
}
