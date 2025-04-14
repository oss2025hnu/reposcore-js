# reposcore-js
A CLI for scoring student participation in an open-source class repo, implemented in JavaScript (Node.js).

## Install dependencies
```bash
npm install
```

## Usage
아래는 `node index.js -h` 또는 `node index.js --help` 실행 결과를 붙여넣은 것이므로
명령줄 관련 코드가 변경되면 아래 내용도 그에 맞게 수정해야 함.
만약 명령줄 코드가 변경될 경우, node lib/GenerateReadme.js를 통헤 Readme.md파일을 최신화 할 것.

```


Usage: index [options]

Options:
  -a, --api-key <token>  Github Access Token (optional)
  -t, --text             Save table as text file
  -r, --repo <path...>   Repository path (e.g., user/repo)
  -o, --output <dir>     Output directory (default: "results")
  -f, --format <type>    Output format (table, chart, both) (default: "both")
  -c, --use-cache        Use previously cached GitHub data
  -u, --user-name        Display user's real name
  -h, --help             display help for command


```

## 토큰 실행 방법

1. 최초 실행 (API KEY 포함)
- 처음 실행 시에는 아래와 같이 토큰을 함께 입력해야 합니다.
```bash
node index.js -r oss2025hnu/reposcore-js -a ghp_ABC123ABC123
```
위 명령어 실행 시 .env 파일이 자동 생성되며, 입력한 토큰이 로컬 환경에 저장됩니다.

2. 이후 실행 (API KEY 생략 가능)
- .env 파일이 생성된 이후에는 토큰 없이도 실행이 가능합니다.
```bash
node index.js -r oss2025hnu/reposcore-js
```
또한 `--use-cache` 옵션을 사용하면 `cache.json` 파일에 저장된 GitHub API 데이터를 불러옵니다(파일이 존재할 경우). 
이렇게 하면 API 요청 수를 줄이고 실행 속도를 높일 수 있습니다. 
만약 캐시 파일이 없거나 손상된 경우, 새로운 데이터를 자동으로 가져옵니다.

##  clean 사용 방법

PR전 결과물 - lock.json, result.png.. 등 temp파일들을 삭제하는 코드입니다. 필수적으로 실행 후 PR하시길 바랍니다.

'''bash
npm run clean
'''

## Score Formula
아래는 PR 개수와 이슈 개수의 비율에 따라 점수로 인정가능한 최대 개수를 구하고 각 배점에 따라 최종 점수를 산출하는 공식이다.

- $P_{fb}$ : 기능 또는 버그 관련 Merged PR 개수 (**3점**) ($P_{fb} = P_f + P_b$)  
- $P_d$ : 문서 관련 Merged PR 개수 (**2점**)  
- $I_{fb}$ : 기능 또는 버그 관련 Open 또는 해결된 이슈 개수 (**2점**) ($I_{fb} = I_f + I_b$)  
- $I_d$ : 문서 관련 Open 또는 해결된 이슈 개수 (**1점**)

$P_{\text{valid}} = P_{fb} + \min(P_d, 3 \times \max(P_{fb},1)) ~~\quad$ 점수 인정 가능 PR 개수\
$I_{\text{valid}} = \min(I_{fb} + I_d, 4 \times P_{\text{valid}}) \quad$ 점수 인정 가능 이슈 개수

PR의 점수를 최대로 하기 위해 기능/버그 PR을 먼저 계산한 후 문서 PR을 계산합니다.

$P_{fb}^* = \min(P_{fb}, P_{\text{valid}}) \quad$ 기능/버그 PR 최대 포함\
$P_d^* = P_{\text{valid}} - P_{fb}^* ~~\quad$ 남은 개수에서 문서 PR 포함

이슈의 점수를 최대로 하기 위해 기능/버그 이슈를 먼저 계산한 후 문서 이슈를 계산합니다.

$I_{fb}^* = \min(I_{fb}, I_{\text{valid}}) \quad$ 기능/버그 이슈 최대 포함\
$I_d^* = I_{\text{valid}} - I_{fb}^* ~~\quad$ 남은 개수에서 문서 이슈 포함

최종 점수 계산 공식:\
$S = 3P_{fb}^* + 2P_d^* + 2I_{fb}^* + 1I_d^*$

## 의존성 관리 주의사항
새로운 라이브러리를 설치할 경우, package.json 파일에도 반드시 해당 라이브러리 정보를 추가해 주세요.
이는 협업 중 발생할 수 있는 실행 오류를 방지하고, 의존성 관리를 원활하게 하기 위한 필수 절차입니다.

package.json은 프로젝트에서 사용하는 외부 라이브러리(의존성) 정보를 정리해 놓은 설정 파일입니다.
이 파일에 정보가 누락되면, 다른 기여자들이 프로젝트를 실행할 때 오류가 발생할 수 있습니다.

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
## README 자동 생성 기능 안내

이 프로젝트는 CLI 명령어 옵션(`node index.js --help`)의 변경을 반영하여 README.md를 자동 생성하는 기능을 포함하고 있습니다.

### 구성 요소

- `Readme_Template.md`:  
  README.md의 템플릿 역할을 하며, `{{ Usage }}` 위치에 CLI 옵션 설명이 삽입됩니다.
- `lib/GenerateReadme.js`:  
  자동 생성 스크립트. 실행 시 `README.md`를 갱신합니다.

### 사용 방법

```bash
node lib/GenerateReadme.js
```

- 위 명령을 실행하면 `index.js --help`의 출력 결과가 템플릿에 삽입되고, 최종 결과로 `README.md`가 생성 또는 덮어써집니다.

### 주의사항

- CLI 옵션이 변경될 경우 반드시 이 스크립트를 실행하여 `README.md`를 갱신하세요.
- `README.md`를 직접 수정하더라도 이 스크립트를 실행하면 템플릿을 기준으로 덮어써집니다. 따라서 README.md의 변경 사항은 반드시 Readme_Template.md 파일에 반영해야 합니다.

## 유틸리티 함수 (`Util.js`)
이 프로젝트에서는 코드의 가독성과 유지보수를 위해, 직접적인 로직이나 핵심 기능에 영향을 주지 않는 공통적인 유틸리티 함수들을 별도의 파일인 Util.js에 분리하여 관리합니다.

## 유닛 테스트 명령어
Test
이 저장소에서 기본적인 동작 이상 여부를 테스트하기 위한 자동화된 테스트 스위트를 사용할 수 있습니다.
현재 PR오류로 인해 작동이 아직은 안되므로, 업데이트가 되면 Readme DOC를 수정할 예정입니다.

```bash
npm run test
```

## token 생성하는법
[링크](docs/token_guide.md)

## 프로젝트 가이드라인
[링크](docs/project_guidelines.md)