# reposcore-js
A CLI for scoring student participation in an open-source class repo, implemented in JavaScript (Node.js).

## Install dependencies
```bash
npm install
npm install dotenv 
```

## Usage
아래는 `node index.js -h` 또는 `node index.js --help` 실행 결과를 붙여넣은 것이므로
명령줄 관련 코드가 변경되면 아래 내용도 그에 맞게 수정해야 함.
```
Usage: index [options]

Options:
  -a, --api-key <token> Github Access Token (optional)
  -r, --repo <path>    Repository path (e.g., user/repo)
  -o, --output <dir>   Output directory (default: "results")
  -f, --format <type>  Output format (table, chart, both) (default: "both")
  -h, --help           display help for command
```

###Github Access Token 관리 방법 (환경변수 사용)
프로그램 실행 시 매번 -a <token> 옵션을 입력하는 번거로움을 줄이기 위해, .env 파일을 이용한 API 토큰 자동 인증 기능이 추가되었습니다.
먼저 아래에 있는 코드를 입력하여 .env파일을 자동 생성합니다.
```
node index.js -a ghp_xxxxxxYOURTOKENxxxxx
```
.env파일이 생성되고 난 뒤부턴
```
node index.js -r oss2025hnu/reposcore-py
```
와 같이 입력하여 토큰을 직접 입력하지 않고 결과물을 얻을 수 있습니다.
.env파일은 .gitignore 132번줄에 적어두었으므로, 자동커밋 및 푸쉬가 되지 않고 자신의 로컬저장소에 남아있게 됨으로써 계속하여 토큰 없이 결과물을 얻을 수 있습니다.

## Score Formula
아래는 PR 개수와 이슈 개수의 비율에 따라 점수로 인정가능한 최대 개수를 구하고 각 배점에 따라 최종 점수를 산출하는 공식이다.

- $P_{fb}$ : 기능 또는 버그 관련 Merged PR 개수 (**3점**) ($P_{fb} = P_f + P_b$)  
- $P_d$ : 문서 관련 Merged PR 개수 (**2점**)  
- $I_{fb}$ : 기능 또는 버그 관련 Open 또는 해결된 이슈 개수 (**2점**) ($I_{fb} = I_f + I_b$)  
- $I_d$ : 문서 관련 Open 또는 해결된 이슈 개수 (**1점**)

$P_{\text{valid}} = P_{fb} + \min(P_d, 3P_{fb}) ~~\quad$ 점수 인정 가능 PR 개수\
$I_{\text{valid}} = \min(I_{fb} + I_d, 4 \times P_{\text{valid}}) \quad$ 점수 인정 가능 이슈 개수

PR의 점수를 최대로 하기 위해 기능/버그 PR을 먼저 계산한 후 문서 PR을 계산합니다.

$P_{fb}^* = \min(P_{fb}, P_{\text{valid}}) \quad$ 기능/버그 PR 최대 포함\
$P_d^* = P_{\text{valid}} - P_{fb}^* ~~\quad$ 남은 개수에서 문서 PR 포함

이슈의 점수를 최대로 하기 위해 기능/버그 이슈를 먼저 계산한 후 문서 이슈를 계산합니다.

$I_{fb}^* = \min(I_{fb}, I_{\text{valid}}) \quad$ 기능/버그 이슈 최대 포함\
$I_d^* = I_{\text{valid}} - I_{fb}^* ~~\quad$ 남은 개수에서 문서 이슈 포함

최종 점수 계산 공식:\
$S = 3P_{fb}^* + 2P_d^* + 2I_{fb}^* + 1I_d^*$


## token 생성하는법
<a href="./token_guide/README.md">링크</a>
