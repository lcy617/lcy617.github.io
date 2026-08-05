/* ============================================================
   Lithos · 矿物晶格粒子可视化
   ------------------------------------------------------------
   概念：粒子按六方晶格规则缓慢"结晶"，鼠标接近时产生扰动，
        模拟地质矿物生长的抽象意象。克制、专业、地质味。
   ============================================================ */

(function () {
  "use strict";

  const canvas = document.querySelector(".lattice-canvas");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d");
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // 配色（与主题 token 对齐：矿物青绿 + 赭石暖色）
  const COLOR = "#6db5a4";
  const COLOR_WARM = "#d4a373";
  const COLOR_DIM = "rgba(109, 181, 164, 0.15)";

  // 晶格参数
  const SPACING = 46;          // 晶格点间距（像素）
  const POINT_RADIUS = 1.4;    // 静态点半径
  const LINK_DIST = SPACING * 1.08;  // 连线距离阈值
  const MOUSE_RADIUS = 150;    // 鼠标影响半径

  let W = 0, H = 0;
  let points = [];
  let mouse = { x: -9999, y: -9999, active: false };
  let rafId = null;
  let startTime = performance.now();

  // 自适应尺寸
  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildLattice();
  }

  // 构建六方晶格点阵
  function buildLattice() {
    points = [];
    const cols = Math.ceil(W / SPACING) + 2;
    const rows = Math.ceil(H / (SPACING * 0.866)) + 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * SPACING + (r % 2 ? SPACING / 2 : 0) - SPACING;
        const y = r * SPACING * 0.866 - SPACING;
        // 每个点带轻微随机相位，避免机械感
        points.push({
          ox: x, oy: y,        // 原始位置
          x: x, y: y,          // 当前位置
          phase: Math.random() * Math.PI * 2,
          // 入场延迟：按距左上角距离，形成"结晶波"
          delay: (x + y) * 0.0015 + Math.random() * 0.2,
        });
      }
    }
  }

  function draw(now) {
    const t = (now - startTime) / 1000;
    ctx.clearRect(0, 0, W, H);

    // 更新点位
    for (const p of points) {
      // 入场：晶格点按 delay 顺序"长出"
      const appear = Math.max(0, Math.min(1, (t - p.delay) * 1.2));
      if (appear <= 0) {
        p.x = p.ox; p.y = p.oy;
        continue;
      }

      // 缓慢呼吸位移（模拟晶格振动）
      const breathe = Math.sin(t * 0.6 + p.phase) * 1.2;
      let tx = p.ox + breathe;
      let ty = p.oy + Math.cos(t * 0.5 + p.phase) * 1.2;

      // 鼠标扰动：粒子被推开
      if (mouse.active) {
        const dx = tx - mouse.x;
        const dy = ty - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_RADIUS && dist > 0.01) {
          const force = (1 - dist / MOUSE_RADIUS) * 22;
          tx += (dx / dist) * force;
          ty += (dy / dist) * force;
        }
      }

      // 缓动到目标
      p.x += (tx - p.x) * 0.12;
      p.y += (ty - p.y) * 0.12;
      p._appear = appear;
    }

    // 画连线（相邻晶格点）
    ctx.lineWidth = 1;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      if (!a._appear) continue;
      // 只检查右侧和下方的邻居，避免重复（六方晶格每点约 6 邻居）
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        if (!b._appear) continue;
        // 快速剔除：超出可能的邻居范围
        const dx = b.x - a.x;
        if (dx > LINK_DIST || dx < -LINK_DIST) continue;
        const dy = b.y - a.y;
        if (dy > LINK_DIST || dy < -LINK_DIST) continue;
        const d = Math.hypot(dx, dy);
        if (d < LINK_DIST) {
          // 鼠标附近的连线变暖色
          let warmth = 0;
          if (mouse.active) {
            const mx = (a.x + b.x) / 2 - mouse.x;
            const my = (a.y + b.y) / 2 - mouse.y;
            const md = Math.hypot(mx, my);
            if (md < MOUSE_RADIUS) warmth = 1 - md / MOUSE_RADIUS;
          }
          const alpha = (1 - d / LINK_DIST) * 0.5 * Math.min(a._appear, b._appear);
          ctx.strokeStyle = warmth > 0.1
            ? `rgba(212, 163, 115, ${alpha * (0.5 + warmth * 0.5)})`
            : `rgba(109, 181, 164, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // 画点
    for (const p of points) {
      if (!p._appear) continue;
      let r = POINT_RADIUS * p._appear;
      let color = COLOR;
      // 鼠标附近的点变暖且变大
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d = Math.hypot(dx, dy);
        if (d < MOUSE_RADIUS) {
          const k = 1 - d / MOUSE_RADIUS;
          r += k * 1.8;
          color = k > 0.4 ? COLOR_WARM : COLOR;
        }
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = requestAnimationFrame(draw);
  }

  // 鼠标交互
  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  }
  function onLeave() {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  }

  // 触摸支持
  function onTouch(e) {
    if (e.touches.length === 0) return onLeave();
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    mouse.x = t.clientX - rect.left;
    mouse.y = t.clientY - rect.top;
    mouse.active = true;
  }

  // 可见性优化：标签页隐藏时暂停
  function onVisibility() {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else if (!rafId) {
      startTime = performance.now() - 0; // 继续，但不重置入场
      rafId = requestAnimationFrame(draw);
    }
  }

  // 初始化
  window.addEventListener("resize", resize);
  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mouseleave", onLeave);
  canvas.addEventListener("touchmove", onTouch, { passive: true });
  canvas.addEventListener("touchend", onLeave);
  document.addEventListener("visibilitychange", onVisibility);

  resize();
  rafId = requestAnimationFrame(draw);
})();
