# reposcore-js
A CLI for scoring student participation in an open-source class repo, implemented in JavaScript (Node.js).

# Install dependencies
```bash
npm install
```

# Usage
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

## Score Formula
아래는 PR 개수와 이슈 개수의 비율에 따라 점수로 인정가능한 최대 개수를 구하고 각 배점에 따라 최종 점수를 산출하는 공식이다.

- $P_{fb}$ : 기능 또는 버그 관련 Merged PR 개수 (**3점**) ($P_{fb} = P_f + P_b$)  
- $P_d$ : 문서 관련 Merged PR 개수 (**2점**)  
- $I_{fb}$ : 기능 또는 버그 관련 Open 또는 해결된 이슈 개수 (**2점**) ($I_{fb} = I_f + I_b$)  
- $I_d$ : 문서 관련 Open 또는 해결된 이슈 개수 (**1점**)

점수로 인정 가능한 PR의 개수\
$P_{\text{valid}} = P_{fb} + \min(P_d, 3P_{fb})$

점수로 인정 가능한 이슈의 개수\
$I_{\text{valid}} = \min(I_{fb} + I_d, 4 \times P_{\text{valid}})$

PR의 점수를 최대로 하기 위해 기능/버그 PR을 먼저 계산한 후 문서 PR을 계산합니다.

기능/버그 PR을 최대로 포함:\
$P_{fb}^* = \min(P_{fb}, P_{\text{valid}})$

남은 개수에서 문서 PR을 포함:\
$P_d^* = P_{\text{valid}} - P_{fb}^*$

이슈의 점수를 최대로 하기 위해 기능/버그 이슈를 먼저 계산한 후 문서 이슈를 계산합니다.

기능/버그 이슈를 최대로 포함:\
$I_{fb}^* = \min(I_{fb}, I_{\text{valid}})$

남은 개수에서 문서 이슈를 포함:\
$I_d^* = I_{\text{valid}} - I_{fb}^*$

최종 점수 계산 공식:\
$S = 3P_{fb}^* + 2P_d^* + 2I_{fb}^* + 1I_d^*$


## caution
```bash
문제점이 무엇이 파악해 구체적으로 이슈를 작성할 것
그 문제가 해결되기 위한 프로그램의 개선기능, 새로운 기능이 사용되는 방식, 예상 결과 등 solution의 방향을 최대한 구체적으로 작성할 것
코드의 어떤 부분을 작성하거나 수정해야하는지까지 제시하면 좋음
```
