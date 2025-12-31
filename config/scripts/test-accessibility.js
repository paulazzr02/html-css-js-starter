/**
 * 웹 접근성 자동화 테스트 스크립트
 *
 * OpenWax와 함께 사용하여 웹 접근성을 테스트합니다.
 * pa11y를 사용하여 자동화된 접근성 검사를 수행합니다.
 *
 * 사용법:
 *   npm run test:a11y                                    # 기본 URL 테스트
 *   npm run test:a11y -- --url http://localhost:3000    # 특정 URL 테스트
 *   npm run test:a11y -- --file dist/html/dashboard.html # 파일 테스트
 */

const pa11y = require('pa11y');
const fs = require('fs');
const path = require('path');

// 명령줄 인수 파싱
const args = process.argv.slice(2);
const urlIndex = args.indexOf('--url');
const fileIndex = args.indexOf('--file');
const standardIndex = args.indexOf('--standard');

// 테스트할 URL 또는 파일
let testTarget = null;
let isFile = false;

if (urlIndex !== -1 && args[urlIndex + 1]) {
  testTarget = args[urlIndex + 1];
} else if (fileIndex !== -1 && args[fileIndex + 1]) {
  testTarget = args[fileIndex + 1];
  isFile = true;
} else {
  // 기본값: 로컬 개발 서버
  testTarget = 'http://localhost:3000';
}

// 접근성 표준 선택 (기본값: WCAG2AA)
const standard = standardIndex !== -1 && args[standardIndex + 1]
  ? args[standardIndex + 1]
  : 'WCAG2AA';

// pa11y 설정
const options = {
  standard: standard,
  log: {
    debug: console.log,
    error: console.error,
    info: console.log,
  },
  // 한국어로 결과 출력
  language: 'ko',
  // 스크린샷 저장 (선택사항)
  // screenshot: path.join(__dirname, '../dist/a11y-screenshot.png'),
  // HTML 리포트 생성
  // html: true,
};

/**
 * 접근성 테스트 실행
 */
async function runTest() {
  console.log('\n🔍 웹 접근성 테스트 시작...\n');
  console.log(`대상: ${testTarget}`);
  console.log(`표준: ${standard}\n`);
  console.log('━'.repeat(50));

  try {
    let results;

    if (isFile) {
      // 파일 경로인 경우 file:// 프로토콜 사용
      const filePath = path.resolve(testTarget);
      if (!fs.existsSync(filePath)) {
        console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
        process.exit(1);
      }
      const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;
      results = await pa11y(fileUrl, options);
    } else {
      // URL인 경우
      results = await pa11y(testTarget, options);
    }

    // 결과 출력
    console.log('\n📊 테스트 결과\n');
    console.log('━'.repeat(50));

    if (results.issues.length === 0) {
      console.log('✅ 접근성 문제가 발견되지 않았습니다!\n');
    } else {
      // 문제 유형별 분류
      const errors = results.issues.filter(issue => issue.type === 'error');
      const warnings = results.issues.filter(issue => issue.type === 'warning');
      const notices = results.issues.filter(issue => issue.type === 'notice');

      console.log(`❌ 오류: ${errors.length}개`);
      console.log(`⚠️  경고: ${warnings.length}개`);
      console.log(`ℹ️  알림: ${notices.length}개\n`);

      // 오류 출력
      if (errors.length > 0) {
        console.log('━'.repeat(50));
        console.log('❌ 오류 (반드시 수정 필요):\n');
        errors.forEach((issue, index) => {
          console.log(`${index + 1}. ${issue.message}`);
          console.log(`   코드: ${issue.code}`);
          if (issue.selector) {
            console.log(`   선택자: ${issue.selector}`);
          }
          if (issue.context) {
            console.log(`   컨텍스트: ${issue.context}`);
          }
          console.log('');
        });
      }

      // 경고 출력
      if (warnings.length > 0) {
        console.log('━'.repeat(50));
        console.log('⚠️  경고 (개선 권장):\n');
        warnings.forEach((issue, index) => {
          console.log(`${index + 1}. ${issue.message}`);
          console.log(`   코드: ${issue.code}`);
          if (issue.selector) {
            console.log(`   선택자: ${issue.selector}`);
          }
          console.log('');
        });
      }

      // 알림 출력 (선택사항)
      if (notices.length > 0 && args.includes('--verbose')) {
        console.log('━'.repeat(50));
        console.log('ℹ️  알림:\n');
        notices.forEach((issue, index) => {
          console.log(`${index + 1}. ${issue.message}`);
          console.log(`   코드: ${issue.code}`);
          console.log('');
        });
      }
    }

    // 문서 링크
    console.log('━'.repeat(50));
    console.log('\n📚 추가 정보:');
    console.log('   - OpenWax 사용 가이드: docs/ACCESSIBILITY.md');
    console.log('   - WCAG 가이드라인: https://www.wah.or.kr/\n');

    // 종료 코드 설정
    process.exit(errors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ 테스트 실행 중 오류가 발생했습니다:');
    console.error(error.message);

    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 개발 서버가 실행 중인지 확인하세요:');
      console.error('   npm run dev\n');
    }

    process.exit(1);
  }
}

// 스크립트 실행
runTest();

