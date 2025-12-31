#!/usr/bin/env node

/**
 * 자동 페이지 생성 스크립트
 * 사용법: node config/scripts/generate-page.js <페이지명> [옵션]
 */

const fs = require('fs');
const path = require('path');
// config 디렉터리에서 site.config.js 직접 로드
const config = require('../site.config.js');

// 명령행 인수 파싱
const args = process.argv.slice(2);
const pageName = args[0];
const options = {
  title: args[1] || pageName.charAt(0).toUpperCase() + pageName.slice(1),
  description: args[2] || `${pageName} 페이지`,
  withBreadcrumb: args.includes('--breadcrumb'),
  template: args.includes('--template') ? args[args.indexOf('--template') + 1] : 'default',
  layout: args.includes('--layout') ? args[args.indexOf('--layout') + 1] : 'default',
};

if (!pageName) {
  console.error('사용법: node config/scripts/generate-page.js <페이지명> [제목] [설명] [옵션]');
  console.error('옵션:');
  console.error('  --breadcrumb     브레드크럼 포함');
  console.error('  --template <명>   템플릿 지정');
  console.error('  --layout <명>     레이아웃 지정');
  process.exit(1);
}

// 페이지 템플릿 생성
const pageTemplate = `<!DOCTYPE html>
<html lang="${config.site.language}">
  <head>
    @@include('../templates/_head.html', {
      page_main: false,
      page_name: "${pageName}",
      page_title: "${options.title}",
      page_description: "${options.description}",
      page_url: "/html/${pageName}.html"${
        options.withBreadcrumb
          ? `,
      breadcrumb: [
        { title: "${options.title}", url: "/html/${pageName}.html" }
      ]`
          : ''
      }
    })
  </head>
  <body>
    <div id="root">
      @@include('../templates/_header.html', {
        page_name: "${pageName}"${
          options.withBreadcrumb
            ? `,
        breadcrumb: [
          { title: "${options.title}", url: "/html/${pageName}.html" }
        ]`
            : ''
        }
      })

      <!-- Content -->
      <main class="layout__content" id="main" role="main">
        <div class="${config.html.default.containerClass} ${config.html.default.mainClass}">
          <div class="row">
            <div class="col-lg-8 mx-auto">
              <h1>${options.title}</h1>
              <p class="lead">${options.description}</p>

              <!-- 페이지 내용을 여기에 작성하세요 -->
              <div class="content">
                <p>페이지 내용을 작성해주세요.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      @@include('../templates/_footer.html')
    </div>

    @@include('../templates/_script.html')
  </body>
</html>`;

// 파일 생성
const pagePath = path.join(__dirname, '..', 'src', 'pages', `${pageName}.html`);

try {
  // 페이지 파일 생성
  fs.writeFileSync(pagePath, pageTemplate);
  console.log(`✅ ${pageName}.html 생성 완료`);

  console.log(`\n📝 다음 단계:`);
  console.log(`1. src/pages/${pageName}.html 파일을 편집하여 페이지 내용을 작성하세요`);
  console.log(`2. npm run dev 명령으로 개발 서버를 실행하세요`);
} catch (error) {
  console.error('❌ 파일 생성 중 오류 발생:', error.message);
  process.exit(1);
}
