# 🔍 결과 리포트(index.html) 여는 방법

분석 결과물 중 `results/index.html` 파일은 기여도 점수와 활동을 시각적으로 확인할 수 있는 HTML 리포트입니다.  
아래 방법 중 하나를 선택해 열어보세요.

---

## 방법 1: VS Code + Live Server

1. VS Code에서 `results/index.html` 파일을 엽니다.
2. 우클릭 → `Open with Live Server` 선택
3. 기본 브라우저에서 자동으로 결과 리포트가 열립니다.

> 💡 확장 설치 방법:  
> 좌측 Extensions 탭 클릭 → `Live Server` 검색 → 설치

---

## 방법 2: Python 내장 서버 사용

터미널에서 프로젝트 루트 디렉토리에서 다음 명령어 실행:

```bash
python -m http.server 8000
