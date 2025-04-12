const { 
    initializeDatabase,
    saveCacheToDB,
    loadCacheFromDB
  } = require('../index');
  
  describe('캐시 관리 기능', () => {
    const testData = { user1: { prs: 5 }, user2: { issues: 3 } };
  
    beforeAll(() => {
      // 데이터베이스 초기화
      initializeDatabase();
    });
  
    test('캐시 저장 및 로드', async () => {
      // 캐시 저장
      await saveCacheToDB('testRepo', testData);
  
      // 캐시 로드 (비동기 처리)
      const loaded = await loadCacheFromDB(['testRepo']);
      
      // 검증: 데이터 구조 확인
      expect(loaded.get('testRepo').user1.prs).toBe(5);
      expect(loaded.get('testRepo').user2.issues).toBe(3);
    });
  });