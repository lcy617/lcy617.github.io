/* ============================================================
   Lithos · 主交互脚本
   ============================================================ */

(function () {
  "use strict";

  // ---------- 移动端汉堡菜单 ----------
  const toggle = document.getElementById("nav-toggle");
  const nav = document.getElementById("site-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      const isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // 点击导航项后自动收起菜单
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });

    // 屏幕变宽时（横屏等）重置菜单状态
    window.addEventListener("resize", function () {
      if (window.innerWidth > 860 && nav.classList.contains("open")) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ---------- 外链新窗口打开 ----------
  document.querySelectorAll('.post-content a, .page-content a').forEach(function (a) {
    const href = a.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href) && a.host !== window.location.host) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });

  // ---------- 首页导航锚点：平滑滚动到对应章节 ----------
  document.querySelectorAll('a[href*="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      const hash = (a.getAttribute("href") || "").split("#")[1];
      if (!hash) return;
      const target = document.getElementById(hash);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        if (history.replaceState) history.replaceState(null, "", "#" + hash);
      }
    });
  });
})();
