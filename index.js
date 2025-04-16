#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import { program } from 'commander';

import RepoAnalyzer from './lib/analyzer.js';
import { log } from './lib/Util.js';

import getRateLimit from './lib/checkLimit.js';

dotenv.config();

const ENV_PATH = path.join(import.meta.dirname, '.env');
const CACHE_PATH = path.join(import.meta.dirname, 'cache.json');

program
    .option('-a, --api-key <token>', 'Github Access Token (optional)')
    // .option('-t, --text', 'Save table as text file') // 제거: --format text로 통합
    .option('-r, --repo <path...>', 'Repository path (e.g., user/repo)')
    .option('-o, --output <dir>', 'Output directory', 'results')
    .option('-f, --format <type>', 'Output format (text, table, chart, all)', 'all') // 수정: both -> all, text 추가
    .option('-c, --use-cache', 'Use previously cached GitHub data')
    .option('-u, --user-name', 'Display user`s real name')
    .option('--check-limit', 'Check GitHub API rate limit')

program.parse(process.argv);
const options = program.opts();

if (options.checkLimit) {
  const apiKey = options.apiKey || process.env.GITHUB_TOKEN;
  if (!apiKey) {
    console.error('GITHUB_TOKEN이 필요합니다. --api-key 옵션 또는 .env에 설정하세요.');
    process.exit(1);
  }

  await getRateLimit(apiKey); // checkLimit 기능 실행
  process.exit(0); // 분석 로직 타지 않고 종료
}

//repo 옵션 검사
if (!options.repo) {
  console.error('-r (--repo) 옵션은 필수입니다.');
  program.help();
  process.exit(1);
}

const validFormats = ['text', 'table', 'chart', 'all']; // 수정: both -> all, text 추가
if (!validFormats.includes(options.format)) {
  console.error(`Error : Invalid format: "${options.format}"\nValid formats are: ${validFormats.join(', ')}`);
  process.exit(1);
}

// 기존 실행 로직을 함수로 분리
async function main() {
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
                log('입력된 토큰이 유효합니다.');
                await updateEnvToken(options.apiKey);
            } catch (error) {
                throw new Error('입력된 토큰이 유효하지 않아 프로그램을 종료합니다, 유효한 토큰인지 확인해주세요.');
            }
        }

        // Initialize analyzer with repo path
        const token = options.apiKey || process.env.GITHUB_TOKEN;
        const analyzer = new RepoAnalyzer(options.repo, token);

        await analyzer.validateToken();

        if (options.useCache) {
            const cached = await loadCache();
            if (cached) {
                log("캐시 데이터를 불러왔습니다.");
                analyzer.participants = cached; // 캐시 데이터를 그대로 할당
            } else {
                log("캐시 파일이 없어 데이터를 새로 수집합니다.");
                log("Collecting data...");
                await analyzer.collectPRsAndIssues();
                await saveCache(analyzer.participants);
            }
        } else {
            log("캐시를 사용하지 않습니다. 데이터를 새로 수집합니다.");
            log("Collecting data...");
            await analyzer.collectPRsAndIssues();
            await saveCache(analyzer.participants);
        }

        // Calculate scores
        const scores = analyzer.calculateScores();

        // -u 옵션 선택시 실행
        let realNameScore;
        if (options.userName){
            await analyzer.updateUserInfo(scores);
            realNameScore = await analyzer.transformUserIdToName(scores);
        }

        // Calculate AverageScore
        analyzer.calculateAverageScore(scores);

        // 디렉토리 생성
        await fs.mkdir(options.output, { recursive: true });

        // Generate outputs based on format
        if (options.format === 'text' || options.format === 'table' || options.format === 'all') {
            if (options.userName){
                await analyzer.generateTable(realNameScore, options.format === 'text' || options.format === 'all');
                if (options.format === 'table' || options.format === 'all') {
                    await analyzer.generateCsv(realNameScore, options.output);
                }
            }
            else{
                await analyzer.generateTable(scores, options.format === 'text' || options.format === 'all');
                if (options.format === 'table' || options.format === 'all') {
                    await analyzer.generateCsv(scores, options.output);
                }
            }
        }
        if (options.format === 'chart' || options.format === 'all') {
            await analyzer.generateChart(scores, options.output);
        }

    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

// 실행 여부 확인 및 모듈 내보내기 추가
if (fileURLToPath(import.meta.url) === process.argv[1]) {
    main(); // 실행 로직 호출
}

// 테스트를 위한 모듈 내보내기
export {
    jsonToMap,
    mapToJson,
    loadCache,
    saveCache,
    updateEnvToken,
};