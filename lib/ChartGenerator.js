import fs from 'fs/promises';
import path from 'path';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { CHART_CONFIG } from './chartConfig.js';
import { log } from './Util.js';

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
     * 차트 캔버스 초기화
     * @returns {ChartJSNodeCanvas}
     */
    _initializeCanvas(height) {
        const { width } = this.config.dimensions;
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
            return `${name} (${currentRank}${suffix}) `;
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
            if (index === 0) return this.theme.chart.barColors.first;
            if (index === 1) return this.theme.chart.barColors.second;
            if (index === 2) return this.theme.chart.barColors.third;
            
            if (Array.isArray(this.theme.chart.barColors)) {
                const colorIndex = Math.min(10, Math.floor(score / 10));
                return this.theme.chart.barColors[colorIndex];
            }
            
            return this.theme.chart.barColors.others;
        });
    }

    /**
     * 차트 설정 생성
     * @param {Object} processedData - 전처리된 데이터
     * @param {number} participantCount - 참가자 수
     * @returns {Object} 차트 설정
     */
    _createConfiguration(processedData, participantCount) {
        const now = new Date();
        const dateStr = now.toLocaleString();
        const maxScore = Math.max(...processedData.data);

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
                plugins: {
                    title: {
                        display: true,
                        text: [`Contribution Score by Participant`, `Generated at ${dateStr}`],
                        color: this.theme.chart.textColor,
                        font: this.config.fonts.title
                    },
                    subtitle: {
                        display: true,
                        text: `Total number of student : ${participantCount}`,
                        align: 'end',
                        color: this.theme.chart.textColor,
                        font: this.config.fonts.subtitle,
                        padding: this.config.padding.subtitle
                    },
                    datalabels: {
                        color: this.theme.chart.textColor,
                        font: this.config.fonts.dataLabels,
                        anchor: 'end',
                        align: 'end',
                        offset: 4
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: this.theme.chart.gridColor
                        },
                        ticks: {
                            autoSkip: false,
                            color: this.theme.chart.textColor
                        },
                        max: maxScore + 20
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
     * 차트 생성 및 저장
     * @param {string} repoName - 저장소 이름
     * @param {Array} repoScores - 점수 데이터
     * @param {string} outputDir - 출력 디렉토리
     */
    async generateChart(repoName, repoScores, outputDir) {
        try {
            const sortedScores = [...repoScores].sort((a, b) => b[6] - a[6]);
            const participantCount = sortedScores.length;
            const height = participantCount * this.config.dimensions.barHeight;
            const canvas = this._initializeCanvas(height);

            const processedData = {
                labels: this._generateLabels(sortedScores),
                data: this._extractScores(sortedScores),
                colors: this._generateColors(this._extractScores(sortedScores))
            };

            const configuration = this._createConfiguration(processedData, participantCount);
            const buffer = await canvas.renderToBuffer(configuration);
            
            const filePath = path.join(outputDir, `${repoName}_chart.png`);
            await fs.writeFile(filePath, buffer);
            log(`차트 이미지가 저장되었습니다: ${filePath}`);
        } catch (error) {
            log(`차트 생성 중 오류 발생: ${error.message}`, 'ERROR');
            throw error;
        }
    }
} 