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

  // ----- mail button: reveal + copy the address (many PCs have no default mail app, so mailto alone can do nothing) -----
  var mb = document.getElementById("mailBtn");
  var mi = document.getElementById("mailInfo");
  if (mb && mi) {
    mb.addEventListener("click", function () {
      var addr = mb.getAttribute("data-u") + "@" + mb.getAttribute("data-d");
      var copied = false;
      var show = function () {
        mi.hidden = false;
        mi.innerHTML = "";
        var t = document.createElement("span");
        t.className = "addr"; t.textContent = addr;
        var note = document.createElement("span");
        note.className = "note"; note.textContent = copied ? "已複製到剪貼簿" : "可直接選取複製";
        var g = document.createElement("a");
        g.href = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(addr);
        g.target = "_blank"; g.rel = "noopener"; g.textContent = "用 Gmail 撰寫";
        var m = document.createElement("a");
        m.href = "mailto:" + addr; m.textContent = "用預設郵件程式";
        mi.appendChild(t); mi.appendChild(note); mi.appendChild(g); mi.appendChild(m);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(function () { copied = true; show(); }, show);
      } else { show(); }
    });
  }

  // ----- hero avatar: smooth scroll to the author card and flash it -----
  var av = document.querySelector("a.hero-avatar");
  var author = document.querySelector(".author");
  if (av && author) {
    av.addEventListener("click", function (e) {
      e.preventDefault();
      var target = document.getElementById("about") || author;
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      author.classList.remove("flash");
      void author.offsetWidth;
      author.classList.add("flash");
      try { history.replaceState(null, "", "#about"); } catch (err) {}
    });
  }

  // ----- card spotlight -----
  document.querySelectorAll(".post-card").forEach(function (c) {
    c.addEventListener("mousemove", function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - r.left) + "px");
      c.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  });
})();
