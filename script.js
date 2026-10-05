(() => {
  const KEY = "stage-anchor-gigs";
  let gigs = [], editing = null, pending = null;
  try { gigs = JSON.parse(localStorage.getItem(KEY) || "[]"); if (!Array.isArray(gigs)) gigs = []; } catch (e) { gigs = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(gigs)); } catch (e) {} };

  const $ = id => document.getElementById(id);
  const app = $("app"), dlg = $("dlg"), cdlg = $("cdlg"), addTop = $("addTop");

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const parse = d => new Date(d + "T00:00");
  const fmtDate = d => { const x = parse(d); return isNaN(x) ? d : x.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }); };
  const fmtTime = t => { const [h, m] = t.split(":").map(Number); return isNaN(h) ? t : ((h % 12) || 12) + ":" + String(m).padStart(2, "0") + " " + (h < 12 ? "AM" : "PM"); };
  const norm = s => (s || "").trim().replace(/\s+/g, " ").toLowerCase();
  const sameGig = (a, b) => norm(a.title) === norm(b.title) && a.date === b.date && a.time === b.time && norm(a.co) === norm(b.co);

  const svg = (path, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const ICON_EDIT = svg('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>');
  const ICON_DEL = svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/>');
  const ICON_MIC = svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v4M8 22h8"/>', 84).replace('stroke-width="2"', 'stroke-width="1.5"');

  function render() {
    app.replaceChildren();
    addTop.hidden = gigs.length === 0;
    const up = gigs.filter(g => !g.done).length;
    $("count").textContent = gigs.length ? `${up} upcoming, ${gigs.length - up} completed` : "Nothing on the schedule";

    if (!gigs.length) {
      const e = el("div", "empty");
      e.innerHTML = ICON_MIC;
      e.append(el("p", null, "No gigs scheduled yet. Time to grab the mic!"));
      const b = el("button", "btn big", "Add a new gig");
      b.onclick = openNew;
      e.append(b); app.append(e); return;
    }

    const list = el("div", "list");
    [...gigs].sort((a, b) => (a.done - b.done) || (a.date + a.time).localeCompare(b.date + b.time)).forEach(g => {
      const d = parse(g.date);
      const card = el("article", "ticket" + (g.done ? " done" : ""));

      const stub = el("div", "stub");
      stub.append(
        el("span", "mo", isNaN(d) ? "" : d.toLocaleDateString(undefined, { month: "short" })),
        el("span", "dy", isNaN(d) ? "–" : String(d.getDate())),
        el("span", "wd", isNaN(d) ? "" : d.toLocaleDateString(undefined, { weekday: "short" }))
      );

      const body = el("div", "body");
      const head = el("div", "head");
      head.append(el("h3", null, g.title));
      const icons = el("div", "icons");
      const ed = el("button", "ico"); ed.innerHTML = ICON_EDIT; ed.title = "Edit gig"; ed.setAttribute("aria-label", "Edit " + g.title); ed.onclick = () => openEdit(g);
      const del = el("button", "ico del"); del.innerHTML = ICON_DEL; del.title = "Delete gig"; del.setAttribute("aria-label", "Delete " + g.title);
      del.onclick = () => { if (confirm(`Delete "${g.title}"?`)) { gigs = gigs.filter(x => x.id !== g.id); save(); render(); } };
      icons.append(ed, del); head.append(icons);

      const meta = el("div", "meta");
      meta.append(el("span", null, "🕒 " + fmtTime(g.time)));
      if (g.co) meta.append(el("span", null, "🤝 With " + g.co));

      const row = el("div", "row");
      const badge = el("button", "badge", g.done ? "Completed" : "Upcoming");
      badge.title = "Tap to change status";
      badge.setAttribute("aria-label", `Status: ${g.done ? "Completed" : "Upcoming"}. Tap to change.`);
      badge.onclick = () => { g.done = !g.done; save(); render(); };
      row.append(badge);

      body.append(head, meta, row);
      card.append(stub, body); list.append(card);
    });
    app.append(list);
  }

  function openNew() {
    editing = null; $("form").reset(); $("err").hidden = true;
    $("dlgTitle").textContent = "New gig"; $("saveBtn").textContent = "Save gig";
    dlg.showModal(); $("t").focus();
  }
  function openEdit(g) {
    editing = g; $("err").hidden = true;
    $("t").value = g.title; $("d").value = g.date; $("tm").value = g.time; $("co").value = g.co || "";
    $("dlgTitle").textContent = "Edit gig"; $("saveBtn").textContent = "Review changes";
    dlg.showModal(); $("t").focus();
  }
  const closeAll = () => { cdlg.close(); dlg.close(); editing = pending = null; };

  addTop.onclick = openNew;
  $("cancel").onclick = () => dlg.close();
  ["t", "d", "tm", "co"].forEach(id => $(id).addEventListener("input", () => { $("err").hidden = true; }));

  $("form").addEventListener("submit", e => {
    e.preventDefault();
    const v = { title: $("t").value.trim(), date: $("d").value, time: $("tm").value, co: $("co").value.trim() };

    if (editing) {
      if (gigs.some(x => x.id !== editing.id && sameGig(x, v))) { $("err").hidden = false; return; }
      const fields = [["Title", "title", s => s], ["Date", "date", fmtDate], ["Time", "time", fmtTime], ["Co-anchor", "co", s => s || "None"]];
      const diff = fields.filter(f => v[f[1]] !== (editing[f[1]] || ""));
      if (!diff.length) { dlg.close(); editing = null; return; }
      pending = v;
      const ul = $("chg"); ul.replaceChildren();
      diff.forEach(([label, k, fmt]) => {
        const li = el("li"); li.append(el("small", null, label));
        li.append(el("s", null, fmt(editing[k] || "")), document.createTextNode("  →  "), el("b", null, fmt(v[k])));
        ul.append(li);
      });
      cdlg.showModal(); return;
    }

    const g = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...v, done: false };
    if (gigs.some(x => sameGig(x, g))) { $("err").hidden = false; return; }
    gigs.push(g); save(); render(); dlg.close();
  });

  $("confirm").onclick = () => { if (editing && pending) Object.assign(editing, pending); save(); render(); closeAll(); };
  $("discard").onclick = closeAll;

  render();
})();
