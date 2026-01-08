/**
 * @fileoverview 사이트 기본 설정
 * @description 프로젝트 빌드 및 개발 서버 설정 파일
 * @module site.config
 */

module.exports = {
  // ========================================
  // 경로 설정
  // ========================================
  paths: {
    src: './src', // 소스 파일 루트 디렉토리
    dist: './dist', // 빌드 결과물 디렉토리
    html: {
      src: './src/pages', // HTML 소스 파일 위치
      dest: './dist/pages', // HTML 빌드 결과물 위치
    },
    scss: {
      src: './src/styles', // SCSS 소스 파일 위치
      dest: './dist/assets/css', // CSS 빌드 결과물 위치
    },
    js: {
      src: './src/scripts', // JavaScript 소스 파일 위치
      dest: './dist/assets/js', // JavaScript 빌드 결과물 위치
    },
    public: {
      src: './public', // 정적 자원 소스 위치 (폰트, 이미지 등)
      dest: './dist/assets', // 정적 자원 빌드 결과물 위치
    },
  },

  // ========================================
  // 경로 별칭 (마크업에서 사용할 짧은 경로)
  // ========================================
  pathAliases: {
    // 정적 리소스 기본 경로 (images, css, js, fonts는 자동으로 assetsPath 기반으로 계산)
    assetsPath: '/assets', // assets 폴더의 URL 경로 (템플릿에서 @@assetsPath로 사용)
    // 페이지 경로
    pagesPath: '/pages', // 페이지 폴더의 URL 경로 (템플릿에서 @@pagesPath로 사용)
  },

  // ========================================
  // 파일명 설정
  // ========================================
  files: {
    scss: {
      entry: 'styles.scss', // 메인 SCSS 진입점 파일명
      output: 'styles.css', // 출력 CSS 파일명
    },
    html: {
      index: 'index.html', // 메인 HTML 파일명
    },
    favicon: 'favicon.svg', // 파비콘 파일명
  },

  // ========================================
  // 개발 서버 설정
  // ========================================
  dev: {
    port: 3000, // 개발 서버 포트 번호
    open: true, // 서버 시작 시 브라우저 자동 열기
    notify: false, // BrowserSync 알림 표시 여부
    logLevel: 'info', // 로그 레벨 ('info', 'debug', 'warn', 'error')
  },

  // ========================================
  // 빌드 설정
  // ========================================
  build: {
    // HTML 처리 설정
    html: {
      prefix: '@@', // gulp-file-include 접두사 (예: @@include)
      basepath: '@file', // 파일 경로 기준점 ('@file' 또는 '@root')
    },

    // SCSS 컴파일 설정
    css: {
      // gulp-sass v6에서는 loadPaths를 사용합니다 (includePaths는 하위 호환성을 위해 유지)
      loadPaths: ['./node_modules', './src/styles'], // SCSS @use/@import 경로
      includePaths: ['./node_modules', './src/styles'], // 하위 호환성 (deprecated)
    },
  },

  // ========================================
  // 언어 설정
  // ========================================
  // HTML lang 속성에 사용됩니다.
  // 예: 'ko' (한국어), 'en' (영어), 'ja' (일본어), 'zh-CN' (중국어 간체) 등
  language: 'ko',

  // ========================================
  // Viewport 설정
  // ========================================
  // 반응형 웹 디자인을 위한 viewport 메타 태그 설정
  viewport: {
    // 모드 선택:
    // - 'responsive': 반응형 - 모든 화면 크기에 반응 (width=device-width, initial-scale=1.0)
    // - 'adaptive': 적응형 - 고정 너비, 확대 가능 (width=fixedWidth, initial-scale=1.0, minimum-scale=1.0)
    //   - adaptive와 desktop-only 차이: adaptive는 확대 가능, desktop-only는 확대 불가
    // - 'mobile-first': 모바일 우선 - 접근성 고려, 확대 허용 (width=device-width, initial-scale=1.0, maximum-scale=5.0)
    //   - responsive와 차이: maximum-scale=5.0으로 시각 장애인을 위한 확대 허용
    // - 'desktop-only': 데스크톱 전용 - 피그마 시안 기준 (width=1920, user-scalable=no)
    //   - 고정 너비 1920px, 확대/축소 불가 (피그마 시안 1920*1080 기준), 디자인 위주 제작, 접근성 준수 미흡
    // - 'desktop-fluid': 데스크톱 최소 너비 + Fluid (width=device-width, initial-scale=1.0)
    //   - CSS에서 min-width로 최소 너비 제어 (예: min-width: 1600px)
    mode: 'responsive', // 'responsive' | 'adaptive' | 'mobile-first' | 'desktop-only' | 'desktop-fluid'

    // adaptive 모드일 때 사용할 고정 너비 (픽셀 단위)
    fixedWidth: 1600,
  },
};
