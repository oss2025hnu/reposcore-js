const fs = require('fs');
const path = require('path');
const dotenvPath = path.resolve(__dirname, '../../.env');

// .env에 토큰 저장
function saveEnvToken(token) {
    fs.writeFileSync(dotenvPath, `GITHUB_TOKEN=${token}\n`, { encoding: 'utf8' });
}

// .env에서 토큰 읽기
function getEnvToken() {
    if (!fs.existsSync(dotenvPath)) return null;
    const env = fs.readFileSync(dotenvPath, 'utf8');
    const match = env.match(/GITHUB_TOKEN=(.+)/);
    return match ? match[1].trim() : null;
}

module.exports = { saveEnvToken, getEnvToken };
