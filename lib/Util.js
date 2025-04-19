import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');
const CACHE_PATH = path.join(__dirname, '..', 'cache.json');

const LOG_LEVELS = {
    LOG: 0,    // 기본 로그 레벨
    DEBUG: 1,  // 디버깅용 상세 정보
    INFO: 2,   // 일반 정보
    WARN: 3,   // 경고
    ERROR: 4   // 에러
};

// 로그 레벨별 색상 및 스타일 정의
const LOG_COLORS = {
    ERROR: {
        bg: chalk.bgRed,
        fg: chalk.white,
        prefix: '🚨 '
    },
    WARN: {
        bg: chalk.bgYellow,
        fg: chalk.black,
        prefix: '⚠️ '
    },
    INFO: {
        fg: chalk.green,
        prefix: 'ℹ️ '
    },
    DEBUG: {
        fg: chalk.cyan,
        prefix: '🔍 '
    },
    LOG: {
        fg: chalk.white,
        prefix: '📝 '
    }
};

// 현재 활성화된 테마 저장 변수
let currentTextColor = '#212529'; // 기본 테마 텍스트 색상

// 테마 텍스트 색상 설정 함수
function setTextColor(color) {
    currentTextColor = color;
}

// 로그 메시지 포맷팅 함수
function formatLogMessage(level, message, timestamp) {
    const colors = LOG_COLORS[level] || LOG_COLORS.LOG;
    
    // ERROR와 WARN은 배경색 사용
    if (level === 'ERROR' || level === 'WARN') {
        return `${timestamp} ${colors.bg(colors.fg(`${colors.prefix}[${level}]`))} ${message}`;
    }
    
    // 나머지는 글자색만 사용
    return `${timestamp} ${colors.fg(`${colors.prefix}[${level}]`)} ${message}`;
}

function log(message, level = 'LOG') {
    // 대문자로 변환하여 일관성 유지
    level = level.toUpperCase();
    
    // 유효한 로그 레벨인지 확인
    if (!LOG_LEVELS.hasOwnProperty(level)) {
        level = 'LOG';
    }
    
    const now = new Date().toLocaleString('ko-KR', { 
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).replace(/\./g, '').replace(/\s+/g, ' ');
    
    // 테마 색상 적용 대신 로그 레벨별 색상 적용
    const formattedMessage = formatLogMessage(level, message, `[${now}]`);
    console.log(formattedMessage);
    
    return formattedMessage; // 테스트 및 체이닝을 위해 포맷팅된 메시지 반환
}

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

async function loadCache() {
    try {
        await fs.access(CACHE_PATH, fs.constants.R_OK);
        const data = await fs.readFile(CACHE_PATH, 'utf-8');
        return jsonToMap(JSON.parse(data));
    } catch {
        return null;
    }
}

async function saveCache(participantsMap) {
    const jsonData = mapToJson(participantsMap);
    await fs.writeFile(CACHE_PATH, JSON.stringify(jsonData, null, 2));
}

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

export {
    LOG_LEVELS,
    log,
    setTextColor,
    jsonToMap,
    mapToJson,
    loadCache,
    saveCache,
    updateEnvToken
};
