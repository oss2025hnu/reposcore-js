## 프로젝트에서는 다음과 같은 로그 레벨을 제공하며, 각 상황에 맞게 적절한 레벨을 사용해야 합니다

### 로그 레벨 종류
- **LOG**: 일반적인 정보성 메시지
  ```javascript
  log('데이터 수집을 시작합니다.');
  ```

- **DEBUG**: 디버깅에 필요한 상세 정보
  ```javascript
  log('PR #123 처리 중: 라벨 = feature, 상태 = merged', 'DEBUG');
  ```

- **INFO**: 중요한 진행 상황이나 결과
  ```javascript
  log('총 30개의 PR을 성공적으로 분석했습니다.', 'INFO');
  ```

- **WARN**: 잠재적인 문제나 주의사항
  ```javascript
  log('캐시 파일이 없어 새로운 데이터를 수집합니다.', 'WARN');
  ```

- **ERROR**: 오류나 예외 상황
  ```javascript
  log('GitHub API 호출 중 오류 발생: Rate limit exceeded', 'ERROR');
  ```

### 사용 가이드라인
1. **LOG**: 기본적인 실행 흐름 추적
2. **DEBUG**: 문제 해결을 위한 상세 정보
3. **INFO**: 주요 기능의 시작/완료 알림
4. **WARN**: 정상 동작은 가능하나 주의가 필요한 상황
5. **ERROR**: 실행 중단이나 기능 장애 상황
