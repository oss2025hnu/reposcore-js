const fs = require('fs');
const mockfs = require('mock-fs'); // Mocking 라이브러리
const { updateEnvToken } = require('../index');

describe('환경 설정 유틸리티', () => {
  beforeEach(() => {
    // Mocking: 가상의 파일 시스템 생성
    mockfs({
      '.env': 'GITHUB_TOKEN=existing_token', // 초기 상태의 가상 .env 파일
    });
  });

  afterEach(() => {
    // Mocking: 가상의 파일 시스템 복원
    mockfs.restore();
  });

  test('토큰 업데이트 기능', () => {
    // .env 파일에 새로운 토큰 저장
    updateEnvToken('test_token_123');

    // .env 파일 내용을 읽어와 검증
    const envContent = fs.readFileSync('.env', 'utf-8');
    expect(envContent).toContain('GITHUB_TOKEN=test_token_123');
  });

  test('기존 토큰이 업데이트되는지 확인', () => {
    // 기존 토큰이 있는 상태에서 새 토큰으로 업데이트
    updateEnvToken('new_token');

    // .env 파일 내용을 읽어와 검증
    const envContent = fs.readFileSync('.env', 'utf-8');
    expect(envContent).toContain('GITHUB_TOKEN=new_token');
  });
  
});

