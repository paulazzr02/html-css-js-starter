/**
 * Custom Tokens JSON을 SCSS 변수로 변환하는 스크립트
 *
 * 사용 방법:
 * 1. 디자인 토큰을 JSON 형식으로 준비
 * 2. tokens/custom-tokens.json 파일에 저장
 * 3. npm run tokens:convert 실행
 *
 * 또는 자동으로 빌드 시 변환하려면 gulpfile.js에 통합
 */

const fs = require('fs');
const path = require('path');

// 설정 파일 로드
const config = require('../config/site.config.js');

// 설정
const TOKENS_DIR = path.join(__dirname, '../tokens');
const TOKENS_JSON = path.join(TOKENS_DIR, 'custom-tokens.json');
const OUTPUT_SCSS = path.join(__dirname, '../src/assets/scss/_custom-tokens.scss');
// CSS 변수는 _root.scss에서 자동으로 생성되므로 별도 CSS 파일 생성 불필요

// 단위 변환 설정
const UNIT_MODE = config.figmaTokens?.unit || 'px';
const REM_BASE = config.figmaTokens?.remBase || 16;
const PREFIX = config.figmaTokens?.prefix || '';

/**
 * 문자열에서 'figma' 관련 접두사를 제거 (대소문자 무시)
 * 예: "figma-colors" -> "colors", "figmaColors" -> "Colors", "figma" -> ""
 */
function cleanFigmaPrefix(str) {
  if (!str) return str;
  const lowerStr = str.toLowerCase();

  if (lowerStr.startsWith('figma-')) {
    // 'figma-' 제거 (figma-colors -> colors)
    return str.replace(/^figma-+/i, '');
  } else if (lowerStr === 'figma') {
    // 'figma' 키 자체는 비움
    return '';
  } else if (lowerStr.startsWith('figma')) {
    // 'figma'로 시작하는 다른 문자열 (figmaColors -> Colors)
    return str.replace(/^figma/i, '');
  }

  return str; // 변경 없음
}

/**
 * 색상 값을 SCSS 변수로 변환
 */
function convertColorValue(value) {
  if (typeof value === 'string') {
    // HEX 색상 (#RRGGBB 또는 #RRGGBBAA)
    if (value.startsWith('#')) {
      return value.toLowerCase();
    }
    // RGB/RGBA 형식
    if (value.startsWith('rgb')) {
      return value;
    }
    // 기타 문자열 (변수 참조 등)
    return value;
  }
  // 객체인 경우 (예: { r: 255, g: 0, b: 0 })
  if (value && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
    const r = Math.round(value.r * 255);
    const g = Math.round(value.g * 255);
    const b = Math.round(value.b * 255);
    const a = value.a !== undefined ? value.a : 1;
    if (a === 1) {
      return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
    }
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return String(value);
}

/**
 * 토큰을 CSS 변수로 변환
 */
function convertTokensToCss(tokens, prefix = '', indent = 0) {
  const indentStr = '  '.repeat(indent);
  let css = '';

  // 토큰을 재귀적으로 순회
  for (const [key, value] of Object.entries(tokens)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value) && !('value' in value)) {
      // 중첩된 객체인 경우
      const cleanKey = cleanFigmaPrefix(key); // <--- EDIT

      // 1. cleanKey가 비어있으면 (key가 'figma'였던 경우) prefix 변경 없이 재귀
      if (cleanKey === '') {
        css += convertTokensToCss(value, prefix, indent);
        continue;
      }

      // 2. cleanKey의 시작 하이픈 제거 (예: 'figma-colors' -> 'colors')
      let finalKey = cleanKey.replace(/^-+/, '');
      if (finalKey === '') continue; // 키가 비었으면 건너뜀

      let newPrefix = prefix ? `${prefix}-${finalKey}` : finalKey;

      css += convertTokensToCss(value, newPrefix, indent);
    } else {
      // 실제 토큰 값
      const cleanKey = cleanFigmaPrefix(key); // <--- EDIT
      if (cleanKey === '') continue; // key가 'figma'였으면 이 값은 무시

      // cleanKey의 시작 하이픈 제거
      let finalKey = cleanKey.replace(/^-+/, '');
      if (finalKey === '') continue;

      const tokenValue = value.value !== undefined ? value.value : value;
      const tokenType = value.type || 'color';
      const tokenDescription = value.description || '';

      let cssValue;
      if (tokenType === 'color') {
        cssValue = convertColorValue(tokenValue);
      } else if (
        tokenType === 'spacing' ||
        tokenType === 'sizing' ||
        tokenType === 'radius' ||
        tokenType === 'fontSize'
      ) {
        // 숫자 값에 단위 추가 (px 또는 rem)
        if (typeof tokenValue === 'number') {
          if (UNIT_MODE === 'rem') {
            const remValue = tokenValue / REM_BASE;
            cssValue = `${remValue.toFixed(4).replace(/\.?0+$/, '')}rem`;
          } else {
            cssValue = `${tokenValue}px`;
          }
        } else {
          cssValue = tokenValue;
        }
      } else {
        cssValue = tokenValue;
      }

      // CSS 변수명 생성 (--color-primary-500 형식)
      let varName = prefix ? `--${prefix}-${finalKey}` : `--${finalKey}`; // <--- EDIT

      if (tokenDescription) {
        css += `${indentStr}  /* ${tokenDescription} */\n`;
      }
      css += `${indentStr}  ${varName}: ${cssValue};\n`;
    }
  }

  return css;
}

/**
 * 토큰을 SCSS 변수로 변환
 */
function convertTokensToScss(tokens, prefix = '', indent = 0) {
  const indentStr = '  '.repeat(indent);
  let scss = '';

  // 토큰을 재귀적으로 순회
  for (const [key, value] of Object.entries(tokens)) {
    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === 'object' && !Array.isArray(value) && !('value' in value)) {
      // 중첩된 객체인 경우
      const cleanKey = cleanFigmaPrefix(key); // <--- EDIT

      // 1. cleanKey가 비어있으면 (key가 'figma'였던 경우) prefix 변경 없이 재귀
      if (cleanKey === '') {
        scss += convertTokensToScss(value, prefix, indent);
        continue;
      }

      scss += `${indentStr}// ${key}\n`; // 원본 키로 주석 유지

      // 2. cleanKey의 시작 하이픈 제거
      let finalKey = cleanKey.replace(/^-+/, '');
      if (finalKey === '') continue; // 키가 비었으면 건너뜀

      let newPrefix = prefix ? `${prefix}-${finalKey}` : finalKey;

      scss += convertTokensToScss(value, newPrefix, indent);
    } else {
      // 실제 토큰 값
      const cleanKey = cleanFigmaPrefix(key); // <--- EDIT
      if (cleanKey === '') continue; // key가 'figma'였으면 이 값은 무시

      // cleanKey의 시작 하이픈 제거
      let finalKey = cleanKey.replace(/^-+/, '');
      if (finalKey === '') continue;

      const tokenValue = value.value !== undefined ? value.value : value;
      const tokenType = value.type || 'color';
      const tokenDescription = value.description || '';

      let scssValue;
      if (tokenType === 'color') {
        scssValue = convertColorValue(tokenValue);
      } else if (
        tokenType === 'spacing' ||
        tokenType === 'sizing' ||
        tokenType === 'radius' ||
        tokenType === 'fontSize'
      ) {
        // 숫자 값에 단위 추가 (px 또는 rem)
        if (typeof tokenValue === 'number') {
          if (UNIT_MODE === 'rem') {
            // px를 rem으로 변환 (16px = 1rem 기준)
            const remValue = tokenValue / REM_BASE;
            // 소수점 4자리까지 표시 (예: 0.5rem, 1.25rem)
            scssValue = `${remValue.toFixed(4).replace(/\.?0+$/, '')}rem`;
          } else if (UNIT_MODE === 'auto') {
            // 값에 단위가 포함되어 있으면 그대로 사용
            scssValue = String(tokenValue);
          } else {
            // 기본값: px
            scssValue = `${tokenValue}px`;
          }
        } else {
          // 이미 문자열인 경우 (단위 포함 또는 변수 참조)
          scssValue = tokenValue;
        }
      } else {
        scssValue = tokenValue;
      }

      // prefix와 key를 조합하여 변수명 생성
      let varName = prefix ? `$${prefix}-${finalKey}` : `$${finalKey}`; // <--- EDIT

      if (tokenDescription) {
        scss += `${indentStr}// ${tokenDescription}\n`;
      }
      scss += `${indentStr}${varName}: ${scssValue} !default;\n`;
    }
  }

  return scss;
}

/**
 * Custom Tokens JSON을 SCSS로 변환
 */
function convertFigmaTokens() {
  // tokens 디렉토리 확인
  if (!fs.existsSync(TOKENS_DIR)) {
    fs.mkdirSync(TOKENS_DIR, { recursive: true });
    console.log(`✓ Created tokens directory: ${TOKENS_DIR}`);
  }

  // JSON 파일 확인
  if (!fs.existsSync(TOKENS_JSON)) {
    console.warn(`⚠ Tokens file not found: ${TOKENS_JSON}`);
    console.log('Please create custom-tokens.json file in tokens/ directory');

    // 빈 SCSS 파일 생성
    const emptyScss = `// ========================================
    // Custom Design Tokens (자동 생성됨)
    // @description 디자인 토큰 (custom-tokens.json에서 변환)
    //
    // 사용 방법:
    // 1. 디자인 토큰을 JSON 형식으로 준비
    // 2. tokens/custom-tokens.json 파일에 저장
    // 3. npm run tokens:convert 실행
    // ========================================

    // 토큰 파일이 없습니다.
    // 위의 사용 방법을 따라 토큰을 설정하세요.
    `;
    fs.writeFileSync(OUTPUT_SCSS, emptyScss, 'utf8');
    console.log(`✓ Created empty SCSS file: ${OUTPUT_SCSS}`);
    return;
  }

  // JSON 파일 읽기
  let tokensData;
  try {
    const jsonContent = fs.readFileSync(TOKENS_JSON, 'utf8');
    tokensData = JSON.parse(jsonContent);
  } catch (error) {
    console.error(`✗ Error reading tokens file: ${error.message}`);
    return;
  }

  // SCSS 헤더
  let scss = `// ========================================
  // Custom Design Tokens (자동 생성됨)
  // @description 디자인 토큰 (custom-tokens.json에서 변환)
  // 이 파일은 자동으로 생성되므로 수동 수정하지 마세요.
  // ========================================

  `;

  // 토큰 변환
  // Figma Tokens 플러그인 형식에 맞춰 처리
  let themeTokens;
  if (tokensData.$themes) {
    // Figma Tokens 플러그인 형식
    const defaultTheme = tokensData.$themes[0] || tokensData.$themes;
    const themeName = defaultTheme.name || defaultTheme;
    themeTokens = tokensData[themeName] || tokensData;
  } else {
    // 일반 JSON 형식
    themeTokens = tokensData;
  }

  // 디버깅: 토큰 개수 확인
  const countTokens = (obj, path = '') => {
    let count = 0;
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if ('value' in value) {
          count++;
        } else {
          count += countTokens(value, path ? `${path}.${key}` : key);
        }
      }
    }
    return count;
  };
  const totalTokens = countTokens(themeTokens);
  const colorTokens = themeTokens.color ? countTokens(themeTokens.color) : 0;
  console.log(`📊 토큰 통계:`);
  console.log(`   - 총 토큰 개수: ${totalTokens}`);
  console.log(`   - 색상 토큰 개수: ${colorTokens}`);

  // prefix 설정에 따라 변환
  scss += convertTokensToScss(themeTokens, PREFIX);

  // SCSS 파일 저장
  fs.writeFileSync(OUTPUT_SCSS, scss, 'utf8');
  console.log(`✓ Converted custom tokens to SCSS: ${OUTPUT_SCSS}`);
  console.log(`  Source: ${TOKENS_JSON}`);
  console.log(`  Note: CSS variables are automatically generated in _root.scss`);
}

// 실행
if (require.main === module) {
  convertFigmaTokens();
}

module.exports = { convertFigmaTokens };
