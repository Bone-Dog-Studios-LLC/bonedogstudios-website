/* Bone Dog Studios — inside-the-sphere navigation constellation + scroll reveals.
   Camera sits at the sphere's center; ambient dots wrap around the viewer and a
   few labeled "link stars" navigate the site on click. All nav targets also
   exist as real <a> links in the header/footer — the canvas is enhancement. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Scroll reveals (both pages) ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); ro.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { ro.observe(el); });
  }

  /* ---------- Constellation ---------- */
  var canvas = document.getElementById("sphere");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var BONE = "#F2EBDD";

  /* Ambient stars on the unit sphere (golden-angle spiral). */
  var N = 420;
  var pts = [];
  var GA = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2;
    var r = Math.sqrt(1 - y * y);
    pts.push({ x: Math.cos(GA * i) * r, y: y, z: Math.sin(GA * i) * r });
  }

  /* Link stars: fixed directions chosen to ring the viewer near the equator,
     so a slow horizontal drift carries each one past the camera in turn. */
  function dir(azDeg, elDeg) {
    var az = azDeg * Math.PI / 180, el = elDeg * Math.PI / 180;
    return { x: Math.cos(el) * Math.sin(az), y: Math.sin(el), z: Math.cos(el) * Math.cos(az) };
  }
  var links = [
    { label: "plan",    href: "/plan/",                            d: dir(0, 8)    },
    { label: "ethos",   href: "#ethos",                            d: dir(60, -12) },
    { label: "work",    href: "#work",                             d: dir(125, 14) },
    { label: "contact", href: "mailto:admin@bonedogstudios.com",   d: dir(185, -6) },
    { label: "privacy", href: "/plan/privacy/",                    d: dir(245, 12) },
    { label: "terms",   href: "/plan/terms/",                      d: dir(305, -14)},
  ];
  links.forEach(function (l) { l.sx = 0; l.sy = 0; l.visible = false; l.hot = 0; });

  var W = 0, H = 0, dpr = 1, F = 0, cx = 0, cy = 0, fadeR = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    F = Math.min(W, H) * 0.85;         // focal length (px)
    cx = W / 2; cy = H / 2;
    fadeR = Math.min(W, H) * 0.30;     // keep the center calm around the dog
    needsDraw = true;
  }

  /* View angles. Drag "grabs the sky": stars follow the pointer. */
  var rotY = -0.35, rotX = 0.05;
  var BASE_VY = reduced ? 0 : 0.000045;
  var velY = BASE_VY, velX = 0;
  var dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, moved = 0;
  var hover = null, needsDraw = true;

  function rotate(p, sy, cyw, sx, cxw) {
    var x1 = p.x * cyw + p.z * sy;
    var z1 = -p.x * sy + p.z * cyw;
    var y1 = p.y * cxw - z1 * sx;
    var z2 = p.y * sx + z1 * cxw;
    return { x: x1, y: y1, z: z2 };
  }

  var MIN_Z = 0.22; // only draw within ~77 degrees of the view axis

  function centerFade(px, py) {
    var dx = px - cx, dy = py - cy;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d >= fadeR) return 1;
    var t = d / fadeR;
    return t * t; // quadratic ease: calm center, quick recovery
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var sy = Math.sin(rotY), cyw = Math.cos(rotY);
    var sx = Math.sin(rotX), cxw = Math.cos(rotX);

    for (var i = 0; i < N; i++) {
      var v = rotate(pts[i], sy, cyw, sx, cxw);
      if (v.z < MIN_Z) continue;
      var px = cx + (v.x / v.z) * F;
      var py = cy + (v.y / v.z) * F;
      if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
      var edge = Math.min(1, (v.z - MIN_Z) / 0.18);       // fade near the rim
      var size = Math.min(2.6, 1.1 / v.z);
      ctx.globalAlpha = (0.16 + 0.38 * v.z) * edge * centerFade(px, py);
      ctx.fillStyle = BONE;
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    }

    ctx.font = "500 14px 'Space Grotesk', system-ui, sans-serif";
    ctx.textBaseline = "middle";
    for (var j = 0; j < links.length; j++) {
      var L = links[j];
      var w = rotate(L.d, sy, cyw, sx, cxw);
      if (w.z < MIN_Z + 0.06) { L.visible = false; L.hot += (0 - L.hot) * 0.2; continue; }
      var lx = cx + (w.x / w.z) * F;
      var ly = cy + (w.y / w.z) * F;
      if (lx < 30 || lx > W - 30 || ly < 20 || ly > H - 20) { L.visible = false; continue; }
      L.sx = lx; L.sy = ly; L.visible = true;
      L.hot += ((hover === L ? 1 : 0) - L.hot) * 0.18;    // eased hover state
      var edge2 = Math.min(1, (w.z - MIN_Z) / 0.2);
      var fade = edge2 * (0.55 + 0.45 * centerFade(lx, ly));
      var rad = 3 + 1.6 * L.hot;

      ctx.globalAlpha = fade * (0.9 + 0.1 * L.hot);
      ctx.fillStyle = BONE;
      ctx.beginPath(); ctx.arc(lx, ly, rad, 0, Math.PI * 2); ctx.fill();

      ctx.globalAlpha = fade * (0.35 + 0.55 * L.hot);     // halo ring
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(lx, ly, rad + 5 + 3 * L.hot, 0, Math.PI * 2);
      ctx.strokeStyle = BONE; ctx.stroke();

      ctx.globalAlpha = fade * (0.65 + 0.35 * L.hot);
      ctx.fillText(L.label, lx + rad + 12, ly);
    }
    ctx.globalAlpha = 1;
  }

  function linkAt(x, y) {
    for (var j = 0; j < links.length; j++) {
      var L = links[j];
      if (!L.visible) continue;
      var lw = ctx.measureText(L.label).width;
      var dx = x - L.sx, dy = y - L.sy;
      if (Math.sqrt(dx * dx + dy * dy) < 22) return L;
      if (x > L.sx && x < L.sx + lw + 26 && Math.abs(dy) < 14) return L; // label hit box
    }
    return null;
  }

  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; moved = 0;
    lastX = downX = e.clientX; lastY = downY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    needsDraw = true;
  });
  canvas.addEventListener("pointermove", function (e) {
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (dragging) {
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      /* stars follow the pointer: dragging right pans the view left */
      velY = -dx * 0.00016;
      velX = dy * 0.00013;
      rotY += -dx * 0.0022; rotX += dy * 0.0018;
      rotX = Math.max(-0.9, Math.min(0.9, rotX));
      lastX = e.clientX; lastY = e.clientY;
    } else {
      hover = linkAt(mx, my);
    }
    canvas.style.cursor = hover ? "pointer" : (dragging ? "grabbing" : "grab");
    needsDraw = true;
  });
  ["pointerup", "pointercancel"].forEach(function (evt) {
    canvas.addEventListener(evt, function (e) {
      if (evt === "pointerup" && moved < 8) {
        var rect = canvas.getBoundingClientRect();
        var hit = linkAt(e.clientX - rect.left, e.clientY - rect.top);
        if (hit) {
          if (hit.href.charAt(0) === "#") {
            var target = document.querySelector(hit.href);
            if (target) target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
          } else {
            window.location.href = hit.href;
          }
        }
      }
      dragging = false;
      needsDraw = true;
    });
  });

  resize();
  window.addEventListener("resize", resize);

  var running = false, rafActive = false, last = 0;

  function tick(now) {
    if (!running) { rafActive = false; return; }
    var dt = Math.min(now - last, 50); last = now;
    if (!dragging) {
      rotY += velY * dt; rotX += velX * dt;
      rotX = Math.max(-0.9, Math.min(0.9, rotX));
      velX *= 0.96;
      velY = velY * 0.98 + BASE_VY * 0.02;   // momentum eases back to idle drift
    }
    var idle = !dragging && Math.abs(velX) < 1e-6 && Math.abs(velY - BASE_VY) < 1e-6 && BASE_VY === 0;
    var hotSettling = links.some(function (L) { return L.hot > 0.01 && L.hot < 0.99; });
    if (needsDraw || !idle || hotSettling) { draw(); needsDraw = false; }
    requestAnimationFrame(tick);
  }

  function startLoop() {
    if (!rafActive && running) {
      rafActive = true; last = performance.now();
      requestAnimationFrame(tick);
    }
  }

  /* Pause everything while the hero is off-screen. */
  new IntersectionObserver(function (entries) {
    running = entries[0].isIntersecting;
    if (running) startLoop();
  }).observe(canvas);
})();
