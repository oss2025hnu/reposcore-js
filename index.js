#!/usr/bin/env node

const { program } = require('commander');
const RepoAnalyzer = require('./lib/analyzer');
const { saveEnvToken, getEnvToken } = require('./lib/utils/env');
require('dotenv').config();

program
    .option('-a, --api-key <token>', 'Github Access Token (optional)')
    .option('-r, --repo <path>', 'Repository path (e.g., user/repo)')
    .option('-o, --output <dir>', 'Output directory', 'results')
    .option('-f, --format <type>', 'Output format (table, chart, both)', 'both');

program.parse(process.argv);
const options = program.opts();

(async () => {
    try {
        // -a 옵션으로 토큰을 등록한 경우, 저장 후 종료
        if (options.apiKey) {
            saveEnvToken(options.apiKey);
            console.log('✅ 토큰이 .env 파일에 저장되었습니다. 이제부터 -a 없이도 실행 가능합니다.');
            process.exit(0);
        }


        // 환경변수에서 토큰을 가져옴
        const tokenFromEnv = getEnvToken();

        if (!options.repo) {
            throw new Error('저장소 경로를 입력해주세요. 예: -r user/repo');
        }

        // 분석기 초기화
        const analyzer = new RepoAnalyzer(options.repo, tokenFromEnv);

        await analyzer.validateToken();

        // 데이터 수집
        console.log('Collecting data...');
        await analyzer.collectPRsAndIssues();

        // 점수 계산
        const scores = analyzer.calculateScores();

        // 출력 형식에 따라 결과 출력
        if (options.format === 'table' || options.format === 'both') {
            analyzer.generateTable(scores);
        }
        if (options.format === 'chart' || options.format === 'both') {
            await analyzer.generateChart(scores);
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
})();