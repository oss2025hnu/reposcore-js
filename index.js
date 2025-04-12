#!/usr/bin/env node
require('dotenv').config();

const { program } = require('commander');
const RepoAnalyzer = require('./lib/analyzer');
const sqlite3 = require('sqlite3').verbose();

const fs = require('fs');
const path = require('path');
const ENV_PATH = path.join(__dirname, '.env');
const DB_PATH = path.join(__dirname, 'cache.db'); // SQLite 데이터베이스 파일 경로

program
    .option('-a, --api-key <token>', 'Github Access Token (optional)')
    .option('-t, --text', 'Save table as text file')
    .option('-r, --repo <path...>', 'Repository path (e.g., user/repo)')
    .option('-o, --output <dir>', 'Output directory', 'results')
    .option('-f, --format <type>', 'Output format (table, chart, both)', 'both')
    .option('-c, --use-cache', 'Use previously cached GitHub data');

program.parse(process.argv);
const options = program.opts();

// ------------- SQLite 캐시 유틸리티 함수 -------------
function initializeDatabase() {
    const db = new sqlite3.Database(DB_PATH);
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS cache (
                repo TEXT PRIMARY KEY,
                data TEXT
            )
        `);
    });
    db.close();
}

function saveCacheToDB(repo, data) {
    const db = new sqlite3.Database(DB_PATH);
    const jsonData = JSON.stringify(data);

    return new Promise((resolve, reject) => {
        db.run(
            `INSERT OR REPLACE INTO cache (repo, data) VALUES (?, ?)`,
            [repo, jsonData],
            (err) => {
                if (err) {
                    console.error('Error saving cache:', err.message);
                    reject(err);
                } else {
                    // 로그 출력 제거 또는 조건부 출력
                    if (process.env.NODE_ENV !== 'test') {
                        console.log(`캐시가 저장되었습니다: ${repo}`);
                    }
                    resolve();
                }
            }
        );
        db.close();
    });
}
// 수정된 loadCacheFromDB 함수
function loadCacheFromDB(repos) {
    const db = new sqlite3.Database(DB_PATH);
    const cachedData = new Map();

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            repos.forEach((repo) => {
                db.get(
                    `SELECT data FROM cache WHERE repo = ?`,
                    [repo],
                    (err, row) => {
                        if (err) {
                            console.error('Error loading cache:', err.message);
                            reject(err);
                        } else if (row) {
                            cachedData.set(repo, JSON.parse(row.data));
                        }
                    }
                );
            });

            db.close(() => resolve(cachedData));
        });
    });
}
// ------------------------------------------------------------

// .env 업데이트 유틸리티 함수
function updateEnvToken(token) {
    const tokenLine = `GITHUB_TOKEN=${token}`;

    if (fs.existsSync(ENV_PATH)) {
        const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
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
        fs.writeFileSync(ENV_PATH, `${tokenLine}\n`);
        console.log('.env 파일이 생성되고 토큰이 저장되었습니다.');
    }
}

const validFormats = ['table', 'chart', 'both'];
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

        // 데이터베이스 초기화
        initializeDatabase();

        // API 토큰이 입력되었으면 .env에 저장 (이미 있지 않은 경우)
        if (options.apiKey) {
            const { Octokit } = require('@octokit/rest');
            const testOctokit = new Octokit({ auth: options.apiKey });

            try {
                await testOctokit.rest.users.getAuthenticated();
                console.log('입력된 토큰이 유효합니다.');
                updateEnvToken(options.apiKey);
            } catch (error) {
                throw new Error('입력된 토큰이 유효하지 않아 프로그램을 종료합니다, 유효한 토큰인지 확인해주세요.');
            }
        }

        // Initialize analyzer with repo path
        const token = options.apiKey || process.env.GITHUB_TOKEN;
        const analyzer = new RepoAnalyzer(options.repo, token);

        await analyzer.validateToken();

        if (options.useCache) {
            const cachedData = await loadCacheFromDB(options.repo); // 비동기 방식으로 캐시 데이터 로드
            if (cachedData.size > 0) {
                console.log("캐시 데이터를 불러왔습니다.");
                analyzer.participants = cachedData; // 캐시 데이터를 그대로 할당
            } else {
                console.log("지정된 리포지토리에 해당하는 캐시 데이터가 없습니다. 데이터를 새로 수집합니다.");
                console.log("Collecting data...");
                await analyzer.collectPRsAndIssues();
                options.repo.forEach(repo => saveCacheToDB(repo, analyzer.participants.get(repo)));
            }
        } else {
            console.log("캐시를 사용하지 않습니다. 데이터를 새로 수집합니다.");
            console.log("Collecting data...");
            await analyzer.collectPRsAndIssues();
            options.repo.forEach(repo => saveCacheToDB(repo, analyzer.participants.get(repo)));
        }

        // Calculate scores
        const scores = analyzer.calculateScores();

        // Calculate AverageScore
        analyzer.calculateAverageScore(scores);

        // 디렉토리 생성
        if (!fs.existsSync(options.output)) {
            fs.mkdirSync(options.output);
        }

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
}

// 실행 여부 확인 및 모듈 내보내기 추가
if (require.main === module) {
  main(); // 실행 로직 호출
}

// 테스트를 위한 모듈 내보내기
module.exports = {
  initializeDatabase,
  saveCacheToDB,
  loadCacheFromDB,
  updateEnvToken,
};