/* Interactive widgets: event-flow sandbox, Lot state machine, post filter, syntax highlight, diagram draw-on.
   Everything runs in the browser. The sandbox only imitates the project's rules; it is not the real system. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* ------------------------------------------------------------------ syntax highlight */
  var JAVA_KW = "public|private|protected|static|final|class|interface|new|return|void|int|long|boolean|extends|implements|import|package|if|else|throw|throws|try|catch|null|true|false|this|switch|case|default|for|while|record";
  var SQL_KW = "INSERT|INTO|VALUES|ON|CONFLICT|DO|NOTHING|SELECT|FROM|WHERE|CREATE|TABLE|PRIMARY|KEY|NOT|NULL|UPDATE|SET|DELETE|AND|OR|DEFAULT";
  var LANGS = {
    java: new RegExp("(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|(\"(?:\\\\.|[^\"\\\\])*\")|(@[A-Za-z_]\\w*)|\\b(" + JAVA_KW + ")\\b|\\b([A-Z][A-Za-z0-9_]*)\\b|\\b([a-z_]\\w*)(?=\\()|(\\b\\d+(?:\\.\\d+)?\\b)", "g"),
    sql: new RegExp("(--[^\\n]*)|('(?:''|[^'])*')|(@@@)|\\b(" + SQL_KW + ")\\b|(@@@)|\\b([a-z_]\\w*)(?=\\()|(\\b\\d+\\b)", "gi"),
    json: new RegExp("(@@@)|(\"(?:\\\\.|[^\"\\\\])*\")|(@@@)|\\b(true|false|null)\\b|(@@@)|(@@@)|(-?\\b\\d+(?:\\.\\d+)?\\b)", "g")
  };
  // group index -> css class
  var GROUP_CLASS = { 1: "c", 2: "s", 3: "a", 4: "k", 5: "n", 6: "f", 7: "m" };
  function highlight(code, lang) {
    var re = LANGS[lang];
    if (!re) return esc(code);
    re.lastIndex = 0;
    var out = "", last = 0, m;
    while ((m = re.exec(code))) {
      out += esc(code.slice(last, m.index));
      var cls = null;
      for (var g = 1; g <= 7; g++) { if (m[g] !== undefined) { cls = GROUP_CLASS[g]; break; } }
      if (lang === "json" && cls === "s") {
        var rest = code.slice(re.lastIndex).match(/^\s*:/);
        if (rest) cls = "n";
      }
      out += '<span class="' + cls + '">' + esc(m[0]) + "</span>";
      last = re.lastIndex;
      if (m[0].length === 0) re.lastIndex++;
    }
    return out + esc(code.slice(last));
  }
  $$("pre code[data-lang]").forEach(function (c) {
    var lang = c.getAttribute("data-lang");
    if (LANGS[lang]) c.innerHTML = highlight(c.textContent, lang);
  });

  /* ------------------------------------------------------------------ diagram draw-on */
  $$(".diagram").forEach(function (d) {
    var svg = $("svg", d);
    if (!svg || reduce || !("IntersectionObserver" in window) || !svg.animate) return;
    var nodes = $$("g.node", svg), paths = $$("path.flow", svg);
    nodes.forEach(function (n) { n.style.opacity = 0; });
    var played = false;
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || played) return;
      played = true; io.disconnect();
      nodes.forEach(function (n, i) {
        n.style.transformBox = "fill-box"; n.style.transformOrigin = "center";
        n.animate([{ opacity: 0, transform: "scale(0.85)" }, { opacity: 1, transform: "scale(1)" }],
          { duration: 450, delay: i * 140, easing: "cubic-bezier(.2,.9,.3,1.2)", fill: "forwards" });
      });
      paths.forEach(function (p, i) {
        var len = p.getTotalLength ? p.getTotalLength() : 300;
        var ghost = p.cloneNode(false);
        ghost.removeAttribute("id"); ghost.removeAttribute("marker-end");
        ghost.setAttribute("class", "flow-draw");
        ghost.style.strokeDasharray = len; ghost.style.strokeDashoffset = len;
        p.parentNode.insertBefore(ghost, p.nextSibling);
        p.style.opacity = 0;
        var a = ghost.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration: 800, delay: 500 + i * 160, easing: "ease-out", fill: "forwards" });
        a.onfinish = function () { p.style.opacity = 1; ghost.remove(); };
      });
    }, { threshold: 0.35 });
    io.observe(d);
  });

  /* ------------------------------------------------------------------ post filter */
  (function () {
    var bar = $("#filters"); if (!bar) return;
    var cards = $$(".post-card");
    var tagSet = {};
    cards.forEach(function (c) { (c.getAttribute("data-tags") || "").split("|").forEach(function (t) { if (t) tagSet[t] = (tagSet[t] || 0) + 1; }); });
    var input = $("#q", bar), tagBox = $(".tagbar", bar), empty = $("#noMatch");
    var active = "";
    function mk(label, value) {
      var b = el("button", "tagbtn", label); b.type = "button"; b.setAttribute("data-tag", value);
      b.setAttribute("aria-pressed", value === active ? "true" : "false");
      b.addEventListener("click", function () { active = value; apply(); });
      return b;
    }
    tagBox.appendChild(mk("全部", ""));
    Object.keys(tagSet).forEach(function (t) { tagBox.appendChild(mk(t, t)); });
    function apply() {
      var q = input.value.trim().toLowerCase(), shown = 0;
      $$(".tagbtn", tagBox).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-tag") === active ? "true" : "false"); });
      cards.forEach(function (c) {
        var tags = (c.getAttribute("data-tags") || "").split("|");
        var ok = (!active || tags.indexOf(active) >= 0) && (!q || (c.getAttribute("data-search") || "").toLowerCase().indexOf(q) >= 0);
        c.classList.toggle("is-hidden", !ok);
        if (ok) { shown++; c.classList.add("in"); }
      });
      empty.hidden = shown !== 0;
    }
    input.addEventListener("input", apply);
    bar.hidden = false;
  })();

  /* ------------------------------------------------------------------ Lot state machine */
  $$('[data-widget="lot-fsm"]').forEach(function (root) {
    var status = "CREATED", step = "-", steps = ["LITHO", "ETCH", "CVD", "CMP", "IMPLANT"], idx = -1;
    var ns = "http://www.w3.org/2000/svg";
    root.innerHTML =
      '<svg viewBox="0 0 640 300" role="img" aria-label="Lot 狀態機互動圖">' +
      '<defs><marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#8a94b5"/></marker></defs>' +
      '<path class="e" id="e-trackin" d="M170 110 L250 110" marker-end="url(#fa)"/>' +
      '<path class="e" id="e-move" d="M300 78 C300 20 380 20 380 78" marker-end="url(#fa)"/>' +
      '<path class="e" id="e-complete" d="M410 110 L490 110" marker-end="url(#fa)"/>' +
      '<path class="e" id="e-hold" d="M330 144 L330 206" marker-end="url(#fa)"/>' +
      '<path class="e" id="e-release" d="M290 206 L290 144" marker-end="url(#fa)"/>' +
      '<text class="l" x="210" y="98" text-anchor="middle">track-in</text>' +
      '<text class="l" x="340" y="38" text-anchor="middle">move</text>' +
      '<text class="l" x="450" y="98" text-anchor="middle">complete</text>' +
      '<text class="l" x="338" y="180">hold</text><text class="l" x="282" y="180" text-anchor="end">release</text>' +
      '<g class="s" data-s="CREATED"><rect x="30" y="80" width="140" height="60" rx="14"/><text x="100" y="116" text-anchor="middle">CREATED</text></g>' +
      '<g class="s" data-s="IN_PROCESS"><rect x="250" y="80" width="160" height="60" rx="14"/><text x="330" y="116" text-anchor="middle">IN_PROCESS</text></g>' +
      '<g class="s" data-s="COMPLETED"><rect x="490" y="80" width="120" height="60" rx="14"/><text x="550" y="116" text-anchor="middle">COMPLETED</text></g>' +
      '<g class="s" data-s="ON_HOLD"><rect x="250" y="206" width="160" height="60" rx="14"/><text x="330" y="242" text-anchor="middle">ON_HOLD</text></g>' +
      "</svg>";
    var info = el("div", "fsm-info");
    var btns = el("div", "fsm-btns");
    var out = el("div", "fsm-out");
    var ops = [["track-in", "進站"], ["move", "換站"], ["hold", "暫停"], ["release", "釋放"], ["complete", "完成"]];
    ops.forEach(function (o) {
      var b = el("button", "btn small", o[1] + "(" + o[0] + ")"); b.type = "button";
      b.addEventListener("click", function () { act(o[0]); });
      btns.appendChild(b);
    });
    var rst = el("button", "btn small ghost", "重設"); rst.type = "button"; rst.addEventListener("click", function () { status = "CREATED"; step = "-"; idx = -1; out.className = "fsm-out"; out.textContent = "已重設為新建立的批次。"; paint(); });
    btns.appendChild(rst);
    root.appendChild(btns); root.appendChild(info); root.appendChild(out);
    function paint() {
      $$("g.s", root).forEach(function (g) { g.classList.toggle("on", g.getAttribute("data-s") === status); });
      info.innerHTML = "目前狀態：<b>" + status + "</b> · 站點：<b>" + step + "</b>";
    }
    function pulse(id) { var p = $("#e-" + id, root); if (!p) return; p.classList.remove("pulse"); void p.getBoundingClientRect(); p.classList.add("pulse"); setTimeout(function () { p.classList.remove("pulse"); }, 900); }
    function shake() { var g = $('g.s[data-s="' + status + '"]', root); if (!g) return; g.classList.remove("shake"); void g.getBoundingClientRect(); g.classList.add("shake"); setTimeout(function () { g.classList.remove("shake"); }, 600); }
    function nextStep() { idx = Math.min(idx + 1, steps.length - 1); step = steps[idx]; }
    function act(op) {
      var ok = false;
      if (op === "track-in" && status === "CREATED") { status = "IN_PROCESS"; nextStep(); ok = true; }
      else if (op === "move" && status === "IN_PROCESS") { nextStep(); ok = true; }
      else if (op === "hold" && status === "IN_PROCESS") { status = "ON_HOLD"; ok = true; }
      else if (op === "release" && status === "ON_HOLD") { status = "IN_PROCESS"; ok = true; }
      else if (op === "complete" && status === "IN_PROCESS") { status = "COMPLETED"; ok = true; }
      if (ok) {
        out.className = "fsm-out ok"; out.textContent = "200 OK · " + op + " 成功，現在是 " + status + (op === "hold" ? "（暫停必須填原因，這裡以 demo 代入）" : "");
        pulse(op === "track-in" ? "trackin" : op);
      } else {
        out.className = "fsm-out bad"; out.textContent = "409 Conflict · InvalidLotOperationException：狀態是 " + status + "，不能執行 " + op;
        shake();
      }
      paint();
    }
    paint();
  });

  /* ------------------------------------------------------------------ event flow sandbox */
  (function () {
    var root = $("#sandbox"); if (!root) return;
    var STEPS = ["LITHO", "ETCH", "CVD", "CMP", "IMPLANT"], EQP = "EQP-ETCH-01";
    var Q_EQ = "equipment-service.machine-events", Q_LOT = "lot-service.machine-events";
    var S, busy = false, started = Date.now(), SPEED = 1;

    root.innerHTML =
      '<div class="pg-grid">' +
      '<div class="pg-stage" id="pgStage">' +
      '<div class="pg-node sim" id="n-sim"><b>equipment-simulator</b><small>發布事件</small></div>' +
      '<div class="pg-node mq" id="n-mq"><b>fab.events</b><small>topic exchange</small></div>' +
      '<div class="pg-col">' +
      '<div class="pg-node svc" id="n-eq"><b>equipment-service</b><div class="st" id="st-eq"></div><small id="ct-eq"></small></div>' +
      '<div class="pg-node svc" id="n-lot"><b>lot-service</b><div class="st" id="st-lot"></div><small id="ct-lot"></small></div>' +
      "</div>" +
      '<div class="pg-node dlq" id="n-dlq"><b>死信佇列（.dlq）</b><div class="st" id="st-dlq"></div></div>' +
      "</div>" +
      '<div class="pg-side"><div class="pg-ctl" id="pgCtl"></div><div class="pg-log" id="pgLog" aria-live="polite"></div></div>' +
      "</div>" +
      '<p class="pg-note">這是在瀏覽器裡跑的小型模擬，規則與專案的實際設計一致（冪等、業務錯誤不重試、技術錯誤重試 3 次），但不是真的連到 RabbitMQ。</p>';

    var stage = $("#pgStage", root), logBox = $("#pgLog", root), ctl = $("#pgCtl", root);

    function reset() {
      S = { seq: 0, lot: null, stepIdx: 0, last: null, flakyLeft: 0,
        eq: { status: "IDLE", lot: null, done: {}, n: 0, dup: 0 },
        lots: { svc: { items: {}, done: {}, n: 0, dup: 0 } }, dlq: { eq: 0, lot: 0 } };
      logBox.innerHTML = ""; started = Date.now();
      log("sys", "已重設。先按「① 建立批次」，或故意跳過它看看會發生什麼。");
      render();
    }
    function ts() { var s = Math.floor((Date.now() - started) / 1000); return ("0" + Math.floor(s / 60)).slice(-2) + ":" + ("0" + (s % 60)).slice(-2); }
    function log(kind, text) {
      var l = el("div", "ln " + kind); l.appendChild(el("span", "t", ts())); l.appendChild(el("span", "m", text));
      logBox.appendChild(l); while (logBox.children.length > 60) logBox.removeChild(logBox.firstChild);
      logBox.scrollTop = logBox.scrollHeight;
    }
    function render() {
      var e = S.eq, items = S.lots.svc.items;
      $("#st-eq", root).innerHTML = EQP + " · <b class=\"" + e.status + "\">" + e.status + "</b>" + (e.lot ? " · " + e.lot : "");
      $("#ct-eq", root).textContent = "已處理 " + e.n + " · 略過重複 " + e.dup;
      var keys = Object.keys(items);
      $("#st-lot", root).innerHTML = keys.length ? keys.map(function (k) { var l = items[k]; return k + " · <b class=\"" + l.status + "\">" + l.status + "</b>" + (l.step ? " @" + l.step : ""); }).join("<br>") : "（還沒有任何批次）";
      $("#ct-lot", root).textContent = "已處理 " + S.lots.svc.n + " · 略過重複 " + S.lots.svc.dup;
      $("#st-dlq", root).innerHTML = "equipment:<b>" + S.dlq.eq + "</b> · lot:<b>" + S.dlq.lot + "</b>";
    }
    function center(node) {
      var r = node.getBoundingClientRect(), s = stage.getBoundingClientRect();
      return { x: r.left - s.left + r.width / 2, y: r.top - s.top - 6 };
    }
    function fly(from, to, label, color) {
      if (reduce || !stage.animate) return Promise.resolve();
      var a = center(from), b = center(to);
      var p = el("div", "pg-packet", label); p.style.background = color;
      stage.appendChild(p);
      function at(pt, sc) { return "translate(" + pt.x + "px," + pt.y + "px) translate(-50%,-50%) scale(" + sc + ")"; }
      var anim = p.animate([
        { transform: at(a, 0.8), opacity: 0 },
        { transform: at(a, 1), opacity: 1, offset: 0.12 },
        { transform: at(b, 1), opacity: 1 }
      ], { duration: 1600 * SPEED, easing: "ease-in-out", fill: "forwards" });
      function done() {
        // the label stays on the receiving node for a moment so it can be read
        setTimeout(function () {
          var f = p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" });
          f.onfinish = function () { p.remove(); };
        }, 1400 * SPEED + 500);
      }
      return anim.finished.then(done, function () { p.remove(); });
    }
    function flash(id) { var n = $("#" + id, root); n.classList.remove("hit"); void n.offsetWidth; n.classList.add("hit"); }
    function uid() { return "evt-" + Math.random().toString(16).slice(2, 6); }

    function BizError(cls, msg) { this.cls = cls; this.msg = msg; }

    function applyEquipment(ev) {
      var e = S.eq;
      if (ev.type === "machine.track-in") {
        if (e.status === "DOWN") throw new BizError("InvalidEquipmentOperationException", "Equipment " + EQP + " is DOWN");
        if (e.lot) throw new BizError("InvalidEquipmentOperationException", "Equipment " + EQP + " already holds lot " + e.lot);
        e.status = "RUN"; e.lot = ev.lotNo;
      } else if (ev.type === "machine.track-out") {
        if (e.lot !== ev.lotNo) throw new BizError("InvalidEquipmentOperationException", "Equipment " + EQP + " is not processing lot " + ev.lotNo);
        e.lot = null; if (e.status === "RUN") e.status = "IDLE";
      } else if (ev.type === "machine.status") {
        if (ev.status === "IDLE" && e.lot) throw new BizError("InvalidEquipmentOperationException", "Equipment " + EQP + " still holds lot " + e.lot);
        var from = e.status; e.status = ev.status;
        if (from !== e.status) log("info", "equipment-service 發布 equipment.status-changed " + from + " → " + e.status + "（alarm-service 預計第 3 週才訂閱）");
      }
    }
    function applyLot(ev) {
      var L = S.lots.svc.items;
      if (ev.type === "lot.created") {
        if (L[ev.lotNo]) { log("info", "lot-service：" + ev.lotNo + " 已存在，忽略 lot.created"); return; }
        L[ev.lotNo] = { status: "CREATED", step: null }; return;
      }
      var l = L[ev.lotNo];
      if (!l) throw new BizError("LotNotFoundException", "lotNo " + ev.lotNo);
      if (ev.type === "machine.track-in") {
        if (l.status === "CREATED") { l.status = "IN_PROCESS"; l.step = ev.step; }
        else if (l.status === "IN_PROCESS") { l.step = ev.step; }
        else throw new BizError("InvalidLotOperationException", "cannot move a lot in status " + l.status);
      } else if (ev.type === "machine.track-out") {
        if (l.status !== "IN_PROCESS") throw new BizError("InvalidLotOperationException", "cannot " + (ev.nextStep ? "move" : "complete") + " a lot in status " + l.status);
        if (ev.nextStep) l.step = ev.nextStep; else { l.status = "COMPLETED"; }
      }
    }

    async function deliver(target, ev) {
      var isEq = target === "eq", name = isEq ? "equipment-service" : "lot-service", queue = isEq ? Q_EQ : Q_LOT;
      var st = isEq ? S.eq : S.lots.svc;
      await fly($("#n-mq", root), $(isEq ? "#n-eq" : "#n-lot", root), ev.type.replace("machine.", ""), ev.color);
      flash(isEq ? "n-eq" : "n-lot");
      try {
        if (ev.bad) throw new BizError("InvalidFormatException", 'Cannot deserialize UUID from "' + ev.eventId + '"');
        if (st.done[ev.eventId]) { st.dup++; log("dup", name + "：eventId=" + ev.eventId + " 已處理過，略過（冪等）"); render(); return; }
        if (!isEq && S.flakyLeft > 0) {
          var waits = [1000, 2000], n = 0;
          while (S.flakyLeft > 0) {
            n++; S.flakyLeft--;
            log("retry", name + "：第 " + n + " 次失敗（CannotCreateTransactionException，資料庫閃斷），" + (waits[n - 1] / 1000) + " 秒後重試");
            await sleep(waits[n - 1]);
          }
          log("info", name + "：資料庫恢復，第 " + (n + 1) + " 次嘗試成功");
          markFlaky(false);
        }
        (isEq ? applyEquipment : applyLot)(ev);
        st.done[ev.eventId] = true; st.n++;
        log("ok", name + "：" + ev.type + " 處理完成");
        render();
      } catch (err) {
        if (!(err instanceof BizError)) throw err;
        log("dead", "Dead-lettered " + ev.type + " from " + queue + " (not retryable): " + err.cls + ": " + err.msg);
        await fly($(isEq ? "#n-eq" : "#n-lot", root), $("#n-dlq", root), "dead", "#ff6b8b");
        if (isEq) S.dlq.eq++; else S.dlq.lot++;
        flash("n-dlq"); render();
      }
      await sleep(400 * SPEED);
    }
    async function send(ev) {
      S.last = ev;
      log("send", "模擬器發布 " + ev.type + (ev.lotNo ? " " + ev.lotNo : "") + " eventId=" + ev.eventId);
      await fly($("#n-sim", root), $("#n-mq", root), ev.type.replace("machine.", ""), ev.color);
      flash("n-mq");
      await sleep(600 * SPEED);
      if (ev.type !== "lot.created") { await deliver("eq", ev); await sleep(900 * SPEED); }
      if (ev.type !== "machine.status") await deliver("lot", ev);
    }
    var COLORS = { "lot.created": "#8b7bff", "machine.track-in": "#38e1c0", "machine.track-out": "#ffb86b", "machine.status": "#7aa7ff" };
    function mkEv(type, extra) {
      var ev = { type: type, eventId: uid(), color: COLORS[type] };
      for (var k in extra) ev[k] = extra[k];
      return ev;
    }
    function curLot() { return S.lot || "LOT-0001"; }

    var actions = [
      { id: "create", label: "① 建立批次", hint: "發布 lot.created：lot-service 建立批次（CREATED）", group: "正常流程", run: function () { S.seq++; S.lot = "LOT-" + ("000" + S.seq).slice(-4); S.stepIdx = 0; return send(mkEv("lot.created", { lotNo: S.lot })); } },
      { id: "in", label: "② 機台進站", hint: "發布 machine.track-in：機台開始處理，批次進入 IN_PROCESS", group: "正常流程", run: function () { return send(mkEv("machine.track-in", { lotNo: curLot(), step: STEPS[Math.min(S.stepIdx, 4)] })); } },
      { id: "out", label: "③ 機台出站", hint: "發布 machine.track-out：換到下一站；最後一站則完成批次", group: "正常流程", run: function () { var next = STEPS[S.stepIdx + 1] || null; var ev = mkEv("machine.track-out", { lotNo: curLot(), nextStep: next }); if (S.stepIdx < STEPS.length) S.stepIdx++; return send(ev); } },
      { id: "dup", label: "重送上一則事件", hint: "同一個 eventId 再來一次：消費者會辨識並略過（冪等）", group: "冪等", run: function () { if (!S.last) { log("sys", "還沒有事件可以重送，先按 ①。"); return Promise.resolve(); } var again = {}; for (var k in S.last) again[k] = S.last[k]; log("send", "模擬器重送上一則（同一個 eventId=" + again.eventId + "）"); return send(again); } },
      { id: "bad", label: "送壞訊息", hint: "eventId 不是 UUID：業務錯誤，不重試，直接進死信佇列", group: "業務錯誤", run: function () { var ev = mkEv("machine.track-in", { lotNo: curLot(), step: "ETCH" }); ev.eventId = "not-a-uuid"; ev.bad = true; return send(ev); } },
      { id: "unknown", label: "對不存在的批次進站", hint: "lot-service 找不到批次 → 直接進死信佇列；equipment-service 不認識批次，仍照常處理", group: "業務錯誤", run: function () { return send(mkEv("machine.track-in", { lotNo: "LOT-9999", step: "ETCH" })); } },
      { id: "down", label: "機台回報 DOWN", hint: "machine.status DOWN：機台故障，equipment-service 會發布 status-changed", group: "機台狀態", run: function () { return send(mkEv("machine.status", { status: "DOWN" })); } },
      { id: "idle", label: "機台回報 IDLE", hint: "若機台手上還有批次，設為 IDLE 會被拒絕（進死信佇列）", group: "機台狀態", run: function () { return send(mkEv("machine.status", { status: "IDLE" })); } },
      { id: "flaky", label: "資料庫閃斷：關", toggle: true, hint: "開啟後，lot-service 下一則訊息會失敗 2 次再成功：技術錯誤才會重試（1 秒、2 秒）", group: "技術錯誤" },
      { id: "reset", label: "重設", hint: "全部歸零重來", group: "", ghost: true, run: function () { reset(); return Promise.resolve(); } }
    ];
    var flakyBtn;
    function markFlaky(on) { S.flakyLeft = on ? 2 : 0; flakyBtn.textContent = "資料庫閃斷：" + (on ? "開" : "關"); flakyBtn.setAttribute("aria-pressed", on ? "true" : "false"); }
    var groups = {};
    actions.forEach(function (a) {
      var g = a.group || "_";
      if (!groups[g]) { groups[g] = el("div", "pg-grp"); if (a.group) groups[g].appendChild(el("span", "gl", a.group)); ctl.appendChild(groups[g]); }
      var b = el("button", "btn small" + (a.ghost ? " ghost" : ""), a.label); b.type = "button"; b.title = a.hint; b.setAttribute("data-act", a.id);
      if (a.toggle) { flakyBtn = b; b.setAttribute("aria-pressed", "false"); b.addEventListener("click", function () { markFlaky(S.flakyLeft === 0); log("sys", S.flakyLeft ? "已開啟：lot-service 下一則訊息會遇到資料庫閃斷。" : "已關閉資料庫閃斷。"); }); }
      else b.addEventListener("click", function () {
        if (busy) return;
        busy = true; root.classList.add("busy");
        Promise.resolve(a.run()).catch(function (e) { log("dead", "模擬器內部錯誤：" + e); }).then(function () { busy = false; root.classList.remove("busy"); });
      });
      groups[g].appendChild(b);
    });
    var sp = el("div", "pg-grp"); sp.appendChild(el("span", "gl", "動畫速度"));
    [["慢", 1], ["中", 0.5], ["快", 0.2]].forEach(function (o) {
      var b = el("button", "btn small", o[0]); b.type = "button"; b.setAttribute("aria-pressed", o[1] === SPEED ? "true" : "false");
      b.addEventListener("click", function () { SPEED = o[1]; $$("button", sp).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); }); });
      sp.appendChild(b);
    });
    ctl.insertBefore(sp, ctl.firstChild);
    reset();
  })();
})();
