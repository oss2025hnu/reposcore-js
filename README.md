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

## token 생성하는법
<a href="./token_guide/README.md">링크</a>

## 프로젝트 가이드라인
<a href="./project_guidelines.md">링크</a>