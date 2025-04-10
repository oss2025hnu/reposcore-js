# GitHub API 활용 가이드

본 문서는 `reposcore-py` 및 `reposcore-js` 프로젝트에서 GitHub API를 효과적으로 활용하기 위한 기본적인 의미와 사용방법에 대해 적었습니다.

---

## 🔑 1. GitHub API란?

GitHub API는 GitHub의 다양한 기능(커밋, 이슈, PR, 사용자 정보 등)을 외부 애플리케이션에서 사용할 수 있도록 제공하는 **RESTful API**입니다. `reposcore` 프로젝트는 이 API를 이용해 참여자의 활동을 분석하고 점수를 계산합니다.

---

## 🔐 2. 인증 방식 (Access Token)

인증 없이도 요청은 가능하지만, **속도 제한(Rate Limit)**이 매우 작습니다.  
따라서 개인 **Access Token**을 발급받아 사용하는 것이 권장됩니다.

### 🔧 Access Token 설정 방법
1. GitHub에 로그인 → [Developer Settings](https://github.com/settings/tokens)
2. Fine-grained 또는 Classic Token 생성
3. 퍼미션: public_repo 이상

`.env` 파일에 아래와 같이 저장(현재 저희 프로젝트는 README.md에 나온 것처럼 .env파일이 터미널 입력 시 자동으로 생성됩니다.):
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx
```

`index.js`에서는 자동으로 `.env`를 읽어 사용합니다.

---

## 📡 3. API 호출 예시

### ✅ PR 목록 가져오기
```bash
curl -H "Authorization: token YOUR_TOKEN" \
     https://api.github.com/repos/oss2025hnu/reposcore-py/pulls
```

### ✅ 특정 이슈 가져오기
```bash
curl -H "Authorization: token YOUR_TOKEN" \
     https://api.github.com/repos/oss2025hnu/reposcore-py/issues/1
```

---

## 🌀 4. 페이징 처리 (Pagination)

GitHub API는 최대 100개의 결과만 한 번에 반환하므로, **페이지를 순회하며 반복 호출**해야 전체 데이터를 가져올 수 있습니다.

응답 헤더 예시:
```
Link: <https://api.github.com/...&page=2>; rel="next"
```

프로젝트 코드에서 자동으로 처리됩니다.

---

## 🚦 5. 요청 제한 (Rate Limit)

| 인증 상태     | 요청 제한         |
|---------------|------------------|
| 비인증 요청    | 60 req/hour       |
| 인증 요청      | 5,000 req/hour    |

확인 방법:
```bash
curl -I https://api.github.com
```

---

## 💡 6. 참고 자료

- [📘 GitHub REST API 공식 문서 (v3)](https://docs.github.com/en/rest)
- [🎥 코딩애플 - 코딩 초보들이 헷갈리는 용어 : API가 뭐냐면](https://www.youtube.com/watch?v=ckSdPNKM2pY)
- [📘 REST API 페이징 처리 가이드](https://docs.github.com/en/rest/guides/traversing-with-pagination)

---