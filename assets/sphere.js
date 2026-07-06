/* Bone Dog Studios — hero point-sphere + scroll reveals. No dependencies. */
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

  /* ---------- Point sphere ---------- */
  var canvas = document.getElementById("sphere");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var N = 480;
  var pts = [];
  var GA = Math.PI * (3 - Math.sqrt(5)); // golden angle
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2;
    var r = Math.sqrt(1 - y * y);
    pts.push({ x: Math.cos(GA * i) * r, y: y, z: Math.sin(GA * i) * r });
  }

  var W = 0, H = 0, dpr = 1, R = 0, cx = 0, cy = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.36;
    cx = W / 2; cy = H / 2;
  }
  resize();
  window.addEventListener("resize", resize);

  var rotY = 0, rotX = -0.28;
  var velY = 0.00012, velX = 0;           // rad per ms
  var BASE_VY = 0.00012;
  var dragging = false, lastX = 0, lastY = 0;

  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    velY = (e.clientX - lastX) * 0.00018;
    velX = (e.clientY - lastY) * 0.00012;
    lastX = e.clientX; lastY = e.clientY;
  });
  ["pointerup", "pointercancel"].forEach(function (evt) {
    canvas.addEventListener(evt, function () { dragging = false; });
  });

  var FOV = 3.2; // perspective strength
  function draw() {
    ctx.clearRect(0, 0, W, H);
    var sy = Math.sin(rotY), cyw = Math.cos(rotY);
    var sx = Math.sin(rotX), cxw = Math.cos(rotX);
    for (var i = 0; i < N; i++) {
      var p = pts[i];
      var x1 = p.x * cyw + p.z * sy;
      var z1 = -p.x * sy + p.z * cyw;
      var y1 = p.y * cxw - z1 * sx;
      var z2 = p.y * sx + z1 * cxw;
      var s = FOV / (FOV - z2);            // z2 in [-1,1]; s > 0 always
      var px = cx + x1 * R * s;
      var py = cy + y1 * R * s;
      var depth = (z2 + 1) / 2;            // 0 back, 1 front
      var size = (0.9 + depth * 1.7) * s;
      ctx.globalAlpha = 0.12 + depth * 0.55;
      ctx.fillStyle = "#F2EBDD";
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  if (reduced) { draw(); return; }         // static constellation, no loop

  /* The observer's initial callback (always fired on .observe) starts the
     loop — do NOT also call requestAnimationFrame at the bottom, or the
     loop runs twice per frame. */
  var running = false;
  var last = performance.now();
  new IntersectionObserver(function (entries) {
    var wasRunning = running;
    running = entries[0].isIntersecting;
    if (running && !wasRunning) { last = performance.now(); requestAnimationFrame(tick); }
  }).observe(canvas);

  function tick(now) {
    if (!running) return;
    var dt = Math.min(now - last, 50); last = now;
    rotY += velY * dt; rotX += velX * dt;
    rotX = Math.max(-1.2, Math.min(1.2, rotX));
    if (!dragging) {
      velX *= 0.97;                        // momentum decay
      velY = velY * 0.985 + BASE_VY * 0.015; // ease back to idle spin
    }
    draw();
    requestAnimationFrame(tick);
  }
  /* loop is started by the IntersectionObserver above */
})();
