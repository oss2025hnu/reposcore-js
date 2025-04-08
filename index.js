#!/usr/bin/env node
require('dotenv').config();

const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const RepoAnalyzer = require('./lib/analyzer');
const generateCsv = require('./lib/generateCsv');

const ENV_PATH = path.join(__dirname, '.env');

program
    .option('-a, --api-key <token>', 'Github Access Token (optional)')
    .option('-t, --text', 'Save table as text file')
    .option('-r, --repo <path>', 'Repository path (e.g., user/repo)')
    .option('-o, --output <dir>', 'Output directory', 'results')
    .option('-f, --format <type>', 'Output format (table, chart, both)', 'both');

program.parse(process.argv);
const options = program.opts();

(async () => {
    try {

        if (!options.repo) {
            console.error('Error :  -r (--repo) 옵션을 필수로 사용하여야 합니다. 예) node index.js -r oss2025hnu/reposcore-js');
            program.help();
            process.exit(1);
        }

        // API 토큰이 입력되었으면 .env에 저장 (이미 있지 않은 경우)
        if (options.apiKey) {
            const tokenLine = `GITHUB_TOKEN=${options.apiKey}`;
            let shouldWrite = true;

            if (fs.existsSync(ENV_PATH)) {
                const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
                if (envContent.includes('GITHUB_TOKEN=')) {
                    shouldWrite = false;
                    console.log('.env 파일에 이미 토큰이 등록되어 있습니다.');
                }
            }

            if (shouldWrite) {
                fs.appendFileSync(ENV_PATH, `${tokenLine}\n`);
                console.log('.env 파일에 토큰이 저장되었습니다.');
            }
        }

        // Initialize analyzer with repo path
        const token = options.apiKey || process.env.GITHUB_TOKEN;
        const analyzer = new RepoAnalyzer(options.repo, token);

        await analyzer.validateToken();

        // Collect data
        console.log('Collecting data...');
        await analyzer.collectPRsAndIssues();

        // Calculate scores
        const scores = analyzer.calculateScores();

        // Calculate AverageScore
        await analyzer.calculateAverageScore(scores);

        // Generate outputs based on format
        if (options.format === 'table' || options.format === 'both') {
            analyzer.generateTable(scores, options.text);
        }
        if (options.format === 'chart' || options.format === 'both') {
            await analyzer.generateChart(scores, options.output);
        }
        if (options.format === 'csv') {
            generateCsv(scores, options.output);
            console.log(`CSV 파일이 ${options.output}에 저장되었습니다.`);
        }

    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
})();