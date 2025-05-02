#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

import dotenv from 'dotenv';
import {program, Option} from 'commander';

import RepoAnalyzer from './lib/analyzer.js';
import {jsonToMap, mapToJson, log, loadCache, saveCache, updateEnvToken, setTextColor} from './lib/Util.js';

import getRateLimit from './lib/checkLimit.js';
import ThemeManager from './lib/ThemeManager.js';

import { generateHTML } from './lib/htmlGenerator.js';

dotenv.config();

program
    .name('node index.js')
    .addOption(
        new Option('-a, --api-key <token>', 'Github Access Token (optional)')
    )
    /*.addOption(
        new Option('-r, --repo <path...>', 'Repository path (e.g., user/repo)')
    )*/
    .addOption(
        new Option('-o, --output <dir>', 'Output directory')
            .default('results')
    )
    .addOption(new Option('-f, --format <type>', 'Output format ')
        .choices(['text', 'table', 'chart', 'all'])
        .default('all')
    )
    .addOption(
        new Option('-c, --use-cache', 'Use previously cached GitHub data')
    )
    .addOption(
        new Option('-u, --user-name', 'Display user\'s real name')
    )
    .addOption(
        new Option('--check-limit', 'Check GitHub API rate limit')
    )
    .option('-t, --theme <theme>', 'Set theme for analysis (default/dark)')
    .option('--create-theme <json>', '새 테마 생성 (JSON 형식)')
    .option('--change-theme <name>', '사용할 테마 선택 (default, dark, 또는 커스텀 테마)')
    .arguments('<path..>','Repository path (e.g., user/repo)');

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

        // 테마 변경 옵션 처리
        if (options.changeTheme) {
            const success = themeManager.setTheme(options.changeTheme);
            if (!success) {
                console.error(`유효하지 않은 테마: ${options.changeTheme}`);
                console.log(`사용 가능한 테마: ${themeManager.getAvailableThemes().join(', ')}`, 'INFO');
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
        const scores = analyzer.calculateScores();

        // -u 옵션 선택시 실행
        let realNameScore;
        if (options.userName) {
            log('Checking user_info.json for --user-name option...');
            try {
                await fs.access('user_info.json', fs.constants.R_OK);
                log('user_info.json found');
            } catch {
                log('user_info.json will be created during user info update');
            }
            await analyzer.updateUserInfo(scores);
            realNameScore = await analyzer.transformUserIdToName(scores);
        }

        // csv, png, txt를 포함하여 html 생성
        if (options.format === 'all') {
            await analyzer.generateTable(realNameScore || scores || [], options.output);
            await analyzer.generateCsv(realNameScore || scores || [], options.output);
            await analyzer.generateChart(realNameScore || scores || [], options.output);
        }

        // Calculate AverageScore
        analyzer.calculateAverageScore(scores);

        // 디렉토리 생성
        await fs.mkdir(options.output, {recursive: true});

        // Generate outputs based on format
        if (['all', 'text'].includes(options.format)) {
            await analyzer.generateTable(realNameScore || scores || [], options.output);
        }
        if (['all', 'table'].includes(options.format)) {
            await analyzer.generateCsv(realNameScore || scores || [], options.output);
        }
        if (['all', 'chart'].includes(options.format)) {
            await analyzer.generateChart(realNameScore || scores || [], options.output);
        }

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
