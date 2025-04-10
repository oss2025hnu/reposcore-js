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
    .option('-c, --use-cache', 'Use previously cached GitHub data');

program.parse(process.argv);
const options = program.opts();

const CACHE_PATH = path.join(__dirname, 'cache.json');

function loadCache() {
    if (fs.existsSync(CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    }
    return null;
}

function saveCache(participantsMap) {
    const obj = {};
    participantsMap.forEach((repoMap, repoName) => {
      obj[repoName] = Object.fromEntries(
        Array.from(repoMap.entries()).map(([user, data]) => [user, data])
      );
    });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(obj, null, 2));
}

// .env 업데이트 유틸리티 함수
function updateEnvVariable(key, newValue) {
    let updated = false;
    let content = '';

    if (fs.existsSync(ENV_PATH)) {
        content = fs.readFileSync(ENV_PATH, 'utf-8');
        const regex = new RegExp(`^${key}=.*$`, 'm');

        if (regex.test(content)) {
            const oldValue = content.match(regex)[0].split('=')[1];
            if (oldValue !== newValue) {
                content = content.replace(regex, `${key}=${newValue}`);
                updated = true;
            } else {
                console.log(`.env 파일에 이미 동일한 ${key} 값이 등록되어 있습니다.`);
            }
        } else {
            content += `\n${key}=${newValue}`;
            updated = true;
        }
    } else {
        content = `${key}=${newValue}`;
        updated = true;
    }

    if (updated) {
        fs.writeFileSync(ENV_PATH, content.trim() + '\n');
        console.log(`.env 파일이 업데이트되었습니다: ${key}`);
    }
}

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
            const { Octokit } = require('@octokit/rest');
            const testOctokit = new Octokit({ auth: options.apiKey });

            try {
                await testOctokit.rest.users.getAuthenticated();
                console.log('입력된 토큰이 유효합니다.');

                // .env 저장/업데이트 (유틸 함수 사용)
                updateEnvVariable('GITHUB_TOKEN', options.apiKey);

            } catch (error) {
                throw new Error('입력된 토큰이 유효하지 않아 프로그램을 종료합니다, 유효한 토큰인지 확인해주세요.');
            }
        }

        // Initialize analyzer with repo path
        const token = options.apiKey || process.env.GITHUB_TOKEN;
        const analyzer = new RepoAnalyzer(options.repo, token);

        await analyzer.validateToken();

        if (options.useCache) {
            const cached = loadCache();
            if (cached) {
                console.log("캐시 데이터를 불러왔습니다.");
                analyzer.participants = new Map(
                    Object.entries(cached).map(
                        ([repoName, repoMap]) =>
                            [repoName, new Map(Object.entries(repoMap))]
                    )
                );
            } else {
                console.log("캐시 파일이 없어 데이터를 새로 수집합니다.");
                console.log("Collecting data...");
                await analyzer.collectPRsAndIssues();
                saveCache(analyzer.participants);
            }
        } else {
            console.log("캐시를 사용하지 않습니다. 데이터를 새로 수집합니다.");
            console.log("Collecting data...");
            await analyzer.collectPRsAndIssues();
            saveCache(analyzer.participants);
        }

        // Calculate scores
        const scores = analyzer.calculateScores();

        // Calculate AverageScore
        analyzer.calculateAverageScore(scores);

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
