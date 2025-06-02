#!/usr/bin/env node

/* eslint-disable no-console */

import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

import dotenv from 'dotenv';
import {program, Option} from 'commander';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import RepoAnalyzer from './lib/analyzer.js';
import {jsonToMap, mapToJson, log, loadCache, saveCache, updateEnvToken, setTextColor} from './lib/Util.js';

import getRateLimit from './lib/checkLimit.js';
import ThemeManager from './lib/ThemeManager.js';

import { generateHTML } from './lib/htmlGenerator.js';
dotenv.config();


program
    .name('node index.js')
    .usage('[옵션] <저장소 경로..>')
    .helpOption('-h, --help', '도움말 보기')
    .addOption(
        new Option('-a, --api-key <token>', 'GitHub 액세스 토큰 (선택)')
    )
    .addOption(
        new Option('-o, --output <dir>', '결과 저장 폴더')
            .default('results')
    )
    .addOption(new Option('-f, --format <type>', '출력 형식')
        .choices(['text', 'table', 'chart', 'all'])
        .default('all')
    )
    .addOption(
        new Option('-c, --use-cache', '저장된 GitHub 데이터 사용')
    )
    .addOption(
        new Option('-u, --user-name', 'GitHub ID 대신 실명으로 표시 (user_info.json 파일 필수)')
    )
    .addOption(
        new Option('--check-limit', 'GitHub API 사용량 확인')
    )
    .option('-t, --theme <theme>', '분석 테마 설정 (default/dark)')
    .option('--create-theme <json>', '새 테마 생성 (JSON 형식)')
    .option('--threshold <score>', '특정 점수 이상인 참여자만 출력', parseInt)
    .option('--user <username>', '해당 사용자 결과만 표시')
    .arguments('<path..>', '저장소 경로 (예: user/repo)')
    .option('--colored-output', '색상이 포함된 텍스트 파일 출력');

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


const validFormats = ['text', 'table', 'chart', 'all']; // 수정: both -> all, text 추가
if (!validFormats.includes(options.format)) {
    console.error(`에러: 유효하지 않은 형식입니다: "${options.format}"\n사용 가능한 형식: ${validFormats.join(', ')}`);
    process.exit(1);
}


// 기존 실행 로직을 함수로 분리
async function main() {
    try {
        if (!program.args) {
            console.error('Error :  -r (--repo) 옵션을 필수로 사용하여야 합니다. 예) node index.js -r oss2025hnu/reposcore-js');
            program.help();
        }

        // 테마 매니저 초기화
        const themeManager = new ThemeManager();
        
        // 테마 관련 작업을 위한 비동기 대기
        await themeManager.loadThemes();
        
        // 테마 생성 옵션 처리
        if (options.createTheme) {
            try {
                const themeData = JSON.parse(options.createTheme);
                if (!themeData.name || !themeData.theme) {
                    console.error('테마 데이터 형식이 잘못되었습니다. {"name": "테마명", "theme": {...}} 형식이 필요합니다.', 'WARN');
                    process.exit(1);
                }
                themeManager.addTheme(themeData.name, themeData.theme);
                log(`'${themeData.name}' 테마가 성공적으로 생성되었습니다. 누락된 속성은 기본 테마에서 상속됩니다.`, 'INFO');
            } catch (error) {
                console.error('테마 생성 중 오류가 발생했습니다:', error.message);
                process.exit(1);
            }
        }
        
        // 현재 테마 로깅
        log(`현재 테마: '${themeManager.currentTheme}'`, 'INFO');

        // Initialize analyzer with repo path
        const token = options.apiKey || process.env.GITHUB_TOKEN;
        const analyzer = new RepoAnalyzer(program.args, token);
        analyzer.themeManager = themeManager; // 테마 매니저 설정

        // 기본 테마의 텍스트 색상 설정
        const currentTheme = themeManager.getCurrentTheme();
        if (currentTheme && currentTheme.colors) {
            setTextColor(currentTheme.colors.text);
        } else {
            log('경고: 기본 테마를 불러올 수 없습니다. 기본 텍스트 색상을 사용합니다.', 'WARN');
        }

        // API 토큰이 입력되었으면 .env에 저장 (이미 있지 않은 경우)
        if (options.apiKey) {
            try {
                await analyzer.validateToken();
                log('입력된 토큰이 유효합니다.', 'INFO');
                await updateEnvToken(options.apiKey);
            } catch (error) {
                throw new Error('입력된 토큰이 유효하지 않아 프로그램을 종료합니다.\n\n다음 사항을 확인해주세요:\n1. 토큰이 만료되지 않았는지 확인\n2. GitHub 설정에서 토큰의 권한이 올바르게 설정되어 있는지 확인\n3. 토큰 문자열이 정확하게 복사되었는지 확인\n\n문제가 지속되면 GitHub에서 새로운 토큰을 발급받아 사용해주세요.');
            }
        }


        const shouldUseCache = options.useCache;
        const cached = shouldUseCache ? await loadCache() : null;
        
        if (cached) {
            log("캐시 데이터를 불러왔습니다.", 'INFO');
            analyzer.participants = cached;
        } else {
            log(shouldUseCache ? "캐시 파일이 없어 데이터를 새로 수집합니다." : "캐시를 사용하지 않습니다. 데이터를 새로 수집합니다.", 'INFO');
            log("Collecting data...",);
            await analyzer.collectPRsAndIssues();
            await saveCache(analyzer.participants);
        }

        // Calculate scores
        let scoresMap = analyzer.calculateScores();
        let chartScoresMap = scoresMap; // 차트용 원본 데이터 보존

        // -u 옵션 선택시 실행 (실명 표시)
        if (options.userName) {
            log('Checking user_info.json for --user-name option...');
            try {
                await fs.access('user_info.json', fs.constants.R_OK);
                log('user_info.json found');
            } catch {
                log('user_info.json will be created during user info update');
            }
            
            // 차트용 데이터는 원본 유지
            chartScoresMap = new Map(scoresMap);
            
            // 텍스트/테이블용만 실명 변환
            await analyzer.updateUserInfo(scoresMap);
            scoresMap = await analyzer.transformUserIdToName(scoresMap);
            log('사용자 이름을 실명으로 변환 완료 (차트는 아이디 유지)', 'INFO');
        }

        let filteredScores = scoresMap;

        if (options.threshold !== undefined) {
            const filteredArray = Array.from(scoresMap).map(([repo, scoreList]) => {
                const filteredList = scoreList.filter(entry => entry[6] >= options.threshold);
                return [repo, filteredList];
            }).filter(([_, list]) => list.length > 0);
            
            filteredScores = new Map(filteredArray);
            console.log(`임계값 ${options.threshold} 이상인 참여자만 표시합니다.`);
        } else {
            filteredScores = scoresMap;
        }


       if (options.user) {
            const allScoresRaw = Array.from(scoresMap.entries()); // [repoName, [[user1], ...]]
            const userScores = new Map(); // username → { total: number, perRepo: Map }

            for (const [repoName, users] of allScoresRaw) {
                // 'total' 저장소는 합산에서 제외
                if (repoName.toLowerCase() === 'total') continue;

                for (const score of users) {
                    const username = score[0]?.toLowerCase();
                    const repoScore = score[6];
                    if (!username) continue;

                    if (!userScores.has(username)) {
                        userScores.set(username, { total: 0, perRepo: new Map() });
                    }

                    const entry = userScores.get(username);
                    entry.total += repoScore;
                    const repoKey = repoName.replace("oss2025hnu_", ""); // 깔끔하게
                    entry.perRepo.set(repoKey, repoScore);
                }
            }

            // 'total' 점수는 따로 perRepo에만 표시
            const totalRepo = allScoresRaw.find(([name]) => name.toLowerCase() === 'total');
            if (totalRepo) {
                for (const score of totalRepo[1]) {
                    const username = score[0]?.toLowerCase();
                    const totalScore = score[6];
                    if (!username || !userScores.has(username)) continue;

                    userScores.get(username).perRepo.set('total', totalScore);
                }
            }

            const targetKey = options.user.toLowerCase();
            const targetData = userScores.get(targetKey);
            if (!targetData) {
                console.log(`사용자 "${options.user}"를 찾을 수 없습니다.`);
                return;
            }

            const sorted = Array.from(userScores.entries())
                .sort((a, b) => b[1].total - a[1].total);
            const rank = sorted.findIndex(([name]) => name === targetKey) + 1;
            const totalUsers = sorted.length;

            // 출력
            console.log(`\n[${options.user}] 기여 정보`);
            console.log(`- total: ${targetData.perRepo.get('total') ?? targetData.total}`);
            console.log(`- 등수: ${rank}등 (전체 ${totalUsers}명 중)\n`);
            console.log(`저장소별 점수:`);

            for (const [repo, score] of targetData.perRepo.entries()) {
                if (repo === 'total') continue; // total은 위에서 출력했으므로 생략
                console.log(`- ${repo}: ${score}`);
            }

            return;
        }
        

        const averageScores = analyzer.calculateAverageScore(scoresMap);
        await fs.mkdir(options.output, { recursive: true });
        log(`총 ${program.args.length}개의 저장소 분석을 시작합니다.`, 'INFO');

        let totalEntry = null; // total 저장소 따로 저장

        for (const [repoName, scoreData] of filteredScores.entries()) {
            if (repoName === 'total') {
                totalEntry = { repoName, scoreData };
                continue; // total은 나중에 따로 처리
            }

            log("--------------------------------------------------", "INFO");
            log(`저장소 분석 시작: ${repoName}`, "INFO");

            const repoDir = path.join(options.output, repoName);
            const generatedFiles = [];

            if (['all', 'text'].includes(options.format)) {
                await analyzer.generateTable(new Map([[repoName, scoreData]]), options.output, options);
                generatedFiles.push(`${repoDir}/${repoName}.txt`);
            }

            if (['all', 'table'].includes(options.format)) {
                await analyzer.generateCsv(new Map([[repoName, scoreData]]), options.output);
                generatedFiles.push(`${repoDir}/${repoName}_data.csv`);
            }

            if (['all', 'chart'].includes(options.format)) {
                // 차트만 원본 아이디 데이터 사용
                const chartData = chartScoresMap.get(repoName) || scoreData;
                await analyzer.generateChart(new Map([[repoName, chartData]]), options.output);
                generatedFiles.push(`${repoDir}/${repoName}_chart.png`);
            }

            log(`  - ${repoName} 평균 점수: ${averageScores.get(repoName)?.toFixed(2) ?? 'N/A'}`, 'INFO');
            log('  - 결과 파일 생성:', 'INFO');
            for (const filePath of generatedFiles) {
                log(`    - ${filePath}`, 'INFO');
            }

            log(`✅ 저장소 분석 완료: ${repoName}`, 'INFO');
        }

        // 마지막에 total 저장소 처리
        if (totalEntry) {
            const { repoName, scoreData } = totalEntry;
            const repoDir = path.join(options.output, repoName);
            const generatedFiles = [];

            log("--------------------------------------------------", "INFO");
            log(`저장소 분석 시작: ${repoName}`, "INFO");

            if (['all', 'text'].includes(options.format)) {
                await analyzer.generateTable(new Map([[repoName, scoreData]]), options.output, options);
                generatedFiles.push(`${repoDir}/${repoName}.txt`);
            }

            if (['all', 'table'].includes(options.format)) {
                await analyzer.generateCsv(new Map([[repoName, scoreData]]), options.output);
                generatedFiles.push(`${repoDir}/${repoName}_data.csv`);
            }

            if (['all', 'chart'].includes(options.format)) {
                // 차트만 원본 아이디 데이터 사용
                const chartData = chartScoresMap.get(repoName) || scoreData;
                await analyzer.generateChart(new Map([[repoName, chartData]]), options.output);
                generatedFiles.push(`${repoDir}/${repoName}_chart.png`);
            }

            log(`  - ${repoName} 평균 점수: ${averageScores.get(repoName)?.toFixed(2) ?? 'N/A'}`, 'INFO');
            log('  - 결과 파일 생성:', 'INFO');
            for (const filePath of generatedFiles) {
                log(`    - ${filePath}`, 'INFO');
            }

            log(`✅ 저장소 분석 완료: ${repoName}`, 'INFO');
        }

        log("--------------------------------------------------", "INFO");
        log('모든 저장소 분석 완료.', 'INFO');


        // 모든 출력 형식이 "all" 인 경우에만 HTML 리포트 생성
        if (options.format === 'all') {
            // HTML 생성
            const repositories = process.argv.slice(2);
            const resultsDir = options.output; // 또는 'results'
            const htmlContent = await generateHTML(repositories, resultsDir);
            const htmlFilePath = path.join(resultsDir, 'index.html');

            // HTML 파일 저장
            await fs.writeFile(htmlFilePath, htmlContent);
            console.log(`HTML 보고서가 ${htmlFilePath}에 생성되었습니다.`);
        }
    } catch (error) {
        console.error(`\n⚠️ 오류가 발생했습니다 ⚠️\n\n${error.message}\n\n문제가 지속되면 GitHub 이슈를 생성하거나 관리자에게 문의해주세요.\n`);
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
