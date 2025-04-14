const axios = require('axios');

async function checkRateLimit(token) {
    const headers = token ? { Authorization: `token ${token}` } : {};
    try {
        const res = await axios.get('https://api.github.com/rate_limit', { headers });
        const { remaining, limit } = res.data.rate;
        console.log(`GitHub API 요청 가능 횟수: ${remaining} / ${limit}`);
    } catch (err) {
        console.error('GitHub API 요청에 실패했습니다:', err.message);
    }
}

module.exports = checkRateLimit;
