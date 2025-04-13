const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const readmePath = path.join(__dirname, '..', 'README.md');
const backupPath = path.join(__dirname, '..', 'README.backup.md');

try {
  const original = fs.readFileSync(readmePath, 'utf-8');
  fs.writeFileSync(backupPath, original);

  execSync('node lib/GenerateReadme.js');

  const regenerated = fs.readFileSync(readmePath, 'utf-8');

  fs.writeFileSync(readmePath, original);
  fs.unlinkSync(backupPath);

  if (original !== regenerated) {
    console.error('README.md가 최신 상태가 아닙니다.');
    console.error('`node lib/GenerateReadme.js` 실행 후 커밋하세요.');
    process.exit(1);
  }

  console.log('README.md는 템플릿과 일치합니다.');

} catch (err) {
  console.error(`오류 발생: ${err.message}`);
  process.exit(1);
}
