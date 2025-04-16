# 디버깅 및 로깅 가이드

이 문서는 `reposcore-js` 프로젝트에서 문제 해결과 디버깅을 위한 로깅 설정, 디버깅 모드 활성화, 오류 추적 방법을 설명합니다. 신규 기여자들이 빠르게 문제를 파악하고 해결할 수 있도록 돕는 것이 목표입니다.

## 기본 로깅 설정

프로젝트는 `lib/Util.js`의 `log` 함수를 사용해 주요 동작을 기록합니다. 기본적으로 `console.log`를 래핑하며, 간단한 메시지 출력을 제공합니다.

### 설정 방법

1. **기본 사용**:
   - `index.js`에서 `log` 함수를 임포트해 사용:
     ```javascript
     import { log } from './lib/Util.js';
     log('Collecting data...');
     ```
   - 출력은 터미널에 표시되며, 추가 설정 없이 즉시 사용 가능.

2. **로그 포맷**:
   - 현재는 단순 텍스트 출력. 타임스탬프나 로그 레벨을 추가하려면 `lib/Util.js` 수정 가능:
     ```javascript
     export function log(message) {
         console.log(`[${new Date().toISOString()}] ${message}`);
     }
     ```
   - 예시 출력:
     ```
     [2025-04-16T12:00:00.000Z] Collecting data...
     ```

3. **외부 라이브러리**:
   - 복잡한 로깅이 필요하면 `winston` 또는 `pino` 추천:
     ```bash
     npm install winston
     ```
     ```javascript
     import winston from 'winston';
     const logger = winston.createLogger({
         level: 'info',
         format: winston.format.combine(
             winston.format.timestamp(),
             winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
         ),
         transports: [new winston.transports.Console()]
     });
     logger.info('Collecting data...');
     ```
   - `package.json`에 의존성 추가 필수.

## 디버깅 모드 활성화

디버깅 모드를 활성화하면 상세 로그를 확인할 수 있습니다. 환경 변수를 통해 로그 레벨을 제어합니다.

### 설정 방법

1. **환경 변수 설정**:
   - `.env` 파일에 `DEBUG_LEVEL` 추가:
     ```env
     DEBUG_LEVEL=debug
     ```
   - 또는 명령줄에서 실행:
     ```bash
     DEBUG_LEVEL=debug node index.js -r oss2025hnu/reposcore-js
     ```

2. **로그 레벨 구현**:
   - `lib/Util.js`에 로그 레벨 로직 추가 예시:
     ```javascript
     const DEBUG_LEVEL = process.env.DEBUG_LEVEL || 'info';
     export function log(message, level = 'info') {
         if (level === 'debug' && DEBUG_LEVEL !== 'debug') return;
         console.log(`[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}`);
     }
     ```
   - 사용:
     ```javascript
     log('API request sent', 'debug');
     log('Data collected');
     ```
   - `DEBUG_LEVEL=debug`일 때만 `debug` 레벨 로그 출력.

3. **효과**:
   - 디버깅 모드에서는 API 호출, 데이터 처리 단계 등 세부 정보 확인 가능.
   - 예: `index.js`의 `collectPRsAndIssues` 호출 시 상세 로그 출력.

## 오류 추적 및 해결

오류 발생 시 로그를 통해 문제를 추적하고 해결하는 방법을 설명합니다.

### 절차

1. **오류 메시지 확인**:
   - 터미널에서 `console.error` 출력 확인:
     ```bash
     node index.js -r oss2025hnu/reposcore-js
     ```
     ```
     Error: Invalid token provided
     ```
   - `index.js`의 `try-catch` 블록에서 오류 캡처:
     ```javascript
     try {
         await analyzer.validateToken();
     } catch (error) {
         console.error(`Error: ${error.message}`);
         process.exit(1);
     }
     ```

2. **스택 트레이스 활용**:
   - 상세 오류를 보려면 `error.stack` 출력:
     ```javascript
     console.error(error.stack);
     ```
   - 예시 출력:
     ```
     Error: Invalid token
         at RepoAnalyzer.validateToken (/path/to/analyzer.js:50:13)
         at main (/path/to/index.js:100:15)
     ```

3. **GitHub API 오류**:
   - `octokit` 호출 실패 시 HTTP 상태 코드 확인:
     ```javascript
     try {
         await octokit.rest.users.getAuthenticated();
     } catch (error) {
         log(`API error: ${error.status} - ${error.message}`, 'debug');
         throw new Error('Invalid token');
     }
     ```
   - 일반적인 오류:
     - `401 Unauthorized`: 토큰 무효.
     - `403 Forbidden`: API 한도 초과.

4. **해결 방법**:
   - **토큰 문제**:
     ```bash
     node index.js -r oss2025hnu/reposcore-js -a <new-token>
     ```
   - **캐시 문제**:
     ```bash
     rm cache.json
     node index.js -r oss2025hnu/reposcore-js
     ```
   - **의존성 오류**:
     ```bash
     npm install
     ```

## 디버깅 팁 및 주의사항

### 예제: 캐시 로드 오류 디버깅

**상황**: `cache.json` 로드 실패.

**코드**:
```javascript
async function loadCache() {
    try {
        await fs.access(CACHE_PATH, fs.constants.R_OK);
        const data = await fs.readFile(CACHE_PATH, 'utf-8');
        log('Cache loaded', 'debug');
        return jsonToMap(JSON.parse(data));
    } catch (error) {
        log(`Cache load failed: ${error.message}`, 'debug');
        return null;
    }
}
```

**디버깅**:
```bash
DEBUG_LEVEL=debug node index.js -r oss2025hnu/reposcore-js --use-cache
```
```
[2025-04-16T12:00:00.000Z] DEBUG: Cache load failed: ENOENT: no such file
```
- **해결**: `cache.json` 없으면 새로 생성:
  ```bash
  node index.js -r oss2025hnu/reposcore-js
  ```

### 팁

1. **Node.js 디버거**:
   - 실행:
     ```bash
     node --inspect index.js -r oss2025hnu/reposcore-js
     ```
   - VS Code에서 `Attach to Node Process`로 디버깅.

2. **환경 변수 확인**:
   - `.env` 파일 누락 시:
     ```bash
     echo "GITHUB_TOKEN=your-token" > .env
     ```

3. **로그 파일 저장**:
   - 터미널 출력 저장:
     ```bash
     node index.js -r oss2025hnu/reposcore-js > debug.log 2>&1
     ```

### 주의사항

- **토큰 보안**:
  - `.env` 파일을 `.gitignore`에 추가 확인.
- **캐시 무효화**:
  - 오래된 `cache.json`은 오류 원인. 정기적으로 삭제.
- **의존성**:
  - `npm install` 후 `package-lock.json` 커밋 금지.