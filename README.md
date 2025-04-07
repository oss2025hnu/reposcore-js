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
  -a, --api-key <token>', Github Access Token (optional)
  -r, --repo <path>    Repository path (e.g., user/repo)
  -o, --output <dir>   Output directory (default: "results")
  -f, --format <type>  Output format (table, chart, both) (default: "both")
  -h, --help           display help for command
```
