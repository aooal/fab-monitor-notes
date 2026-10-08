(function () {
  // ----- theme -----
  var root = document.documentElement;
  function getTheme() {
    try { var t = localStorage.getItem("theme"); if (t) return t; } catch (e) {}
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("theme", t); } catch (e) {}
    var b = document.getElementById("themeBtn");
    if (b) b.textContent = t === "dark" ? "☀" : "☾";
  }
  setTheme(getTheme());
  var btn = document.getElementById("themeBtn");
  if (btn) btn.addEventListener("click", function () { setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark"); });

  // ----- reveal on scroll -----
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else { items.forEach(function (el) { el.classList.add("in"); }); }

  // ----- count up -----
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var target = parseInt(el.getAttribute("data-count"), 10);
    if (reduce) { el.textContent = target; return; }
    var started = false;
    var o = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || started) return;
      started = true;
      var t0 = performance.now(), dur = 1200;
      (function step(t) {
        var p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }, { threshold: 0.6 });
    o.observe(el);
  });

  // ----- reading progress -----
  var bar = document.getElementById("progress");
  if (bar) {
    window.addEventListener("scroll", function () {
      var h = document.documentElement;
      var p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      bar.style.width = Math.min(100, p * 100) + "%";
    }, { passive: true });
  }

  // ----- table of contents -----
  var toc = document.getElementById("toc");
  var post = document.querySelector("article.post");
  if (toc && post) {
    var hs = post.querySelectorAll("h2");
    var links = [];
    hs.forEach(function (h, i) {
      if (!h.id) h.id = "s" + (i + 1);
      var a = document.createElement("a");
      a.href = "#" + h.id; a.textContent = h.textContent;
      toc.appendChild(a); links.push(a);
    });
    if ("IntersectionObserver" in window) {
      var so = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) {
            links.forEach(function (l) { l.classList.toggle("on", l.getAttribute("href") === "#" + e.target.id); });
          }
        });
      }, { rootMargin: "-20% 0px -70% 0px" });
      hs.forEach(function (h) { so.observe(h); });
    }
  }

  // ----- copy buttons -----
  document.querySelectorAll("pre").forEach(function (pre) {
    var b = document.createElement("button");
    b.className = "copy"; b.type = "button"; b.textContent = "複製";
    b.addEventListener("click", function () {
      var text = pre.querySelector("code").innerText;
      var done = function () { b.textContent = "已複製"; setTimeout(function () { b.textContent = "複製"; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    });
    pre.appendChild(b);
  });

  // ----- mail button (address assembled here so it is not plain text in the page) -----
  var mb = document.getElementById("mailBtn");
  if (mb) { mb.href = "mailto:" + mb.getAttribute("data-u") + "@" + mb.getAttribute("data-d"); }

  // ----- card spotlight -----
  document.querySelectorAll(".post-card").forEach(function (c) {
    c.addEventListener("mousemove", function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - r.left) + "px");
      c.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });
})();
