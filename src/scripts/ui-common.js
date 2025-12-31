/**
 * ========================================
 * UI Common JavaScript
 * ========================================
 *
 * @description
 * 템플릿 공통 UI JavaScript
 * 모든 페이지에서 공통으로 사용되는 기본 UI 기능을 제공합니다.
 *
 * @features
 * - 템플릿 초기화 (네비게이션 활성 상태)
 *
 * @initialization
 * DOMContentLoaded 이벤트에서 자동으로 초기화됩니다.
 * - initializeTemplate(): 공통 템플릿 초기화
 *
 * @note
 * 개별 프로젝트에서 필요한 기능은 이 파일에 추가하거나
 * 별도의 JavaScript 파일을 생성하여 사용하세요.
 *
 * ========================================
 */

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', function () {
  initializeTemplate();
});

// ----------------------------------------
// 공통 템플릿 기능
// ----------------------------------------

/**
 * 템플릿 초기화
 * 현재 페이지 경로에 맞는 네비게이션 링크에 active 클래스 추가
 *
 * @description
 * 네비게이션 링크의 href 속성과 현재 페이지 경로를 비교하여
 * 일치하는 링크에 'active' 클래스를 추가합니다.
 *
 * @usage
 * 네비게이션 구조:
 * <nav class="navbar-nav">
 *   <a class="nav-link" href="/">Home</a>
 *   <a class="nav-link" href="/about">About</a>
 * </nav>
 */
function initializeTemplate() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

  navLinks.forEach((link) => {
    const linkHref = link.getAttribute('href');
    if (linkHref === currentPath || linkHref === currentPath + '/') {
      link.classList.add('active');
    }
  });
}
