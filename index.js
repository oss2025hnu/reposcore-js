#!/usr/bin/env node
require('dotenv').config();

const { program } = require('commander');
const RepoAnalyzer = require('./lib/analyzer');


const fs = require('fs');
const path = require('path');
const ENV_PATH = path.join(__dirname, '.env');

program
    .option('-a, --api-key <token>', 'Github Access Token (optional)')
    .option('-t, --text', 'Save table as text file')
    .option('-r, --repo <path...>', 'Repository path (e.g., user/repo)')
    .option('-o, --output <dir>', 'Output directory', 'results')
    .option('-f, --format <type>', 'Output format (table, chart, both)', 'both');

program.parse(process.argv);
const options = program.opts();

(async () => {
    try {

        if (!options.repo) {
            console.error('Error :  -r (--repo) 옵션을 필수로 사용하여야 합니다. 예) node index.js -r oss2025hnu/reposcore-js');
            program.help();
        }

        // API 토큰이 입력되었으면 .env에 저장 (이미 있지 않은 경우)
        if (options.apiKey) {
            const tokenLine = `GITHUB_TOKEN=${options.apiKey}`;

            let existingToken = null;
            if (fs.existsSync(ENV_PATH)) {
                const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
                const match = envContent.match(/^GITHUB_TOKEN=(.*)$/m);
                if (match) {
                    existingToken = match[1].trim();
                }
            }

            if (existingToken === options.apiKey) {
                console.log('.env 파일에 입력한 토큰과 동일한 토큰이 이미 저장되어 있습니다.');
            } else {
                fs.writeFileSync(ENV_PATH, `${tokenLine}\n`);
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
            console.log(`CSV 파일이 ${options.output}에 저장하는 기능은 아직 구현되지 않았습니다.`);
        }

    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
})();
