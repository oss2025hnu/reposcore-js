import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { log } from './Util.js';

// 1) --help 출력 실행
let helpOutput = '';
try {
    helpOutput = execSync(`node index.js --help`).toString().trim();
} catch (err) {
    console.error('index.js --help 실행 오류:', err.message);
    process.exit(1);
}

// 2) 템플릿 파일 로드
const templatePath = new URL('../Readme_Template.md', import.meta.url).pathname;
if (!fs.existsSync(templatePath)) {
    console.error('Readme_Template.md 파일을 찾을 수 없습니다.');
    process.exit(1);
}
const templateContent = fs.readFileSync(templatePath, 'utf-8');

// 3) 템플릿 렌더링
const renderedContent = templateContent.replace('{{ Usage }}', `\n\n${helpOutput}\n\n`);

// 4) README.md로 저장
const readmePath = new URL('../README.md', import.meta.url).pathname;
fs.writeFileSync(readmePath, renderedContent);
log('README.md 파일이 성공적으로 생성되었습니다.');
