import fs from 'fs/promises';
import path from 'path';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { CHART_CONFIG } from './chartConfig.js';
import { log } from './Util.js';

const stripAnsi = (str) => str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');

export class ChartGenerator {
    /**
     * @param {Object} config - 차트 설정
     * @param {Object} theme - 테마 설정
     */
    constructor(config = CHART_CONFIG, theme = null) {
        this.config = config;
        this.theme = theme || config.defaultTheme;
    }

    /**
     * 차트 캔버스 초기화 - 동적 크기 지원
     * @param {number} height - 차트 높이
     * @param {number} width - 차트 너비
     * @returns {ChartJSNodeCanvas}
     */
    _initializeCanvas(height, width) {
        return new ChartJSNodeCanvas({
            width,
            height,
            plugins: { modern: ['chartjs-plugin-datalabels'] },
            backgroundColour: this.theme.chart.backgroundColor
        });
    }

    /**
     * 참가자 레이블과 순위 생성
     * @param {Array} scores - 점수 데이터
     * @returns {Array} 레이블 배열
     */
    _generateLabels(scores) {
        let currentRank = 1;
        let currentScore = scores[0][6];  // 첫 번째 점수
        let skipCount = 0;

        return scores.map((score, index) => {
            const [name, , , , , , totalScore] = score;
            
            // 점수가 변경되면 순위 업데이트
            if (totalScore < currentScore) {
                currentRank = index + 1;  // 현재 인덱스 + 1을 순위로 사용
                currentScore = totalScore;
                skipCount = 0;
            } else if (totalScore === currentScore && index > 0) {
                skipCount++;
            }

            const suffix = currentRank === 1 ? 'st' : 
                        currentRank === 2 ? 'nd' : 
                        currentRank === 3 ? 'rd' : 'th';
            const label = `${name} (${currentRank}${suffix})`;

            return stripAnsi(label); 
        });
    }

    /**
     * 점수 데이터 추출
     * @param {Array} scores - 점수 데이터
     * @returns {Array} 점수 배열
     */
    _extractScores(scores) {
        return scores.map(array => array[6]);
    }

    /**
     * 막대 색상 생성
     * @param {Array} data - 점수 데이터
     * @returns {Array} 색상 배열
     */
    _generateColors(data) {
        return data.map((score, index) => {
            if (index === 0) return this.theme.chart.medalColors.first;
            if (index === 1) return this.theme.chart.medalColors.second;
            if (index === 2) return this.theme.chart.medalColors.third;

            if (Array.isArray(this.theme.chart.barColors)) {
                const colorIndex = Math.min(10, Math.floor(score / 10));
                return this.theme.chart.barColors[colorIndex];
            }
            
            return this.theme.chart.medalColors.others;
        });
    }

    /**
     * 차트 설정 생성 - 동적 스케일 적용
     * @param {Object} processedData - 전처리된 데이터
     * @param {number} participantCount - 참가자 수
     * @returns {Object} 차트 설정
     */
    _createConfiguration(processedData, participantCount) {
        const now = new Date();
        const dateStr = now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
        const maxScore = Math.max(...processedData.data);
        
        // 점수에 따른 적절한 X축 최대값 계산
        const xAxisMax = maxScore + Math.max(50, maxScore * 0.2); // 최대 점수의 20% 또는 최소 50의 여유
        
        // 점수에 따른 X축 눈금 간격 조정
        const stepSize = Math.max(10, Math.ceil(maxScore / 20));

        return {
            type: 'bar',
            data: {
                labels: processedData.labels,
                datasets: [{
                    label: 'Score',
                    data: processedData.data,
                    backgroundColor: processedData.colors,
                    borderColor: processedData.colors.map(color => {
                        if (typeof color === 'string' && color.startsWith('rgb')) {
                            return color.replace('rgb', 'rgba').replace(')', ', 0.6)');
                        }
                        return 'rgba(169, 169, 169, 0.6)';
                    }),
                }],
            },
            options: {
                responsive: false,
                indexAxis: 'y',
                layout: {
                    padding: {
                        top: 50,    
                        bottom: 20,
                        left: 20,
                        right: 50    // 데이터 레이블을 위한 여유 공간
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: [`Contribution Score by Participant`, `Generated at ${dateStr}`],
                        color: this.theme.chart.textColor,
                        font: this.config.fonts.title,
                        padding: {
                            top: 30,
                            bottom: 10
                        }
                    },
                    subtitle: {
                        display: true,
                        text: [`Total number of student : ${participantCount}`,
                            `F: featRatio / D: docRatio/ T: typoRatio/ I: Issue ratio`
                        ],
                        align: 'end',
                        color: this.theme.chart.textColor,
                        font: this.config.fonts.subtitle,
                        padding: {
                            top: 10,
                            bottom: 20
                        }
                    },
                    datalabels: {
                        color: this.theme.chart.textColor,
                        font: this.config.fonts.dataLabels,
                        anchor: 'end',
                        align: 'end',
                        offset: 4,
                        formatter: (value, context) => {
                            const index = context.dataIndex;
                            const original = processedData.originalScores[index];
                            if (!original) return value;
                        
                            const totalScore = parseInt(stripAnsi(original[6].toString()), 10);
                            const prFeat = parseInt(stripAnsi(original[1].toString()), 10);
                            const prDoc = parseInt(stripAnsi(original[2].toString()), 10);
                            const prTypo = parseInt(stripAnsi(original[3].toString()), 10);
                            const prIssue = parseInt(stripAnsi(original[4].toString()), 10);
                        
                            const featRatio = totalScore > 0 ? ((prFeat / totalScore) * 100).toFixed(0) : 0;
                            const docRatio = totalScore > 0 ? ((prDoc / totalScore) * 100).toFixed(0) : 0;
                            const typoRatio = totalScore > 0 ? ((prTypo / totalScore) * 100).toFixed(0) : 0;
                            const issueRatio = totalScore > 0 ? ((prIssue / totalScore) * 100).toFixed(0) : 0;

                            // 점수가 매우 높은 경우 표기 형식 간결화
                            if (maxScore > 200) {
                                return `${totalScore} | F${featRatio}%/D${docRatio}%/T${typoRatio}%/I${issueRatio}%`;
                            }
                            
                            return `${totalScore} | F ${featRatio}% / D ${docRatio}% / T ${typoRatio}% / I ${issueRatio}%`;
                        }                                                                      
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: this.theme.chart.gridColor
                        },
                        ticks: {
                            autoSkip: false,
                            color: this.theme.chart.textColor,
                            stepSize: stepSize  // 동적 눈금 간격
                        },
                        max: xAxisMax  // 동적 최대값
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: this.theme.chart.textColor
                        },
                        beginAtZero: true
                    }
                }
            }
        };
    }

    /**
     * 차트 생성 및 저장 - 동적 크기 조정 적용
     * @param {string} repoName - 저장소 이름
     * @param {Array} repoScores - 점수 데이터
     * @param {string} outputDir - 출력 디렉토리
     */
    async generateChart(repoName, repoScores, outputDir) {
        try {
            const sortedScores = [...repoScores].sort((a, b) => b[6] - a[6]);
            const participantCount = sortedScores.length;
            
            // 점수에 따른 동적 너비 계산
            const maxScore = Math.max(...sortedScores.map(score => score[6] || 0));
            const baseWidth = this.config.dimensions.width || 800;
            
            // 점수 100점당 100px 추가 (최소 기본 너비 유지)
            const additionalWidth = Math.max(0, Math.ceil((maxScore - 100) / 100)) * 100;
            const width = baseWidth + additionalWidth;
            
            // 참가자 수에 따른 높이 + 여유 공간
            const height = participantCount * this.config.dimensions.barHeight + 300;
            
            // 동적 크기의 캔버스 초기화
            const canvas = this._initializeCanvas(height, width);

            const cleanedScores = sortedScores.map(score => {
                const cleanedName = stripAnsi(score[0]);
                return [cleanedName, ...score.slice(1)];
            }); 

            const processedData = {
                labels: this._generateLabels(cleanedScores),
                data: this._extractScores(cleanedScores),
                colors: this._generateColors(this._extractScores(cleanedScores)),
                originalScores: cleanedScores
            };

            const configuration = this._createConfiguration(processedData, participantCount);
            const buffer = await canvas.renderToBuffer(configuration);
            
            const repoSpecificDir = path.join(outputDir, repoName);
            await fs.mkdir(repoSpecificDir, { recursive: true });
            const filePath = path.join(repoSpecificDir, `${repoName}_chart.png`);
            await fs.writeFile(filePath, buffer);
            log(`차트 이미지가 저장되었습니다: ${filePath}`);
        } catch (error) {
            log(`차트 생성 중 오류 발생: ${error.message}`, 'ERROR');
            throw error;
        }
    }
}