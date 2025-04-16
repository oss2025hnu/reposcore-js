import { Octokit } from '@octokit/rest';

/**
 * GitHub API 요청 제한 정보를 출력하는 함수
 * @param {string} apiKey - GitHub Personal Access Token
 */
async function getRateLimit(apiKey) {
  const octokit = new Octokit({
    auth: apiKey,
  });

  try {
    const res = await octokit.request('GET /rate_limit');
    const core = res.data.rate;

    console.log(`GitHub API 요청 가능 횟수: ${core.remaining} / ${core.limit}`);
  } catch (error) {
    console.error('GitHub API 요청에 실패했습니다.');
    console.error(error.message);
  }
}

export default getRateLimit;