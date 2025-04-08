// scripts/update-usage.js

const fs = require('fs');
const { execSync } = require('child_process');

const README_PATH = 'README.md';
const USAGE_START = 'Useage_start';
const USAGE_END = 'Usage_end';

function getCLIHelpOutput() {
  try {
    return execSync('node index.js --help').toString();
  } catch (err) {
    console.error('Error getting --help output:', err.message);
    process.exit(1);
  }
}

function updateUsageInReadme(helpText) {
  const readme = fs.readFileSync(README_PATH, 'utf-8');
  const startIdx = readme.indexOf(USAGE_START);
  const endIdx = readme.indexOf(USAGE_END);

  if (startIdx === -1 || endIdx === -1) {
    console.error('README.md에 usage 영역 주석이 없습니다. Useage_start 와 Usage_end를 추가해주세요.');
    process.exit(1);
  }

  const updated = 
    readme.slice(0, startIdx + USAGE_START.length) +
    '\n\n```\n' + helpText.trim() + '\n```\n\n' +
    readme.slice(endIdx);

  fs.writeFileSync(README_PATH, updated);
  console.log('README.md의 Usage 섹션이 업데이트되었습니다.');
}

const helpText = getCLIHelpOutput();
updateUsageInReadme(helpText);
