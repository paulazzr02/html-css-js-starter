/**
 * @fileoverview Gulp Build Configuration
 * @description HTML/CSS/JS 프로젝트 빌드 자동화
 * @module gulpfile
 *
 * 주요 기능:
 * - SCSS 컴파일
 * - HTML 템플릿 처리
 * - 정적 리소스 복사 (public → dist/assets)
 * - 개발 서버 (BrowserSync)
 * - 경로 변환 (절대경로 ↔ 상대경로)
 *
 * 빌드 모드:
 * - 개발 서버 (serve): 절대경로 사용 (BrowserSync에서 정상 작동)
 * - 프로덕션 빌드 (prod): 상대경로 사용 (file:// 프로토콜 지원, 웹 서버 없이도 작동)
 *
 * 설정 파일: config/site.config.js
 */

const gulp = require('gulp');
const server = require('browser-sync').create();
const { watch } = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const clean = require('gulp-clean');
const fs = require('fs');
const path = require('path');
const fileinclude = require('gulp-file-include');
const sourcemaps = require('gulp-sourcemaps');
const rename = require('gulp-rename');
const { glob } = require('glob');

// 설정 파일 로드
const config = require('./config/site.config.js');

// 경로 설정 (설정 파일에서 가져오되, 끝에 슬래시 추가)
const paths = {
  scripts: {
    src: config.paths.src + '/',
    dest: config.paths.dist + '/',
  },
  html: {
    src: config.paths.html.src + '/',
    dest: config.paths.html.dest + '/',
  },
  scss: {
    src: config.paths.scss.src + '/',
    dest: config.paths.scss.dest + '/',
  },
  js: {
    src: config.paths.js.src + '/',
    dest: config.paths.js.dest + '/',
  },
  public: {
    src: config.paths.public.src + '/',
    dest: config.paths.public.dest + '/',
  },
};

/**
 * HTML 파일의 상대경로를 절대경로로 변환
 * @param {string} content - HTML 내용
 * @param {string} [fileLocation='html'] - 파일 위치 ('root' | 'html')
 * @param {string|null} [htmlFilePath=null] - HTML 파일 경로 (인라인 스타일 경로 변환용)
 * @returns {string} 변환된 HTML 내용
 * @description href, src 속성 및 인라인 스타일의 url() 경로를 절대경로로 변환
 */
function convertHtmlPaths(content, fileLocation = 'html', htmlFilePath = null) {
  // 설정 파일에서 경로 별칭 가져오기
  const aliases = config.pathAliases || {};
  const assetsPath = aliases.assetsPath || '/assets';
  const pagesPath = aliases.pagesPath || '/html';

  // 짧은 경로를 자동으로 변환 (개발 편의성 향상)
  // images/... → /assets/images/...
  content = content.replace(/(href|src)="images\//g, `$1="${assetsPath}/images/`);
  // css/... → /assets/css/...
  content = content.replace(/(href|src)="css\//g, `$1="${assetsPath}/css/`);
  // js/... → /assets/js/...
  content = content.replace(/(href|src)="js\//g, `$1="${assetsPath}/js/`);
  // fonts/... → /assets/fonts/...
  content = content.replace(/(href|src)="fonts\//g, `$1="${assetsPath}/fonts/`);
  // favicon.svg → /favicon.svg
  content = content.replace(/(href|src)="favicon\.svg"/g, '$1="/favicon.svg"');

  // 페이지 링크: *.html → /html/*.html (같은 폴더 내 파일)
  if (fileLocation === 'html') {
    content = content.replace(/href="([^/"]+\.html)"/g, `href="${pagesPath}/$1"`);
  }

  // 기존 상대 경로 변환 (하위 호환성)
  content = content.replace(/href="\.\.\/assets\//g, `href="${assetsPath}/`);
  content = content.replace(/src="\.\.\/assets\//g, `src="${assetsPath}/`);
  content = content.replace(/href="\.\.\/favicon\.svg"/g, 'href="/favicon.svg"');
  content = content.replace(/href="\.\.\/fonts\//g, `href="${assetsPath}/fonts/`);

  if (fileLocation === 'root') {
    content = content.replace(/href="\.\/assets\//g, `href="${assetsPath}/`);
    content = content.replace(/src="\.\/assets\//g, `src="${assetsPath}/`);
    content = content.replace(/href="\.\/favicon\.svg"/g, 'href="/favicon.svg"');
    content = content.replace(/href="\.\/fonts\//g, `href="${assetsPath}/fonts/`);

    content = content.replace(/href="\.\/html\//g, `href="${pagesPath}/`);
  } else {
    content = content.replace(/href="\.\.\/index\.html"/g, 'href="/index.html"');
    content = content.replace(/href="\.\.\/html\//g, `href="${pagesPath}/`);
  }

  // HTML 인라인 스타일의 url() 경로 변환 (CSS 파일 기준으로)
  if (htmlFilePath) {
    const htmlDir = path.dirname(htmlFilePath);
    const cssDir = path.join(paths.scripts.dest, 'assets', 'css');

    content = content.replace(
      /style\s*=\s*"([^"]*)"|style\s*=\s*'([^']*)'/gi,
      (match, doubleQuoteContent, singleQuoteContent) => {
        const styleContent = doubleQuoteContent || singleQuoteContent;
        if (!styleContent.includes('--icon-url')) {
          return match;
        }

        const urlInStyleRegex = /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi;
        let modifiedStyle = styleContent;
        const matches = [];
        let tempMatch;
        while ((tempMatch = urlInStyleRegex.exec(styleContent)) !== null) {
          matches.push(tempMatch);
        }

        if (matches.length === 0) {
          return match;
        }

        for (const urlMatch of matches) {
          const fullUrlMatch = urlMatch[0];
          const urlPath = urlMatch[1];

          // CDN 링크나 절대 경로는 그대로 유지
          if (
            urlPath.startsWith('/') ||
            urlPath.startsWith('http://') ||
            urlPath.startsWith('https://') ||
            urlPath.startsWith('data:') ||
            urlPath.startsWith('var(')
          ) {
            continue;
          }

          let absoluteUrlPath;
          if (urlPath.startsWith('./')) {
            absoluteUrlPath = path.join(htmlDir, urlPath.substring(2));
          } else if (urlPath.startsWith('../')) {
            absoluteUrlPath = path.join(htmlDir, urlPath);
            absoluteUrlPath = path.normalize(absoluteUrlPath);
          } else {
            absoluteUrlPath = path.join(htmlDir, urlPath);
            absoluteUrlPath = path.normalize(absoluteUrlPath);
          }

          if (!fs.existsSync(absoluteUrlPath)) {
            continue;
          }

          const relativeUrlPath = path.relative(cssDir, absoluteUrlPath).replace(/\\/g, '/');
          const finalUrlPath =
            relativeUrlPath.startsWith('../') || relativeUrlPath.startsWith('./')
              ? relativeUrlPath
              : './' + relativeUrlPath;

          modifiedStyle = modifiedStyle.replace(
            fullUrlMatch,
            fullUrlMatch.replace(urlPath, finalUrlPath),
          );
        }

        if (modifiedStyle !== styleContent) {
          console.log(
            `✓ Converted inline style URL: ${styleContent.substring(0, 50)}... → ${modifiedStyle.substring(0, 50)}...`,
          );
          return `style="${modifiedStyle}"`;
        }
        return match;
      },
    );
  }

  return content;
}

/**
 * HTML 파일의 절대경로를 상대경로로 변환
 * @param {string} content - HTML 내용
 * @param {string} [fileLocation='html'] - 파일 위치 ('root' | 'html')
 * @returns {string} 변환된 HTML 내용
 * @description 프로덕션 빌드에서 file:// 프로토콜 지원을 위해 사용
 */
function convertToRelativePaths(content, fileLocation = 'html') {
  // 설정 파일에서 경로 별칭 가져오기
  const aliases = config.pathAliases || {};
  const assetsPath = aliases.assetsPath || '/assets';
  const pagesPath = aliases.pagesPath || '/html';

  // 짧은 경로를 먼저 절대 경로로 변환한 후 상대 경로로 변환
  // images/... → /assets/images/... → ../assets/images/...
  content = content.replace(/(href|src)="images\//g, `$1="${assetsPath}/images/`);
  content = content.replace(/(href|src)="css\//g, `$1="${assetsPath}/css/`);
  content = content.replace(/(href|src)="js\//g, `$1="${assetsPath}/js/`);
  content = content.replace(/(href|src)="fonts\//g, `$1="${assetsPath}/fonts/`);
  content = content.replace(/(href|src)="favicon\.svg"/g, '$1="/favicon.svg"');

  // 페이지 링크: *.html → /html/*.html → ../html/*.html
  if (fileLocation === 'html') {
    content = content.replace(/href="([^/"]+\.html)"/g, `href="${pagesPath}/$1"`);
  }

  if (fileLocation === 'root') {
    content = content.replace(new RegExp(`href="${assetsPath}/`, 'g'), 'href="./assets/');
    content = content.replace(new RegExp(`src="${assetsPath}/`, 'g'), 'src="./assets/');
    content = content.replace(/href="\/favicon\.svg"/g, 'href="./favicon.svg"');
    // include 파일에서 사용하는 상대 경로도 변환 (../assets/ → ./assets/)
    content = content.replace(/src="\.\.\/assets\//g, 'src="./assets/');
    content = content.replace(/href="\.\.\/assets\//g, 'href="./assets/');
    // HTML 페이지 링크 경로 변환 (/html/... → ./html/...)
    content = content.replace(new RegExp(`href="${pagesPath}/`, 'g'), 'href="./html/');
  } else {
    content = content.replace(new RegExp(`href="${assetsPath}/`, 'g'), 'href="../assets/');
    content = content.replace(new RegExp(`src="${assetsPath}/`, 'g'), 'src="../assets/');
    content = content.replace(/href="\/favicon\.svg"/g, 'href="../favicon.svg"');
    // HTML 페이지 링크 경로 변환 (/html/... → ../html/...)
    content = content.replace(new RegExp(`href="${pagesPath}/`, 'g'), 'href="../html/');
  }

  // file:// 프로토콜에서도 작동하도록 crossorigin 속성 제거
  // 로컬 파일로 열 수 있도록 최적화
  content = content.replace(/\s+crossorigin="anonymous"/g, '');
  content = content.replace(/\s+crossorigin='anonymous'/g, '');

  return content;
}

/**
 * 디렉터리 생성
 * @param {string} dir - 생성할 디렉터리 경로
 * @description 디렉터리가 존재하지 않으면 생성하고, 파일로 존재하면 삭제 후 생성
 */
function ensureDir(dir) {
  if (fs.existsSync(dir)) {
    // 파일로 존재하는 경우 삭제
    const stat = fs.statSync(dir);
    if (!stat.isDirectory()) {
      fs.unlinkSync(dir);
    } else {
      // 이미 디렉토리로 존재하면 생성 불필요
      return;
    }
  }
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * 컴파일된 파일 검증
 * @param {string} finalPath - 검증할 파일 경로
 * @param {boolean} isDevelopment - 개발 모드 여부
 * @returns {boolean} 파일 존재 여부
 * @description 파일 존재 여부와 소스맵 생성 여부를 확인
 */
function verifyCompiledFile(finalPath, isDevelopment) {
  if (!fs.existsSync(finalPath)) {
    return false;
  }

  const stats = fs.statSync(finalPath);
  console.log(`✓ CSS file created: ${finalPath} (${stats.size} bytes)`);

  // 개발 모드에서 소스맵 파일 확인
  if (isDevelopment) {
    const sourceMapPath = finalPath + '.map';
    if (fs.existsSync(sourceMapPath)) {
      const mapStats = fs.statSync(sourceMapPath);
      console.log(`✓ Source map created: ${sourceMapPath} (${mapStats.size} bytes)`);
    } else {
      console.warn(`⚠ Source map not found: ${sourceMapPath}`);
    }
  }

  return true;
}

/**
 * 파일 존재 확인 및 재시도
 * @param {string} finalPath - 확인할 파일 경로
 * @param {string} outputDest - 출력 디렉터리
 * @param {string} outputFileName - 출력 파일명
 * @param {boolean} isDevelopment - 개발 모드 여부
 * @param {number} [maxAttempts=10] - 최대 재시도 횟수
 * @param {number} [delayMs=100] - 재시도 간격 (밀리초)
 * @returns {Promise<boolean>} 파일 생성 성공 여부
 * @description gulp.dest가 파일을 생성할 때까지 최대 10번 재시도 (총 1초 대기)
 */
async function waitForFileWithRetry(
  finalPath,
  outputDest,
  outputFileName,
  isDevelopment,
  maxAttempts = 10,
  delayMs = 100,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (verifyCompiledFile(finalPath, isDevelopment)) {
      return true;
    }

    // 마지막 시도가 아니면 대기
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // 재시도 실패 시 상세한 에러 정보 출력
  console.warn(`⚠ CSS file not created: ${finalPath}`);
  console.warn(`  Output directory: ${outputDest}`);
  console.warn(`  Output file name: ${outputFileName}`);
  console.warn(`  Directory exists: ${fs.existsSync(outputDest)}`);

  return false;
}

/**
 * 디렉터리 삭제 (재귀적)
 * @param {string} dirPath - 삭제할 디렉터리 경로
 * @returns {Promise<void>}
 * @description 디렉토리와 모든 하위 파일/폴더를 재귀적으로 삭제
 */
async function deleteDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  try {
    // Node.js 14.14.0+ 에서는 fs.rmSync 사용 가능 (더 빠름)
    if (fs.rmSync) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    } else {
      // 구버전 호환성
      const files = await glob(path.join(dirPath, '**/*').replace(/\\/g, '/'), {
        nodir: false,
      }).catch(() => []);

      const sortedFiles = files.sort().reverse();
      for (const file of sortedFiles) {
        try {
          const stat = fs.statSync(file);
          if (stat.isDirectory()) {
            fs.rmdirSync(file, { recursive: true });
          } else {
            fs.unlinkSync(file);
          }
        } catch (error) {
          // 개별 파일 삭제 실패는 무시
        }
      }

      try {
        if (fs.existsSync(dirPath)) {
          const rootFiles = fs.readdirSync(dirPath);
          if (rootFiles.length === 0) {
            fs.rmdirSync(dirPath);
          }
        }
      } catch (error) {
        // 루트 디렉토리 삭제 실패는 무시
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not fully delete ${dirPath}:`, error.message);
  }
}

/**
 * Gulp 스트림을 Promise로 변환
 * @param {Stream} stream - Gulp 스트림
 * @returns {Promise<void>} 완료 시 resolve되는 Promise
 * @description finish 이벤트를 사용하여 파일 쓰기 완료 보장
 */
function streamToPromise(stream) {
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        resolve();
      }
    };
    stream.on('end', finish);
    stream.on('finish', finish);
    stream.on('error', (error) => {
      if (!finished) {
        finished = true;
        reject(error);
      }
    });
  });
}

// 빌드 작업 함수

/**
 * 빌드 디렉터리 정리
 * @returns {Promise<void>}
 * @description dist 폴더의 모든 내용을 삭제
 */
async function cleanBuild() {
  const stream = gulp
    .src(paths.scripts.dest, { read: false, allowEmpty: true })
    .pipe(clean({ allowEmpty: true }));
  await streamToPromise(stream);
}

/**
 * SCSS 파일 컴파일
 * @param {string} scssFile - 컴파일할 SCSS 파일 경로
 * @param {string} outputPath - 출력 경로 (예: 'styles.css')
 * @param {boolean} isDevelopment - 개발 모드 여부
 * @returns {Promise<void>} 컴파일 완료 시 resolve
 */
async function compileScssFile(scssFile, outputPath, isDevelopment) {
  if (!fs.existsSync(scssFile)) {
    console.warn(`SCSS file not found: ${scssFile}`);
    return Promise.resolve();
  }

  console.log(`Compiling SCSS: ${scssFile} -> ${outputPath}`);

  return new Promise((resolve, reject) => {
    let stream = gulp.src(scssFile);

    // 개발 환경에서만 source map 초기화
    if (isDevelopment) {
      stream = stream.pipe(sourcemaps.init());
    }

    // SCSS 컴파일 (node_modules 포함하여 Bootstrap 참조 가능)
    // gulp-sass v6에서는 includePaths 대신 loadPaths를 사용합니다.
    const loadPaths = config.build?.css?.loadPaths
      ? [...config.build.css.loadPaths, paths.scss.src]
      : config.build?.css?.includePaths
        ? [...config.build.css.includePaths, paths.scss.src]
        : [paths.scss.src, './node_modules'];

    const sassCompiler = sass({
      outputStyle: isDevelopment ? 'expanded' : 'compressed',
      loadPaths: loadPaths,
      quietDeps: true, // 외부 라이브러리의 deprecation 경고 숨김
    });

    sassCompiler.on('error', (error) => {
      console.error('SCSS Compilation Error:');
      console.error(error.message);
      if (error.file) {
        console.error(`File: ${error.file}`);
        console.error(`Line: ${error.line}, Column: ${error.column}`);
      }
      sass.logError(error);
      reject(error);
    });

    stream = stream.pipe(sassCompiler);

    const outputFileName = path.basename(outputPath);
    const outputDir = path.dirname(outputPath);
    const outputDest = path.join(paths.scss.dest, outputDir);

    // 출력 디렉토리 생성
    ensureDir(outputDest);

    // 파일명 변경을 먼저 수행
    stream = stream.pipe(rename(outputFileName));

    // 개발 환경에서만 source map 파일 생성
    if (isDevelopment) {
      stream = stream.pipe(
        sourcemaps.write('.', {
          sourceRoot: '../src/styles',
          includeContent: false,
        }),
      );
      console.log(`  Source map will be generated: ${outputPath}.map`);
    }

    const finalPath = path.join(outputDest, outputFileName);

    stream = stream.pipe(gulp.dest(outputDest));

    // streamToPromise(stream)을 사용하여 스트림 완료 대기
    streamToPromise(stream)
      .then(async () => {
        // 파일 존재 확인 및 재시도
        const success = await waitForFileWithRetry(
          finalPath,
          outputDest,
          outputFileName,
          isDevelopment,
        );

        if (success) {
          resolve();
        } else {
          reject(new Error(`CSS file not created: ${finalPath}`));
        }
      })
      .catch((error) => {
        console.error('Stream error:', error);
        reject(error);
      });
  });
}

/**
 * SCSS 컴파일
 * @returns {Promise<void>}
 * @description 언더바(_)로 시작하지 않는 모든 SCSS 파일을 빌드
 * SCSS 문법: 언더바로 시작하는 파일은 partial 파일로 직접 컴파일되지 않음
 */
async function compileSass() {
  ensureDir(paths.scss.dest);

  // 개발 모드 확인: NODE_ENV가 'production'이 아니면 개발 모드
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    console.log('Development mode: Source maps will be generated');
  }

  try {
    // 언더바로 시작하지 않는 모든 SCSS 파일 찾기 (partial 파일 제외)
    const scssPattern = path.join(paths.scss.src, '**/*.scss').replace(/\\/g, '/');
    const allScssFiles = await glob(scssPattern, {
      nodir: true,
    }).catch(() => []);

    // 언더바로 시작하지 않는 파일만 필터링
    const scssFilesToBuild = allScssFiles.filter((file) => {
      const fileName = path.basename(file);
      return !fileName.startsWith('_');
    });

    if (scssFilesToBuild.length === 0) {
      console.warn(
        '⚠ No SCSS files to compile (files starting with _ are partials and will not be compiled)',
      );
      return;
    }

    console.log(`Found ${scssFilesToBuild.length} SCSS file(s) to compile:`);
    scssFilesToBuild.forEach((file) => {
      const relativePath = path.relative(paths.scss.src, file);
      console.log(`  - ${relativePath}`);
    });

    // 각 파일을 빌드
    for (const scssFile of scssFilesToBuild) {
      const relativePath = path.relative(paths.scss.src, scssFile);
      const outputPath = relativePath.replace(/\.scss$/, '.css');
      await compileScssFile(scssFile, outputPath, isDevelopment);
    }

    console.log('SCSS compilation completed successfully.');
  } catch (error) {
    console.error('SCSS compilation failed:', error);
    throw error;
  }
}

/**
 * HTML 파일 처리
 * @param {Object} [options={}] - 처리 옵션
 * @param {boolean} [options.useRelativePaths=false] - 상대경로 사용 여부
 * @returns {Promise<void>}
 * @description fileinclude 처리 및 경로 변환 (기본적으로 절대경로 사용)
 */
async function processHTML(options = {}) {
  const useRelativePaths = options.useRelativePaths || false;
  ensureDir(paths.scripts.dest);
  ensureDir(paths.html.dest);

  // Process root index.html
  // 1단계: fileinclude 처리
  const indexHtmlFile = config.files?.html?.index || 'index.html';
  const indexHtmlSrc = path.join(config.paths.src, indexHtmlFile);

  if (!fs.existsSync(indexHtmlSrc)) {
    console.warn(`⚠ Index HTML file not found: ${indexHtmlSrc}`);
    return;
  }

  const indexStream = gulp
    .src(indexHtmlSrc, { allowEmpty: false, base: config.paths.src })
    .on('error', (err) => {
      console.error(`Error reading index.html:`, err);
    })
    .pipe(
      fileinclude({
        prefix: config.build?.html?.prefix || '@@',
        basepath: config.build?.html?.basepath || '@file',
        context: {
          env: process.env.NODE_ENV || 'development',
          language: config.language || 'ko',
          viewport: config.viewport || { mode: 'adaptive', fixedWidth: 1600 },
          assetsPath: config.pathAliases?.assetsPath || '/assets',
          pagesPath: config.pathAliases?.pagesPath || '/pages',
        },
      }),
    )
    .on('error', (err) => {
      console.error(`Error processing fileinclude:`, err);
    })
    .pipe(gulp.dest(config.paths.dist))
    .on('error', (err) => {
      console.error(`Error writing index.html:`, err);
    });

  await streamToPromise(indexStream);

  // 2단계: 경로 조정 (파일 직접 읽기/쓰기)
  const indexHtmlPath = path.join(config.paths.dist, indexHtmlFile);

  // 파일 생성 대기 (최대 1초)
  let attempts = 0;
  while (!fs.existsSync(indexHtmlPath) && attempts < 10) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    attempts++;
  }

  if (fs.existsSync(indexHtmlPath)) {
    let content = fs.readFileSync(indexHtmlPath, 'utf8');
    // 언어 설정 치환
    const language = config.language || 'ko';
    content = content.replace(/@@language/g, language);
    // 경로 변환: 기본은 절대경로, 옵션으로 상대경로 사용 가능
    if (useRelativePaths) {
      content = convertToRelativePaths(content, 'root');
    } else {
      content = convertHtmlPaths(content, 'root', indexHtmlPath);
    }
    fs.writeFileSync(indexHtmlPath, content, 'utf8');
    console.log(`✓ Index HTML processed: ${indexHtmlPath}`);
  } else {
    console.warn(`⚠ Index HTML file not created: ${indexHtmlPath}`);
  }

  // Process html 폴더의 파일들
  // 1단계: fileinclude 처리
  const htmlStream = gulp
    .src(paths.html.src + '*.html', { allowEmpty: true })
    .pipe(
      fileinclude({
        prefix: config.build?.html?.prefix || '@@',
        basepath: config.build?.html?.basepath || '@file',
        context: {
          env: process.env.NODE_ENV || 'development',
          language: config.language || 'ko',
          viewport: config.viewport || { mode: 'adaptive', fixedWidth: 1600 },
          assetsPath: config.pathAliases?.assetsPath || '/assets',
          pagesPath: config.pathAliases?.pagesPath || '/pages',
        },
      }),
    )
    .pipe(gulp.dest(paths.html.dest));

  await streamToPromise(htmlStream);

  // 2단계: 경로 변환 (파일 직접 읽기/쓰기)
  const htmlFiles = await glob(path.join(paths.html.dest, '*.html').replace(/\\/g, '/'));
  const language = config.language || 'ko';
  for (const htmlFile of htmlFiles) {
    let content = fs.readFileSync(htmlFile, 'utf8');
    // 언어 설정 치환
    content = content.replace(/@@language/g, language);
    // 경로 변환: 기본은 절대경로, 옵션으로 상대경로 사용 가능
    if (useRelativePaths) {
      content = convertToRelativePaths(content, 'html');
    } else {
      content = convertHtmlPaths(content, 'html', htmlFile);
    }
    fs.writeFileSync(htmlFile, content, 'utf8');
  }
}

/**
 * 정적 리소스 복사
 * @returns {Promise<void>}
 * @description 프로젝트 리소스 복사
 */
async function copyAssets() {
  ensureDir(paths.public.dest);
  const fontsDest = path.join(paths.public.dest, 'fonts');
  const imgDest = path.join(paths.public.dest, 'img');

  // 기존 파일 삭제
  await deleteDirectory(fontsDest);
  await deleteDirectory(imgDest);

  // JS 파일을 dist/assets/js로 복사
  ensureDir(paths.js.dest);

  try {
    const jsSourcePattern = path.join(paths.js.src, '**/*.js').replace(/\\/g, '/');
    const sourceJsFiles = await glob(jsSourcePattern, {
      nodir: true, // 디렉토리 제외, 파일만
    }).catch(() => []);

    if (sourceJsFiles.length > 0) {
      let copiedCount = 0;
      let failedCount = 0;

      for (const sourceFile of sourceJsFiles) {
        try {
          const fileName = path.basename(sourceFile);
          const destFile = path.join(paths.js.dest, fileName);
          fs.copyFileSync(sourceFile, destFile);
          copiedCount++;
        } catch (error) {
          console.error(`  ✗ Error copying JS ${sourceFile}:`, error.message);
          failedCount++;
        }
      }

      if (copiedCount > 0) {
        console.log(`✓ Copied ${copiedCount} JS files to dist/assets/js`);
      }
      if (failedCount > 0) {
        console.warn(`  ⚠ ${failedCount} JS files failed to copy`);
      }
    }
  } catch (error) {
    console.error('Error copying JS files:', error);
    // 에러가 발생해도 빌드를 계속 진행
  }

  // fonts를 dist/assets/fonts로 복사 (public/fonts에서)
  ensureDir(fontsDest);

  try {
    // 소스 폰트 파일 찾기 (public/fonts에서)
    const fontsSourcePattern = path.join(paths.public.src, 'fonts', '**/*').replace(/\\/g, '/');
    const sourceFonts = await glob(fontsSourcePattern, {
      nodir: true, // 디렉토리 제외, 파일만
    }).catch(() => []);

    if (sourceFonts.length > 0) {
      let copiedCount = 0;
      let failedCount = 0;

      for (const sourceFile of sourceFonts) {
        try {
          const relativePath = path.relative(path.join(paths.public.src, 'fonts'), sourceFile);
          const destFile = path.join(fontsDest, relativePath);
          const destDir = path.dirname(destFile);
          ensureDir(destDir);
          fs.copyFileSync(sourceFile, destFile);
          copiedCount++;
        } catch (error) {
          console.error(`  ✗ Error copying font ${sourceFile}:`, error.message);
          failedCount++;
        }
      }

      if (copiedCount > 0) {
        console.log(`✓ Copied ${copiedCount} font files to dist/assets/fonts`);
      }
      if (failedCount > 0) {
        console.warn(`  ⚠ ${failedCount} font files failed to copy`);
      }
    } else {
      console.log('  No font files to copy');
    }
  } catch (error) {
    console.error('Error copying fonts:', error);
    // 에러가 발생해도 빌드를 계속 진행
  }

  // Material Icons 폰트 파일 복사 (node_modules에서)
  try {
    const materialIconsFontsPattern = path
      .join('node_modules', 'material-icons', 'iconfont', '*.woff*')
      .replace(/\\/g, '/');
    const materialIconsFonts = await glob(materialIconsFontsPattern, {
      nodir: true,
    }).catch(() => []);

    if (materialIconsFonts.length > 0) {
      const materialIconsDest = path.join(fontsDest, 'material-icons');
      ensureDir(materialIconsDest);

      let copiedCount = 0;
      let failedCount = 0;

      for (const sourceFile of materialIconsFonts) {
        try {
          const fileName = path.basename(sourceFile);
          const destFile = path.join(materialIconsDest, fileName);
          fs.copyFileSync(sourceFile, destFile);
          copiedCount++;
        } catch (error) {
          console.error(`  ✗ Error copying Material Icons font ${sourceFile}:`, error.message);
          failedCount++;
        }
      }

      if (copiedCount > 0) {
        console.log(
          `✓ Copied ${copiedCount} Material Icons font files to dist/assets/fonts/material-icons`,
        );
      }
      if (failedCount > 0) {
        console.warn(`  ⚠ ${failedCount} Material Icons font files failed to copy`);
      }
    }
  } catch (error) {
    console.error('Error copying Material Icons fonts:', error);
    // 에러가 발생해도 빌드를 계속 진행
  }

  // favicon을 dist 루트로 복사 (public에서)
  const faviconFile = config.files?.favicon || 'favicon.svg';
  const faviconSource = path.join(paths.public.src, faviconFile);
  if (fs.existsSync(faviconSource)) {
    const faviconDest = path.join(paths.scripts.dest, faviconFile);
    fs.copyFileSync(faviconSource, faviconDest);
    console.log(`✓ Copied ${faviconFile} to dist root`);
  }

  // img를 dist/assets/img로 복사 (public/img에서)
  ensureDir(imgDest);

  try {
    // 소스 이미지 파일 찾기 (public/img에서)
    const imgSourcePattern = path.join(paths.public.src, 'img', '**/*').replace(/\\/g, '/');
    const sourceImages = await glob(imgSourcePattern, {
      nodir: true, // 디렉토리 제외, 파일만
      ignore: ['**/*.scss', '**/*.js'], // SCSS와 JS 파일 제외
    }).catch(() => []);

    if (sourceImages.length === 0) {
      console.warn('  ⚠ No source image files found.');
    } else {
      let copiedCount = 0;
      let failedCount = 0;

      for (const sourceFile of sourceImages) {
        try {
          const relativePath = path.relative(path.join(paths.public.src, 'img'), sourceFile);
          const destFile = path.join(imgDest, relativePath);
          const destDir = path.dirname(destFile);
          ensureDir(destDir);
          fs.copyFileSync(sourceFile, destFile);
          copiedCount++;
        } catch (error) {
          console.error(`  ✗ Error copying ${sourceFile}:`, error.message);
          failedCount++;
        }
      }

      if (copiedCount > 0) {
        console.log(`✓ Copied ${copiedCount} image files to dist/assets/img`);
      }
      if (failedCount > 0) {
        console.warn(`  ⚠ ${failedCount} image files failed to copy`);
      }
    }
  } catch (error) {
    console.error('Error copying images:', error);
  }
}

/**
 * 전체 빌드
 * @returns {Promise<void>}
 * @description 모든 파일을 빌드 (정리 → SCSS 컴파일 → HTML/Assets 처리)
 */
async function build() {
  try {
    await cleanBuild();
    ensureDir(paths.scripts.dest);
    ensureDir(paths.scss.dest);

    // SCSS 컴파일을 먼저 실행 (토큰 파일 생성 등)
    console.log('Starting SCSS compilation...');
    await compileSass();
    console.log('SCSS compilation completed.');

    // HTML과 Assets는 병렬 처리 가능
    console.log('Starting HTML and Assets processing...');
    await Promise.all([processHTML(), copyAssets()]);
    console.log('HTML and Assets processing completed.');

    console.log('Build completed!');
    const indexFile = config.files?.html?.index || 'index.html';
    console.log(
      `- Output: ${config.paths.dist}/${indexFile}, ${config.paths.html.dest}/, ${config.paths.scss.dest}/, ${config.paths.js.dest}/, ${config.paths.public.dest}/fonts/, ${config.paths.public.dest}/img/`,
    );
  } catch (error) {
    console.error('Build error:', error);
    throw error;
  }
}

/**
 * 개발 서버 (BrowserSync + watch 모드)
 * @param {Function} done - Gulp 완료 콜백
 * @description BrowserSync를 사용한 개발 서버 및 파일 변경 감지 (watch 모드)
 */
function serve(done) {
  // 개발 모드에서 소스맵 활성화를 위해 NODE_ENV 설정
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }

  // indexHtmlFile 변수 정의 (processHTML 함수와 동일)
  const indexHtmlFile = config.files?.html?.index || 'index.html';

  build()
    .then(() => {
      console.log('Build completed successfully');
      // BrowserSync 초기화
      server.init({
        server: {
          baseDir: paths.scripts.dest,
        },
        port: config.dev.port || 3000,
        open: config.dev.open !== false,
        notify: config.dev.notify !== false,
        logLevel: config.dev.logLevel || 'info',
        // CSS 파일 변경 시 자동 리로드
        files: [paths.scss.dest + '**/*.css'],
        // CSS injection 활성화 (페이지 리로드 없이 CSS만 업데이트)
        injectChanges: true,
        // CSS 파일 변경 감지
        watchOptions: {
          ignoreInitial: true,
        },
      });

      // SCSS 변경 시: 컴파일 후 CSS만 리로드
      const scssWatchPattern = [paths.scss.src + '**/*.scss'];

      console.log('SCSS watch pattern:', scssWatchPattern);

      let compileTimeout = null;
      watch(scssWatchPattern, { ignoreInitial: true }, function (done) {
        // debounce: 연속된 변경을 하나로 묶음 (무한 반복 방지)
        if (compileTimeout) {
          clearTimeout(compileTimeout);
        }

        compileTimeout = setTimeout(() => {
          console.log('SCSS 파일 변경 감지됨');
          compileSass()
            .then(() => {
              // CSS 컴파일 완료 후 브라우저에 반영
              if (server && server.active) {
                // CSS 파일 경로를 명시적으로 지정하여 리로드
                const cssOutput = config.files?.scss?.output || 'styles.css';
                const cssFilePath = path.join(paths.scss.dest, cssOutput);
                if (fs.existsSync(cssFilePath)) {
                  // BrowserSync의 stream을 사용하여 CSS만 업데이트 (페이지 리로드 없이)
                  server.reload(cssOutput);
                  console.log(`CSS 리로드 완료: ${cssOutput}`);
                } else {
                  // CSS 파일이 없으면 전체 페이지 리로드
                  server.reload();
                  console.log('페이지 리로드 완료 (CSS 파일 없음)');
                }
              }
              done();
            })
            .catch((error) => {
              console.error('SCSS compile error:', error);
              done(error);
            });
        }, 200);
      });
      // HTML 변경 시: 처리 후 페이지 리로드
      let htmlTimeout = null;
      watch(
        [
          path.join(config.paths.src, indexHtmlFile),
          paths.html.src + '*.html',
          path.join(config.paths.src, 'templates', '**', '*.html'),
        ],
        { ignoreInitial: true },
        function (done) {
          // debounce: 연속된 변경을 하나로 묶음
          if (htmlTimeout) {
            clearTimeout(htmlTimeout);
          }

          htmlTimeout = setTimeout(() => {
            console.log('HTML 파일 변경 감지됨');
            processHTML()
              .then(() => {
                if (server && server.active) {
                  server.reload();
                  console.log('페이지 리로드 완료');
                }
                done();
              })
              .catch((error) => {
                console.error('HTML process error:', error);
                done(error);
              });
          }, 300);
        },
      );
      // 에셋 변경 시: 복사 후 리로드
      let assetsTimeout = null;
      watch(
        [
          paths.public.src + 'fonts/**/*',
          paths.public.src + 'img/**/*',
          paths.public.src + 'favicon.svg',
          paths.js.src + '**/*',
          '!' + paths.scss.src + '**/*', // SCSS는 제외 (별도 watch에서 처리)
        ],
        { ignoreInitial: true },
        function (done) {
          // debounce: 연속된 변경을 하나로 묶음
          if (assetsTimeout) {
            clearTimeout(assetsTimeout);
          }

          assetsTimeout = setTimeout(() => {
            console.log('에셋 파일 변경 감지됨');
            copyAssets()
              .then(() => {
                if (server && server.active) {
                  server.reload();
                  console.log('에셋 리로드 완료');
                }
                done();
              })
              .catch((error) => {
                console.error('assets copy error:', error);
                done(error);
              });
          }, 300);
        },
      );

      done();
    })
    .catch((error) => {
      console.error('Initial build error:', error);
      done(error);
    });
}

/**
 * 프로덕션 빌드
 * @returns {Promise<void>}
 * @description 프로덕션 환경용 최적화된 빌드 (상대경로 사용 - file:// 프로토콜 지원)
 */
async function prod() {
  await cleanBuild();
  ensureDir(paths.scripts.dest);
  ensureDir(paths.scss.dest);

  // SCSS 컴파일을 먼저 실행 (토큰 파일 생성 등)
  console.log('Starting SCSS compilation...');
  await compileSass();
  console.log('SCSS compilation completed.');

  // 정적 리소스 복사 (JS, 폰트, 이미지 등)
  console.log('Starting static resources copying...');
  await copyAssets();
  console.log('Static resources copying completed.');

  // HTML 처리는 마지막에 실행 (CSS/JS 파일이 준비된 후)
  // 상대경로 사용: file:// 프로토콜에서도 작동하도록
  console.log('Starting HTML processing with relative paths...');
  await processHTML({
    useRelativePaths: true,
  });
  console.log('HTML processing completed.');

  // CSS 파일 내부의 절대 경로를 상대 경로로 변환 (file:// 프로토콜 지원)
  console.log('Converting CSS paths for file:// protocol...');
  const aliases = config.pathAliases || {};
  const assetsPath = aliases.assetsPath || '/assets';

  const cssFilePath = path.join(paths.scss.dest, config.files.scss.output || 'styles.css');
  if (fs.existsSync(cssFilePath)) {
    let cssContent = fs.readFileSync(cssFilePath, 'utf8');
    // 절대 경로를 상대 경로로 변환 (dist/assets/css/ 기준으로 ../)
    cssContent = cssContent.replace(new RegExp(`url\\(["']?${assetsPath}/`, 'g'), 'url("../');
    fs.writeFileSync(cssFilePath, cssContent, 'utf8');
    console.log(`✓ CSS paths converted: ${cssFilePath}`);
  }

  // 컴포넌트 및 페이지 CSS 파일도 변환
  const cssFiles = await glob(path.join(paths.scss.dest, '**/*.css').replace(/\\/g, '/'));
  for (const cssFile of cssFiles) {
    if (cssFile !== cssFilePath) {
      let cssContent = fs.readFileSync(cssFile, 'utf8');
      // 상대 경로 계산
      const relativeDepth = path
        .relative(paths.scss.dest, path.dirname(cssFile))
        .split(path.sep).length;
      const relativePrefix = '../'.repeat(relativeDepth + 1);
      cssContent = cssContent.replace(
        new RegExp(`url\\(["']?${assetsPath}/`, 'g'),
        `url("${relativePrefix}`,
      );
      fs.writeFileSync(cssFile, cssContent, 'utf8');
    }
  }

  console.log('Production build completed!');
  console.log('- Path Mode: relative (file:// protocol supported)');
}

// Gulp Tasks Export
exports.processHTML = processHTML;
exports.compileSass = compileSass;
exports.copyAssets = copyAssets;
exports.build = build;
exports.clean = cleanBuild;
exports.default = serve;
exports.prod = prod;
