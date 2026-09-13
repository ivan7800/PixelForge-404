/* PixelForge 404 v7.1 — UX / A11Y enhancement
   Progressive enhancement only: does not replace editor engine handlers. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const normalize = (s = "") =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const announceRegion = document.createElement("div");
  announceRegion.className = "pf-sr-only";
  announceRegion.id = "pf-v71-live";
  announceRegion.setAttribute("aria-live", "polite");
  announceRegion.setAttribute("aria-atomic", "true");

  function announce(msg) {
    if (!msg) return;
    announceRegion.textContent = "";
    requestAnimationFrame(() => { announceRegion.textContent = msg; });
  }

  function addSkipLink() {
    const stage = $(".stage") || $(".stage-section");
    if (!stage || $(".pf-skip-link")) return;
    if (!stage.id) stage.id = "pf-editor-stage";
    stage.setAttribute("tabindex", stage.getAttribute("tabindex") || "-1");

    const a = document.createElement("a");
    a.id = "pf-v71-skip";
    a.className = "pf-skip-link";
    a.href = `#${stage.id}`;
    a.textContent = "Saltar al lienzo";
    document.body.prepend(a);
  }

  function toolLabel(tool) {
    return (
      tool.getAttribute("aria-label") ||
      tool.getAttribute("title") ||
      tool.dataset.tool ||
      $("span", tool)?.textContent ||
      tool.textContent
    ).trim();
  }

  function enhanceToolbar() {
    const toolbar = $(".toolbar");
    if (!toolbar) return;
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Herramientas de edición");

    const tools = $$(".tool", toolbar);
    tools.forEach((tool, i) => {
      const label = toolLabel(tool) || `Herramienta ${i + 1}`;
      tool.setAttribute("aria-label", label);
      tool.setAttribute("aria-pressed", tool.classList.contains("active") ? "true" : "false");
      if (!tool.hasAttribute("title")) tool.title = label;
    });

    toolbar.addEventListener("keydown", (e) => {
      if (!["ArrowDown","ArrowRight","ArrowUp","ArrowLeft","Home","End"].includes(e.key)) return;
      const current = document.activeElement;
      const idx = tools.indexOf(current);
      if (idx < 0) return;
      e.preventDefault();
      let next = idx;
      if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tools.length - 1;
      else if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (idx + 1) % tools.length;
      else next = (idx - 1 + tools.length) % tools.length;
      tools[next]?.focus();
    });

    const observer = new MutationObserver(() => {
      tools.forEach(tool => {
        const active = tool.classList.contains("active");
        tool.setAttribute("aria-pressed", active ? "true" : "false");
        if (active) announce(`Herramienta ${toolLabel(tool)} seleccionada`);
      });
    });
    tools.forEach(t => observer.observe(t, { attributes:true, attributeFilter:["class"] }));
  }

  function enhanceLayers() {
    const list = $(".layers-list");
    if (!list) return;
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-label", "Capas");

    const update = () => {
      $$(".layer-item", list).forEach((row, i) => {
        row.setAttribute("role", "option");
        row.setAttribute("tabindex", row.classList.contains("active") ? "0" : "-1");
        row.setAttribute("aria-selected", row.classList.contains("active") ? "true" : "false");
        const name = $(".layer-name", row)?.textContent?.trim() || `Capa ${i+1}`;
        row.setAttribute("aria-label", name);
        const eye = $(".layer-eye", row);
        const lock = $(".layer-lock", row);
        if (eye && !eye.getAttribute("aria-label")) eye.setAttribute("aria-label", `Mostrar u ocultar ${name}`);
        if (lock && !lock.getAttribute("aria-label")) lock.setAttribute("aria-label", `Bloquear o desbloquear ${name}`);
      });
    };
    update();

    list.addEventListener("keydown", (e) => {
      if (!["ArrowDown","ArrowUp","Home","End"].includes(e.key)) return;
      const rows = $$(".layer-item", list);
      const idx = rows.indexOf(document.activeElement);
      if (idx < 0) return;
      e.preventDefault();
      let next = idx;
      if (e.key === "Home") next = 0;
      else if (e.key === "End") next = rows.length - 1;
      else if (e.key === "ArrowDown") next = Math.min(rows.length - 1, idx + 1);
      else next = Math.max(0, idx - 1);
      rows[next]?.focus();
    });

    new MutationObserver(update).observe(list, {subtree:true, childList:true, attributes:true, attributeFilter:["class"]});
  }

  function classifyPanel(panel) {
    const text = normalize($("h2", panel)?.textContent || "");
    if (/capa|layer/.test(text)) return "layers";
    if (/historial|history/.test(text)) return "history";
    if (/ajuste|filtro|color|curva|histograma|adjust|filter/.test(text)) return "adjust";
    if (/propiedad|transform|texto|forma|shape|mascara|mask|fx|efecto/.test(text)) return "props";
    return "other";
  }

  function createInspectorTabs() {
    const rightbar = $(".rightbar");
    if (!rightbar || $(".pf-inspector-tabs", rightbar)) return;

    const panels = $$(".panel", rightbar);
    if (!panels.length) return;

    const defs = [
      ["all","Todo"],
      ["layers","Capas"],
      ["props","Propiedades"],
      ["adjust","Ajustes"],
      ["history","Historial"]
    ];
    const present = new Set(panels.map(classifyPanel));
    const tabs = document.createElement("div");
    tabs.className = "pf-inspector-tabs";
    tabs.setAttribute("role","tablist");
    tabs.setAttribute("aria-label","Secciones del inspector");

    const apply = (key, focus = false) => {
      panels.forEach(panel => {
        const show = key === "all" || classifyPanel(panel) === key || (key === "props" && classifyPanel(panel) === "other");
        panel.classList.toggle("pf-v71-panel-hidden", !show);
      });
      $$("button", tabs).forEach(btn => {
        const on = btn.dataset.tab === key;
        btn.setAttribute("aria-selected", on ? "true" : "false");
        btn.tabIndex = on ? 0 : -1;
        if (on && focus) btn.focus();
      });
      try { localStorage.setItem("pixelforge404:v71:inspectorTab", key); } catch {}
    };

    defs.forEach(([key,label]) => {
      if (key !== "all" && key !== "props" && !present.has(key)) return;
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.tab = key;
      b.setAttribute("role","tab");
      b.textContent = label;
      b.addEventListener("click", () => apply(key));
      tabs.appendChild(b);
    });

    tabs.addEventListener("keydown", (e) => {
      if (!["ArrowLeft","ArrowRight","Home","End"].includes(e.key)) return;
      const buttons = $$("button", tabs);
      let i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      if (e.key === "Home") i = 0;
      else if (e.key === "End") i = buttons.length - 1;
      else if (e.key === "ArrowRight") i = (i + 1) % buttons.length;
      else i = (i - 1 + buttons.length) % buttons.length;
      apply(buttons[i].dataset.tab, true);
    });

    rightbar.prepend(tabs);
    let initial = "all";
    try {
      const saved = localStorage.getItem("pixelforge404:v71:inspectorTab");
      if (saved && $(`button[data-tab="${saved}"]`, tabs)) initial = saved;
    } catch {}
    apply(initial);
  }

  function createMobileInspector() {
    const rightbar = $(".rightbar");
    if (!rightbar || $(".pf-mobile-inspector-toggle")) return;

    if (!rightbar.id) rightbar.id = "pf-inspector";
    rightbar.setAttribute("aria-label", rightbar.getAttribute("aria-label") || "Inspector");
    rightbar.setAttribute("tabindex", rightbar.getAttribute("tabindex") || "-1");

    const toggle = document.createElement("button");
    toggle.id = "pf-v71-inspector-toggle";
    toggle.type = "button";
    toggle.className = "pf-mobile-inspector-toggle";
    toggle.textContent = "☰";
    toggle.title = "Abrir inspector";
    toggle.setAttribute("aria-label", "Abrir inspector");
    toggle.setAttribute("aria-controls", rightbar.id);
    toggle.setAttribute("aria-expanded", "false");

    const backdrop = document.createElement("div");
    backdrop.className = "pf-inspector-backdrop";
    backdrop.setAttribute("aria-hidden","true");

    const setOpen = (open) => {
      rightbar.classList.toggle("open", open);
      document.body.classList.toggle("pf-inspector-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Cerrar inspector" : "Abrir inspector");
      toggle.title = open ? "Cerrar inspector" : "Abrir inspector";
      if (open) {
        rightbar.focus({preventScroll:true});
        announce("Inspector abierto");
      } else {
        toggle.focus({preventScroll:true});
        announce("Inspector cerrado");
      }
    };

    toggle.addEventListener("click", () => setOpen(!rightbar.classList.contains("open")));
    backdrop.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && rightbar.classList.contains("open")) setOpen(false);
    });

    document.body.append(backdrop, toggle);
  }

  function enhanceButtons() {
    $$("button").forEach((b, i) => {
      if (b.getAttribute("aria-label")) return;
      const text = b.textContent.replace(/\s+/g, " ").trim();
      const title = b.getAttribute("title");
      if (title) b.setAttribute("aria-label", title);
      else if (text) b.setAttribute("aria-label", text);
      else b.setAttribute("aria-label", `Acción ${i+1}`);
    });
  }

  function enhanceDialogs() {
    $$("dialog").forEach((dlg, i) => {
      const h = $("h1,h2,h3", dlg);
      if (h) {
        if (!h.id) h.id = `pf-dialog-title-${i+1}`;
        dlg.setAttribute("aria-labelledby", h.id);
      } else if (!dlg.getAttribute("aria-label")) {
        dlg.setAttribute("aria-label", `Diálogo ${i+1}`);
      }
    });
  }

  function mirrorToasts() {
    const toast = $(".toast");
    if (!toast) return;
    const obs = new MutationObserver(() => {
      if (toast.classList.contains("show")) announce(toast.textContent.trim());
    });
    obs.observe(toast, {attributes:true, childList:true, subtree:true, characterData:true});
  }

  function init() {
    document.body.appendChild(announceRegion);
    addSkipLink();
    enhanceToolbar();
    enhanceLayers();
    createInspectorTabs();
    createMobileInspector();
    enhanceButtons();
    enhanceDialogs();
    mirrorToasts();
    document.documentElement.dataset.pfUx = "7.1";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, {once:true});
  } else {
    init();
  }
})();
