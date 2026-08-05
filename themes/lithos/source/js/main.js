/* ============================================================
   Lithos · 主交互脚本
   轻量、克制，只做必要的事
   ============================================================ */

(function () {
  "use strict";

  // 当前年份已在 footer 用 Hexo 的 date() 渲染，无需 JS 补。

  // 移动端导航收起：点击链接后，无须特殊处理（无汉堡菜单）。
  // 如未来加菜单，此处扩展。

  // 给外链加 target="_blank" rel="noopener"（正文区域）
  document.querySelectorAll('.post-content a, .page-content a').forEach(function (a) {
    const href = a.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href) && a.host !== window.location.host) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });
})();
