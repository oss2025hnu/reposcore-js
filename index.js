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
    .option('-f, --format <type>', 'Output format (table, chart, both)', 'both')

program.parse(process.argv);
const options = program.opts();

const validFormats = ['table', 'chart', 'both'];
if (!validFormats.includes(options.format)) {
  console.error(`Error : Invalid format: "${options.format}"\nValid formats are: ${validFormats.join(', ')}`);
  process.exit(1);
}

(async () => {
    try {

        if (!options.repo) {
            console.error('Error :  -r (--repo) 옵션을 필수로 사용하여야 합니다. 예) node index.js -r oss2025hnu/reposcore-js');
            program.help();
        }

        // API 토큰이 입력되었으면 .env에 저장 (이미 있지 않은 경우)
        if (options.apiKey) {
            const tokenLine = `GITHUB_TOKEN=${options.apiKey}`;

            // 토큰 유효성 검증
            const { Octokit } = require('@octokit/rest');
            const testOctokit = new Octokit({ auth: options.apiKey });

            try {
                await testOctokit.rest.users.getAuthenticated();
                console.log('입력된 토큰이 유효합니다.');

                if (fs.existsSync(ENV_PATH)) {
                    const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
                    const lines = envContent.split('\n');
                    let tokenUpdated = false;
                    let hasTokenKey = false;

                    const newLines = lines.map(line => {
                        if (line.startsWith('GITHUB_TOKEN=')) {
                            hasTokenKey = true;
                            const existingToken = line.split('=')[1];
                            if (existingToken !== options.apiKey) {
                                tokenUpdated = true;
                                return tokenLine;
                            } else {
                                console.log('.env 파일에 이미 동일한 토큰이 등록되어 있습니다.');
                                return line;
                            }
                        }
                        return line;
                    });

                    if (hasTokenKey && tokenUpdated) {
                        fs.writeFileSync(ENV_PATH, newLines.join('\n'));
                        console.log('.env 파일의 토큰이 업데이트되었습니다.');
                    }

                    if (!hasTokenKey) {
                        fs.appendFileSync(ENV_PATH, `${tokenLine}\n`);
                        console.log('.env 파일에 토큰이 저장되었습니다.');
                    }

                } else {
                    // .env 파일이 아예 없는 경우
                    fs.writeFileSync(ENV_PATH, `${tokenLine}\n`);
                    console.log('.env 파일이 생성되고 토큰이 저장되었습니다.');
                }

            } catch (error) {
                throw new Error('입력된 토큰이 유효하지 않아 프로그램을 종료합니다, 유효한 토큰인지 확인해주세요.');
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
            analyzer.generateCsv(scores, options.output);
        }
        if (options.format === 'chart' || options.format === 'both') {
            await analyzer.generateChart(scores, options.output);
        }

    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
})();
