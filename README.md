# reposcore-js
A CLI for scoring student participation in an open-source class repo, implemented in JavaScript (Node.js).

>
> **주의사항**
> - 절대로 `README.md`의 내용을 직접 수정하지 말 것! (템플릿에서 자동으로 생성하는 기능 포함됨)
> - 반드시 `Readme_Template.md`의 내용을 수정한 후 `node lib/GenerateReadme.js` 실행하여 `READ.md`의 내용을 최신화 해야 함.
>

## Install dependencies
```bash
npm install
```

## Usage
아래는 `node index.js -h` 또는 `node index.js --help` 실행 결과를 붙여넣은 것이므로
명령줄 관련 코드가 변경되면 아래 내용도 그에 맞게 수정해야 함.

```


Usage: node index.js [옵션] <저장소 경로..>

Options:
  -a, --api-key <token>  GitHub 액세스 토큰 (선택)
  -o, --output <dir>     결과 저장 폴더 (default: "results")
  -f, --format <type>    출력 형식 (choices: "text", "table", "chart", "all",
                         default: "all")
  -c, --use-cache        저장된 GitHub 데이터 사용
  -u, --user-name        사용자 실명 표시
  --check-limit          GitHub API 사용량 확인
  -t, --theme <theme>    분석 테마 설정 (default/dark)
  --create-theme <json>  새 테마 생성 (JSON 형식)
  --change-theme <name>  사용할 테마 선택 (default, dark, 또는 사용자 정의)
  --threshold <score>    특정 점수 이상인 참여자만 출력
  --user <username>      해당 사용자 결과만 표시
  --colored-output       색상이 포함된 텍스트 파일 출력
  -h, --help             도움말 보기


```
## `package-lock.json` 커밋 금지 안내
GitHub Codespaces에서 본 프로젝트를 열면 `npm install`이 자동으로 실행되며, 이 과정에서 `package-lock.json` 파일이 자동 생성됩니다.
이 파일은 프로젝트 버전 관리에 포함되지 않아야 하므로, 절대 커밋하지 말아야 합니다.

**커밋 시 `package-lock.json` 제외하는 방법**

- 커밋할 파일을 명시적으로 지정하는 방법:

    ```bash
    git add index.js analyzer.js package.json
    ```
- 또는 `package-lock.json`이 이미 생성된 경우:

    ```bash
    rm package-lock.json               # 파일 삭제
    git restore --staged package-lock.json  # 스테이징 영역에서 제외
    ```
- 예외로 `package-lock.json` 이나 `result.png` 등 temp파일들을 삭제하는 방법:
    
    ```bash
    npm run clean
    ```

## 의존성 관리 주의사항
새로운 라이브러리를 설치할 경우, package.json 파일에도 반드시 해당 라이브러리 정보를 추가해 주세요.
이는 협업 중 발생할 수 있는 실행 오류를 방지하고, 의존성 관리를 원활하게 하기 위한 필수 절차입니다.

package.json은 프로젝트에서 사용하는 외부 라이브러리(의존성) 정보를 정리해 놓은 설정 파일입니다.
이 파일에 정보가 누락되면, 다른 기여자들이 프로젝트를 실행할 때 오류가 발생할 수 있습니다.

## 유틸리티 함수 (`Util.js`)
이 프로젝트에서는 코드의 가독성과 유지보수를 위해, 직접적인 로직이나 핵심 기능에 영향을 주지 않는 공통적인 유틸리티 함수들을 별도의 파일인 Util.js에 분리하여 관리합니다.

## 코드 검사 (Lint)

ESLint 설정이 적용되어 있습니다. 다음 명령어로 검사할 수 있습니다:

```bash
npm run lint
```

JSLint 설정이 적용되어 있습니다. 다음 명령어로 검사할 수 있습니다:

```bash
npm run lint:jslint
```

## --check-limit
`--check-limit`은 자신의 GitHub API한도를 알 수 있는 명령어입니다. 터미널(콘솔)에 자신의 남은 API 요청 수,전체 한도,리셋 시간이 출력됩니다.

터미널에서 사용 할 때 : `node index.js --check-limit` (항상 동작하는 명령어)

## index.js 설명

`index.js`는 `reposcore-js` 저장소의 메인 실행 파일로, CLI 명령어를 처리하고 전체 분석 과정을 총괄하고 있습니다.

`reposcore-js` 저장소에서 명령어 실행 시 가장 먼저 실행되는 파일입니다.


## Score Formula
아래는 PR 개수와 이슈 개수의 비율에 따라 점수로 인정가능한 최대 개수를 구하고 각 배점에 따라 최종 점수를 산출하는 공식이다.

- $P_{fb}$ : 기능 또는 버그 관련 Merged PR 개수 (**3점**) ($P_{fb} = P_f + P_b$)  
- $P_d$ : 문서 관련 Merged PR 개수 (**2점**)  
- $P_t$: 오타 수정 PR 개수 (**1점**)  
- $I_{fb}$ : 기능 또는 버그 관련 Open 또는 해결된 이슈 개수 (**2점**) ($I_{fb} = I_f + I_b$)  
- $I_d$ : 문서 관련 Open 또는 해결된 이슈 개수 (**1점**)

$P_{\text{valid}} = P_{fb} + \min(P_d+P_t, 3 \times \max(P_{fb},1)) ~~\quad$ 점수 인정 가능 PR 개수\
$I_{\text{valid}} = \min(I_{fb} + I_d, 4 \times P_{\text{valid}}) \quad$ 점수 인정 가능 이슈 개수

PR의 점수를 최대로 하기 위해 기능/버그 PR을 먼저 계산한 후 문서 PR을 계산합니다.

$P_{fb}^* = \min(P_{fb}, P_{\text{valid}}) \quad$ 기능/버그 PR 최대 포함\
$P_d^* = \min(P_d, P_{\text{valid}} - P_{fb}^* ) \quad$ 남은 개수에서 문서 PR 포함\
$P_t^* = \max(0, P_{\text{valid}} - P_{fb}^* - P_d^*)\quad$ 남은 개수에서 오타 PR 포함

이슈의 점수를 최대로 하기 위해 기능/버그 이슈를 먼저 계산한 후 문서 이슈를 계산합니다.

$I_{fb}^* = \min(I_{fb}, I_{\text{valid}}) \quad$ 기능/버그 이슈 최대 포함\
$I_d^* = I_{\text{valid}} - I_{fb}^* ~~\quad$ 남은 개수에서 문서 이슈 포함

최종 점수 계산 공식:\
$S = 3P_{fb}^* + 2P_d^* + 1P_t^* + 2I_{fb}^* + 1I_d^*$

## 토큰 실행 및 기여도 점수 확인 방법

1. 토큰 실행 방법 (API KEY 포함)
- 입력하는 곳-> 터미널에서 아래에 있는 명령어를 복사 및 붙여넣기
- 처음 실행 시에는 아래와 같이 토큰을 함께 입력해야 함:
```bash
node index.js -a ghp_ABC123ABC123 oss2025hnu/reposcore-js 
```
- 위 명령어 실행 시 .env 파일이 자동 생성되며, 입력한 토큰이 로컬 환경에 저장됨
- -env 파일이 생성된 이후에는 아래 명령어로 토큰 없이도 실행이 가능.

```bash
node index.js oss2025hnu/reposcore-js
```
--use-cache 옵션 사용 시, 기존 cache.json 데이터를 활용해 속도 향상.

- 만약 캐시 파일이 없거나 손상된 경우, 새로운 데이터를 자동으로 가져옴

2. 기여도 점수 확인
- 1번 항목의 예시 명령어처럼 한 개의 저장소 링크만 인자로 사용
- 모든 저장소의 통합 기여도 점수 확인방법: 아래 명령어로 확인 가능

```bash
node index.js oss2025hnu/reposcore-js oss2025hnu/reposcore-py oss2025hnu/reposcore-cs
```

실행하면 results/ 폴더에서 확인할 수 있습니다. 결과물은 아래와 같습니다.
- index.html : 통합 리포트인 html 형식 웹 파일
- table.csv : 기여도 점수의 csv 파일
- table.txt : 기여도 점수의 txt 형식 텍스트 표 파일
- table.png : 기여도 점수의 png 형식 사진 파일
- total.* : 각 저장소 기여도 점수 파일을 같은 형식끼리 모두 통합한 파일

3. 기여도 점수 등수 표기
공동 순위제: 동일 점수는 같은 등수, 이후 순위는 인원 수만큼 건너뜁니다.


## 유닛 테스트 명령어
Test
이 저장소에서 기본적인 동작 이상 여부를 테스트하기 위한 자동화된 테스트 스위트를 사용할 수 있습니다.
현재 PR오류로 인해 작동이 아직은 안되므로, 업데이트가 되면 Readme DOC를 수정할 예정입니다.

```bash
npm run test
```
## 📚 가이드 문서 모음

### [Github API 가이드](docs/github-api-guide.md)

### [결과 리포트(index.html) 확인 가이드](docs/view_results_guide.md)
- 결과 리포트(index.html) 확인 방법

### [프로젝트 가이드라인](docs/project_guidelines.md)
- 프로젝트 참여 규칙 요약

### [포크 동기화 가이드](docs/fork_sync_guide.md)
- fork 저장소를 원본과 동기화하는 방법

### [Github Token 발급 가이드](docs/token_guide.md)
- GitHub API 토큰 발급 방법

### [ESM(ECMAScript Module) 전환 안내](docs/esm_guide.md)
- ESM으로 전환하는 절차

### [디버깅 가이드](docs/debug_guide.md)
- 실행 오류 추적 및 해결 방법

### [테마 설정 가이드](docs/theme_guide.md)
- 결과 차트 테마 설정 방법

### [로그 레벨별 사용 방식](docs/logging_guide.md)
- 로그 레벨(INFO, ERROR 등) 사용 가이드

### [Cherry Pick 사용 방법](docs/cherry-pick_guide.md)
- 커밋 하나만 선택적으로 적용하는 방법