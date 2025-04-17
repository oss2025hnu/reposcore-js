#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import { program } from 'commander';
import { Octokit } from '@octokit/rest';

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

// ------------- JSON ↔ Map 변환 유틸리티 함수 -------------
function jsonToMap(jsonObj, depth = 0) {
    if (depth >= 2 || typeof jsonObj !== 'object' || jsonObj === null || Array.isArray(jsonObj)) {
        return jsonObj;
    }

    const map = new Map();
    for (const key of Object.keys(jsonObj)) {
        map.set(key, jsonToMap(jsonObj[key], depth + 1));
    }
    return map;
}

function mapToJson(map) {
    const obj = {};
    for (const [key, value] of map) {
        obj[key] = value instanceof Map ? mapToJson(value) : value;
    }
    return obj;
}
// ------------------------------------------------------------

async function loadCache() {
    try {
        await fs.access(CACHE_PATH, fs.constants.R_OK);
        const data = await fs.readFile(CACHE_PATH, 'utf-8');
        return jsonToMap(JSON.parse(data)); // 수정된 jsonToMap 함수 사용
    } catch {
        return null;
    }
}

async function saveCache(participantsMap) {
    const jsonData = mapToJson(participantsMap);
    await fs.writeFile(CACHE_PATH, JSON.stringify(jsonData, null, 2));
}

// .env 업데이트 유틸리티 함수
async function updateEnvToken(token) {
    const tokenLine = `GITHUB_TOKEN=${token}`;

    try {
        await fs.access(ENV_PATH, fs.constants.R_OK);

        const envContent = await fs.readFile(ENV_PATH, 'utf-8');
        const lines = envContent.split('\n');
        let tokenUpdated = false;
        let hasTokenKey = false;

        const newLines = lines.map(line => {
            if (line.startsWith('GITHUB_TOKEN=')) {
                hasTokenKey = true;
                const existingToken = line.split('=')[1];
                if (existingToken !== token) {
                    tokenUpdated = true;
                    return tokenLine;
                } else {
                    log('.env 파일에 이미 동일한 토큰이 등록되어 있습니다.');
                    return line;
                }
            }
            return line;
        });

        if (hasTokenKey && tokenUpdated) {
            await fs.writeFile(ENV_PATH, newLines.join('\n'));
            log('.env 파일의 토큰이 업데이트되었습니다.');
        }

        if (!hasTokenKey) {
            await fs.writeFile(ENV_PATH, `${tokenLine}\n`);
            log('.env 파일에 토큰이 저장되었습니다.');
        }
    } catch {
        await fs.writeFile(ENV_PATH, `${tokenLine}\n`);
        log('.env 파일이 생성되고 토큰이 저장되었습니다.');
    }
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


        // Initialize analyzer with repo path
        const token = options.apiKey || process.env.GITHUB_TOKEN;
        const analyzer = new RepoAnalyzer(options.repo, token);

        // API 토큰이 입력되었으면 .env에 저장 (이미 있지 않은 경우)
        if (options.apiKey) {
            try {
                await analyzer.validateToken();
                log('입력된 토큰이 유효합니다.');
                await updateEnvToken(options.apiKey);
            } catch (error) {
                throw new Error('입력된 토큰이 유효하지 않아 프로그램을 종료합니다, 유효한 토큰인지 확인해주세요.');
            }
        }

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