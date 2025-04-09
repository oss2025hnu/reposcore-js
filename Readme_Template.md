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
{{ Usage }}
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


## token 생성하는법
<a href="./token_guide/README.md">링크</a>

## 프로젝트 가이드라인
<a href="./project_guidelines.md">링크</a>