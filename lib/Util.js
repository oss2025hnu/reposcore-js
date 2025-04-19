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

// 현재 활성화된 테마 저장 변수
let currentTextColor = '#212529'; // 기본 테마 텍스트 색상

// 테마 텍스트 색상 설정 함수
function setTextColor(color) {
    currentTextColor = color;
}

function log(message, level = 'LOG') {
    const now = new Date().toLocaleString('ko-KR', { 
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).replace(/\./g, '').replace(/\s+/g, ' ');
    
    const levelPrefix = `[${level.toUpperCase()}]`;
    const formattedMessage = `[${now}] ${levelPrefix} ${message}`;
    
    // 테마에 따른 텍스트 색상 적용
    console.log(chalk.hex(currentTextColor)(formattedMessage));
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

// 뱃지 추가
export function getBadge(score) {
    const levels = [
      { min: 0, max: 9, emoji: '🌱', title: '새싹' },
      { min: 10, max: 19, emoji: '🌿', title: '성장중' },
      { min: 20, max: 29, emoji: '🌳', title: '나무' },
      { min: 30, max: 39, emoji: '🌲', title: '성숙한 나무' },
      { min: 40, max: 49, emoji: '🌴', title: '야자나무' },
      { min: 50, max: 59, emoji: '🎄', title: '크리스마스 트리' },
      { min: 60, max: 69, emoji: '🌸', title: '꽃' },
      { min: 70, max: 79, emoji: '🌺', title: '벚꽃' },
      { min: 80, max: 89, emoji: '🌹', title: '장미' },
      { min: 90, max: 99, emoji: '🌻', title: '해바라기' },
      { min: 100, max: Infinity, emoji: '☀️', title: '태양' },
    ];
    const badge = levels.find(l => score >= l.min && score <= l.max);
    return badge ? `${badge.emoji} ${badge.title}` : '';
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
