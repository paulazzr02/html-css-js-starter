/**
 * @fileoverview 사이트 기본 설정
 * @description 프로젝트별로 이 파일을 수정하여 사이트 정보를 설정합니다.
 * @module site.config
 */

module.exports = {
  // 경로 설정
  paths: {
    src: './src',
    dist: './dist',
    html: {
      src: './src/pages',
      dest: './dist/html',
    },
    scss: {
      src: './src/styles',
      dest: './dist/assets/css',
    },
    js: {
      src: './src/scripts',
      dest: './dist/assets/js',
    },
    public: {
      src: './public',
      dest: './dist/assets',
    },
  },

  // 파일명 설정
  files: {
    scss: {
      entry: 'styles.scss',
      output: 'styles.css',
    },
    html: {
      index: 'index.html',
    },
    favicon: 'favicon.svg',
  },

  // 개발 서버 설정
  dev: {
    port: 3000,
    open: true,
    notify: false,
    logLevel: 'info',
  },

  // 빌드 설정
  build: {
    // HTML 처리 설정
    html: {
      prefix: '@@', // fileinclude 접두사
      basepath: '@file', // fileinclude basepath
    },

    // SCSS 컴파일 설정
    css: {
      // gulp-sass v6에서는 loadPaths를 사용합니다 (includePaths는 하위 호환성을 위해 유지)
      loadPaths: ['./node_modules', './src/styles'],
      includePaths: ['./node_modules', './src/styles'], // 하위 호환성 (deprecated)
    },
  },

  // 언어 설정 (예: 'ko', 'en', 'ja', 'zh-CN' 등)
  language: 'ko',

  // Viewport 설정
  // 'responsive': 반응형 - 모든 화면 크기에 반응 (width=device-width, initial-scale=1.0)
  // 'adaptive': 적응형 - 고정 너비, 확대 가능 (width=fixedWidth, initial-scale=1.0, minimum-scale=1.0)
  //   - adaptive와 desktop-only 차이: adaptive는 확대 가능, desktop-only는 확대 불가
  // 'mobile-first': 모바일 우선 - 접근성 고려, 확대 허용 (width=device-width, initial-scale=1.0, maximum-scale=5.0)
  //   - responsive와 차이: maximum-scale=5.0으로 시각 장애인을 위한 확대 허용
  // 'desktop-only': 데스크톱 전용 - 피그마 시안 기준 (width=1920, user-scalable=no)
  //   - 고정 너비 1920px, 확대/축소 불가 (피그마 시안 1920*1080 기준), 다자인 위주 제작, 접근성 준수 미흡
  // 'desktop-fluid': 데스크톱 최소 너비 + Fluid (width=device-width, initial-scale=1.0)
  //   - CSS에서 min-width로 최소 너비 제어 (예: min-width: 1600px)
  viewport: {
    mode: 'responsive', // 'responsive' | 'adaptive' | 'mobile-first' | 'desktop-only' | 'desktop-fluid'
    // adaptive 모드일 때 사용할 고정 너비
    fixedWidth: 1600,
  },
};
