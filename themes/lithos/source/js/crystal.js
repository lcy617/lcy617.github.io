/* ============================================================
   Lithos · 地质叙事粒子系统（四形态滚动 morph）
   ------------------------------------------------------------
   粒子在四个形态间随页面滚动平滑变换，每个形态对应一个章节：
     · hero   → 矿簇（多根六方柱晶体从基座生长 = Lithos 矿物）
     · 笔记   → 岩层（水平沉积层 = 知识积累）
     · 作品   → 代码网络（节点网格 = 用代码构建）
     · 研究展望 → 星云散开（发散探索）
   入场：粒子从四周飞入汇聚成矿簇。游离粒子在周围飘散。
   依赖：Three.js（import map 引入）
   ============================================================ */

import * as THREE from "three";

(function () {
  "use strict";

  // ===== 调试标记：确认本文件（含呼吸/磁吸交互）已在浏览器加载运行 =====
  console.log("%c[crystal.js] 呼吸+磁吸交互版已加载 ✅ v=20260809f（验证强度）", "color:#6db5a4;font-weight:bold;font-size:14px;");

  const canvas = document.querySelector(".lattice-canvas");
  if (!canvas) { console.warn("[crystal.js] 未找到 .lattice-canvas，脚本退出"); return; }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    console.log("[crystal.js] 检测到 prefers-reduced-motion，脚本退出");
    return;
  }

  try {
    const test = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!test) return;
  } catch (e) {
    return;
  }

  // ---- 配色（主题 token，克制）----
  const COLOR = new THREE.Color("#6db5a4");      // 矿物青绿（主）
  const COLOR_WARM = new THREE.Color("#d4a373"); // 赭石（岩层/交互）
  const COLOR_DEEP = new THREE.Color("#3a5a52"); // 深青（暗部）

  // ---- 参数 ----
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const COUNT = isMobile ? 5000 : 13000;
  const DRIFT_COUNT = isMobile ? 400 : 900;
  const SCALE = isMobile ? 2.0 : 2.4;

  // ---- 渲染器 / 场景 / 相机 ----
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isMobile,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(DPR);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  // 相机正对粒子中心（canvas 已从 header 下方开始，粒子居中不会被遮挡）
  camera.position.set(0, 0, 7.5);
  camera.lookAt(0, 0, 0);

  /* ============================================================
     矿簇定义：5 根六方柱晶体，各有底部位置/倾角/高度/粗细
     模拟矿物晶簇从基座向上生长、参差错落的样子
     ============================================================ */
  const CRYSTALS = [
    // [baseX, baseZ, tiltX, tiltZ, height, radius]
    [ 0.00,  0.00,  0.00,  0.00, 2.6, 0.45], // 中央主晶，最高最粗
    [ 0.95,  0.30,  0.25,  0.10, 2.0, 0.36], // 右前，倾斜
    [-0.85, -0.20, -0.22, -0.12, 1.8, 0.33], // 左后，倾斜
    [ 0.30, -0.80,  0.10, -0.28, 1.4, 0.28], // 右后矮
    [-0.50,  0.70, -0.15,  0.30, 1.2, 0.25], // 左前矮
  ];

  function applyCrystalColumn(col, fy, ang, out) {
    // col: 矿簇索引；fy: 沿柱高度的进度 0~1；ang: 柱面角度
    const c = CRYSTALS[col];
    const [bx, bz, tiltX, tiltZ, height, radius] = c;
    // 六方柱：半径随高度微缩（晶柱上窄下宽）
    const r = radius * (1.0 - fy * 0.15) * SCALE;
    const y = (fy - 0.15) * height * SCALE; // 从底部 15% 处开始
    // 局部柱面坐标
    let lx = Math.cos(ang) * r;
    let ly = y;
    let lz = Math.sin(ang) * r;
    // 倾斜（绕 X/Z 轴）
    ly += lx * tiltX;
    const lzTilt = lx * tiltZ;
    out[0] = lx + bx * SCALE;
    out[1] = ly + 0.2 * SCALE; // 整体上移一点
    out[2] = lz + bz * SCALE + lzTilt;
  }

  /* 形态 A：3D 起伏地形（盆地/函数曲线）
     粒子排成 XZ 平面网格，Y 高度由 sin/noise 函数决定，
     从斜视角看是连绵起伏的曲面，像心电图/地形等高线。 */
  const TERRAIN_W = isMobile ? 80 : 120;   // 网格宽（X 方向粒子数）
  const TERRAIN_D = isMobile ? 50 : 70;    // 网格深（Z 方向粒子数）
  const TERRAIN_XSPAN = SCALE * 3.4;       // X 方向铺满宽度
  const TERRAIN_ZSPAN = SCALE * 2.2;       // Z 方向深度
  function shapeTerrain(i, n, out, seed) {
    // 把粒子均匀映射到网格单元（带轻微抖动，避免完全机械）
    const cell = i % (TERRAIN_W * TERRAIN_D);
    const gx = cell % TERRAIN_W;
    const gz = Math.floor(cell / TERRAIN_W);
    const u = gx / (TERRAIN_W - 1) - 0.5;   // -0.5..0.5
    const v = gz / (TERRAIN_D - 1) - 0.5;
    const x = u * TERRAIN_XSPAN + (seed - 0.5) * (TERRAIN_XSPAN / TERRAIN_W) * 0.6;
    const z = v * TERRAIN_ZSPAN + ((seed * 7) % 1 - 0.5) * (TERRAIN_ZSPAN / TERRAIN_D) * 0.6;
    // Y 高度 = 多频正弦叠加（函数曲线起伏），中心略高呈盆地反相
    const y =
      Math.sin(u * 6.0 + 0.5) * 0.55 * SCALE +
      Math.cos(v * 5.0) * 0.45 * SCALE +
      Math.sin((u + v) * 9.0) * 0.18 * SCALE;
    out[0] = x;
    out[1] = y;
    out[2] = z;
  }

  // 形态 B：水平层状岩层
  function shapeStrata(i, n, out, seed) {
    const LAYERS = 7;
    const layer = Math.floor(seed * LAYERS);
    const yBase = (layer / (LAYERS - 1) - 0.5) * SCALE * 1.5;
    const angle = seed * 62.83 + i * 0.013;
    const radius = (0.4 + (seed * 17 % 1) * 0.95) * SCALE * 1.15;
    const wobble = Math.sin(angle * 3 + seed * 10) * 0.12 * SCALE;
    out[0] = Math.cos(angle) * radius + wobble;
    out[1] = yBase + Math.sin(angle * 2) * 0.08 * SCALE;
    out[2] = Math.sin(angle) * radius * 0.6;
  }

  // 形态 C：代码网络（3D 网格节点，有"连线"感）
  function shapeNetwork(i, n, out, seed) {
    // 在一个立方网格上分布粒子，模拟节点；半径略带随机让其有呼吸
    const GRID = 5; // 5x5x5
    const cell = (SCALE * 1.8) / (GRID - 1);
    const idx = i % (GRID * GRID * GRID);
    const gx = idx % GRID;
    const gy = Math.floor(idx / GRID) % GRID;
    const gz = Math.floor(idx / (GRID * GRID));
    out[0] = (gx - (GRID - 1) / 2) * cell + (seed - 0.5) * cell * 0.3;
    out[1] = (gy - (GRID - 1) / 2) * cell + ((seed * 7) % 1 - 0.5) * cell * 0.3;
    out[2] = (gz - (GRID - 1) / 2) * cell + ((seed * 13) % 1 - 0.5) * cell * 0.3;
  }

  // 形态 D：星云散开
  function shapeNebula(i, n, out, seed) {
    const phi = Math.acos(1 - 2 * seed);
    const theta = seed * 83.1 + i * 0.07;
    const r = (1.6 + (seed * 13 % 1) * 1.5) * SCALE;
    out[0] = Math.sin(phi) * Math.cos(theta) * r;
    out[1] = Math.cos(phi) * r * 0.9;
    out[2] = Math.sin(phi) * Math.sin(theta) * r;
  }

  // 预计算四形态
  const posA = new Float32Array(COUNT * 3); // 矿簇
  const posB = new Float32Array(COUNT * 3); // 岩层
  const posC = new Float32Array(COUNT * 3); // 代码网络
  const posD = new Float32Array(COUNT * 3); // 星云
  const seeds = new Float32Array(COUNT);
  const tmp = [0, 0, 0];
  for (let i = 0; i < COUNT; i++) {
    seeds[i] = Math.random();
    shapeTerrain(i, COUNT, tmp, seeds[i]);
    posA[i * 3] = tmp[0]; posA[i * 3 + 1] = tmp[1]; posA[i * 3 + 2] = tmp[2];
    shapeStrata(i, COUNT, tmp, seeds[i]);
    posB[i * 3] = tmp[0]; posB[i * 3 + 1] = tmp[1]; posB[i * 3 + 2] = tmp[2];
    shapeNetwork(i, COUNT, tmp, seeds[i]);
    posC[i * 3] = tmp[0]; posC[i * 3 + 1] = tmp[1]; posC[i * 3 + 2] = tmp[2];
    shapeNebula(i, COUNT, tmp, seeds[i]);
    posD[i * 3] = tmp[0]; posD[i * 3 + 1] = tmp[1]; posD[i * 3 + 2] = tmp[2];
  }

  // 入场起始：从四周飞入
  const startPos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const phi = Math.acos(1 - 2 * Math.random());
    const theta = Math.random() * Math.PI * 2;
    const r = SCALE * (4.5 + Math.random() * 3);
    startPos[i * 3]     = Math.sin(phi) * Math.cos(theta) * r;
    startPos[i * 3 + 1] = Math.cos(phi) * r;
    startPos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(posA, 3));
  geometry.setAttribute("aStart", new THREE.BufferAttribute(startPos, 3));
  geometry.setAttribute("aShapeA", new THREE.BufferAttribute(posA, 3));
  geometry.setAttribute("aShapeB", new THREE.BufferAttribute(posB, 3));
  geometry.setAttribute("aShapeC", new THREE.BufferAttribute(posC, 3));
  geometry.setAttribute("aShapeD", new THREE.BufferAttribute(posD, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  // ---- 主粒子 Shader：四形态 morph（uMorph 0→1→2→3）+ 呼吸生命感 ----
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: DPR },
      uIntro: { value: 0 },
      uMorph: { value: 0 },     // 0=矿簇 1=岩层 2=网络 3=星云
      uMouse: { value: new THREE.Vector3(9999, 9999, 9999) },
      uMouseActive: { value: 0 },
      uColor: { value: COLOR },
      uColorWarm: { value: COLOR_WARM },
      uColorDeep: { value: COLOR_DEEP },
    },
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uIntro;
      uniform float uMorph;
      uniform vec3 uMouse;
      uniform float uMouseActive;
      attribute vec3 aStart;
      attribute vec3 aShapeA;
      attribute vec3 aShapeB;
      attribute vec3 aShapeC;
      attribute vec3 aShapeD;
      attribute float aSeed;
      varying float vBright;
      varying float vWarm;
      varying float vPulse;   // 个体脉动强度（用于片段着色器心跳光）

      float smooth01(float x) { return clamp(x, 0.0, 1.0); }
      float ease(float t) { return t * t * (3.0 - 2.0 * t); }

      void main() {
        // —— 四形态分段 morph ——
        vec3 target;
        float warmth = 0.0;
        float nebulaK = 0.0;
        if (uMorph < 1.0) {
          float e = ease(smooth01(uMorph));
          target = mix(aShapeA, aShapeB, e);
          warmth = e * 0.4;
        } else if (uMorph < 2.0) {
          float e = ease(smooth01(uMorph - 1.0));
          target = mix(aShapeB, aShapeC, e);
          warmth = (1.0 - e) * 0.4;
        } else {
          float e = ease(smooth01(uMorph - 2.0));
          target = mix(aShapeC, aShapeD, e);
          nebulaK = e;
        }

        // —— 入场 ——
        float introE = uIntro * uIntro * (3.0 - 2.0 * uIntro);
        vec3 pos = mix(aStart, target, introE);

        // —— 常驻呼吸：粒子做缓慢的径向呼吸（一收一放），比纯缩放更易感知 ——
        // 每个粒子相位/幅度略有差异（aSeed），避免机械同步，形成群落呼吸
        float breathPhase = uTime * 1.2 + aSeed * 6.2831;
        float breath = sin(breathPhase);                       // -1..1
        // 径向呼吸：粒子相对形态中心点做小幅胀缩（约 ±0.12 单位，明显可见）
        pos += normalize(target + vec3(0.001)) * breath * 0.12 * (0.6 + aSeed * 0.4);

        // —— 微振动（生命感的底层颤动）——
        float jit = sin(uTime * 0.9 + aSeed * 28.0) * 0.012;
        pos += normalize(target + vec3(0.001)) * jit;

        // —— 鼠标交互：磁吸 + 环绕 + 脉动（生命感核心）——
        float mInf = 0.0;
        float pulse = 0.0;
        if (uMouseActive > 0.01) {
          vec3 toM = pos - uMouse;
          float d = length(toM);
          // 平滑影响范围（高斯衰减），影响半径加大到约 2.5 单位
          mInf = exp(-d * d * 0.25) * uMouseActive;

          // 磁吸：把粒子拉向鼠标（近处更强），而非推开
          vec3 dir = normalize(toM + vec3(0.001));
          float pull = mInf * 1.2;
          pos -= dir * pull;

          // 环绕：施加切向力，让粒子绕鼠标流转而非聚成一团
          // 切向 = 与径向垂直的方向（在 XY 平面内旋转 90°）
          vec3 tangent = normalize(vec3(-dir.y, dir.x, dir.z * 0.3) + vec3(0.001));
          pos += tangent * mInf * 0.7;

          // 脉动：靠近鼠标的粒子亮度随时间心跳（不同粒子心跳相位不同）
          float heartPhase = uTime * 3.0 + aSeed * 20.0;
          pulse = mInf * (sin(heartPhase) * 0.5 + 0.5);

          warmth = max(warmth, mInf);
        }

        float depth = (normalize(target + vec3(0.001)).z + 1.0) * 0.5;
        vBright = (1.0 - nebulaK * 0.45) * (0.55 + depth * 0.45);
        vWarm = clamp(warmth + mInf * 0.8, 0.0, 1.0);
        vPulse = pulse;

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        // 靠近鼠标的粒子略放大，强化"被吸引聚焦"的视觉
        float sizeBoost = 1.0 + mInf * 0.8;
        gl_PointSize = (4.5 + aSeed * 3.0) * uPixelRatio * (1.0 / -mv.z) * 7.0 * sizeBoost;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      uniform vec3 uColorWarm;
      uniform vec3 uColorDeep;
      varying float vBright;
      varying float vWarm;
      varying float vPulse;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uColor, uColorWarm, vWarm);
        col = mix(uColorDeep, col, vBright);
        col += (1.0 - d) * 0.18;
        // 心跳脉动：被吸引的粒子周期性变亮，像萤火虫/呼吸光点
        col += vPulse * 0.5;
        gl_FragColor = vec4(col, alpha * (0.45 + vBright * 0.5 + vPulse * 0.25));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  /* ============================================================
     游离粒子
     ============================================================ */
  const driftPos = new Float32Array(DRIFT_COUNT * 3);
  const driftSeed = new Float32Array(DRIFT_COUNT);
  for (let i = 0; i < DRIFT_COUNT; i++) {
    const phi = Math.acos(1 - 2 * Math.random());
    const theta = Math.random() * Math.PI * 2;
    const r = SCALE * (3.2 + Math.random() * 2.5);
    driftPos[i * 3]     = Math.sin(phi) * Math.cos(theta) * r;
    driftPos[i * 3 + 1] = Math.cos(phi) * r;
    driftPos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
    driftSeed[i] = Math.random();
  }
  const driftGeo = new THREE.BufferGeometry();
  driftGeo.setAttribute("position", new THREE.BufferAttribute(driftPos, 3));
  driftGeo.setAttribute("aSeed", new THREE.BufferAttribute(driftSeed, 1));
  const driftMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: DPR }, uColor: { value: COLOR } },
    vertexShader: /* glsl */`
      uniform float uTime; uniform float uPixelRatio; attribute float aSeed;
      varying float vAlpha;
      void main() {
        vec3 pos = position;
        pos.x += sin(uTime * 0.15 + aSeed * 20.0) * 0.4;
        pos.y += cos(uTime * 0.12 + aSeed * 15.0) * 0.4;
        pos.z += sin(uTime * 0.1 + aSeed * 25.0) * 0.3;
        vAlpha = 0.3 + aSeed * 0.5;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (2.0 + aSeed * 2.0) * uPixelRatio * (1.0 / -mv.z) * 7.0;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; varying float vAlpha;
      void main() {
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * vAlpha;
        gl_FragColor = vec4(uColor, a * 0.5);
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const drift = new THREE.Points(driftGeo, driftMat);
  scene.add(drift);

  // ---- 滚动 → morph：检测视口中心的 section，读其 data-morph ----
  let morphTarget = 0, morph = 0;
  const morphSections = Array.from(document.querySelectorAll("[data-morph]"));

  function onScroll() {
    if (!morphSections.length) return;
    const mid = window.scrollY + window.innerHeight * 0.5;
    // 找到当前包含视口中线的那个 section
    let cur = morphSections[0];
    for (const s of morphSections) {
      if (s.offsetTop <= mid) cur = s;
    }
    const m = parseInt(cur.getAttribute("data-morph"), 10);
    if (!isNaN(m)) morphTarget = m;
  }

  // ---- 鼠标 ----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const mouse3D = new THREE.Vector3(9999, 9999, 9999);
  let mouseActive = false, mouseStrength = 0;
  function updateMouse(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((cx - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((cy - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    raycaster.ray.intersectPlane(plane, mouse3D);
  }
  function onMove(e) {
    const p = e.touches ? e.touches[0] : e;
    updateMouse(p.clientX, p.clientY);
    mouseActive = true;
    // 调试：首次进入 canvas 时打印一次，确认事件链路通
    if (!window.__crystalMouseSeen) {
      window.__crystalMouseSeen = true;
      console.log("%c[crystal.js] 鼠标已进入粒子区域，磁吸交互激活 ✅", "color:#d4a373;font-weight:bold;");
    }
  }
  function onLeave() { mouseActive = false; }
  canvas.addEventListener("mousemove", onMove);
  canvas.addEventListener("mouseleave", onLeave);
  canvas.addEventListener("touchmove", onMove, { passive: true });
  canvas.addEventListener("touchend", onLeave);

  // ---- 尺寸：用 canvas 实际尺寸（canvas 从 header 下方开始，非全高）----
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ---- 动画 ----
  let rafId = null;
  const clock = new THREE.Clock();
  const startTime = performance.now();
  const invMat = new THREE.Matrix4();
  function animate() {
    const elapsed = (performance.now() - startTime) / 1000;
    const t = clock.getElapsedTime();
    material.uniforms.uTime.value = t;
    driftMat.uniforms.uTime.value = t;
    material.uniforms.uIntro.value = Math.min(1, elapsed / 2.5);
    // morph：到达目标后停止插值（差距极小直接吸附），减少稳态时每帧运算
    if (Math.abs(morphTarget - morph) > 0.001) {
      morph += (morphTarget - morph) * 0.06;
    } else {
      morph = morphTarget;
    }
    material.uniforms.uMorph.value = morph;

    // 相机视角随形态过渡：地形(morph≈0)斜俯视，其他形态正视
    // 用形态 A(0) 的权重做插值
    const terrainK = Math.max(0, 1 - morph);   // morph=0 时为 1，远离 0 趋近 0
    // 地形视角：高位斜俯视，看得到起伏曲面
    const tx = 0, ty = 3.2, tz = 6.2;   // 地形相机
    const nx = 0, ny = 0, nz = 7.5;     // 正常相机
    camera.position.x += (nx + (tx - nx) * terrainK - camera.position.x) * 0.05;
    camera.position.y += (ny + (ty - ny) * terrainK - camera.position.y) * 0.05;
    camera.position.z += (nz + (tz - nz) * terrainK - camera.position.z) * 0.05;
    camera.lookAt(0, terrainK * -0.2, 0);
    const ts = mouseActive ? 1.0 : 0.0;
    mouseStrength += (ts - mouseStrength) * 0.06;
    material.uniforms.uMouseActive.value = mouseStrength;
    if (mouseStrength > 0.01) {
      points.updateMatrixWorld();
      invMat.copy(points.matrixWorld).invert();
      material.uniforms.uMouse.value.copy(mouse3D).applyMatrix4(invMat);
    }
    points.rotation.y += 0.0008;
    drift.rotation.y -= 0.0004;
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }
  function onVisibility() {
    if (document.hidden) { if (rafId) { cancelAnimationFrame(rafId); rafId = null; } }
    else if (!rafId) { rafId = requestAnimationFrame(animate); }
  }
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  resize();
  onScroll();
  rafId = requestAnimationFrame(animate);
})();
