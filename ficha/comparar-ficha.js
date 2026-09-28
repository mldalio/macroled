(() => {
  "use strict";

  // Misma lógica/barra que index.html, adaptada a la ficha.
  const COMPARE_PAGE_URL = "/nuevo-comparativa";
  const COMPARE_MAX = (window.MacroledCompare && window.MacroledCompare.MAX) || 3;
  const ICON_COMPARE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 3 21 3 21 7"/><line x1="21" y1="3" x2="10" y2="14"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5"/></svg>`;

  // Resguardo idéntico al de index.html si comparar.js no cargó.
  if (!window.MacroledCompare) {
    console.warn(
      "[ficha] comparar.js no cargó. Usando fallback en memoria SIN persistencia entre recargas."
    );
    const _fallbackList = [];
    window.MacroledCompare = {
      MAX: 3,
      getCompareList: () => _fallbackList.slice(),
      addToCompare: (product) => {
        if (!product || !product.sku) return _fallbackList.slice();
        if (_fallbackList.some((p) => p.sku === product.sku))
          return _fallbackList.slice();
        if (_fallbackList.length >= 3) return _fallbackList.slice();
        _fallbackList.push({
          sku: product.sku,
          nombre: product.nombre || "",
          img: product.img || "",
          focusAngulo: product.focusAngulo || "",
        });
        return _fallbackList.slice();
      },
      removeFromCompare: (sku) => {
        const idx = _fallbackList.findIndex((p) => p.sku === sku);
        if (idx >= 0) _fallbackList.splice(idx, 1);
        return _fallbackList.slice();
      },
      clearCompare: () => {
        _fallbackList.length = 0;
      },
      isInCompare: (sku) => _fallbackList.some((p) => p.sku === sku),
      setFocusAngulo: (sku, angulo) => {
        const item = _fallbackList.find((p) => p.sku === sku);
        if (item && angulo) item.focusAngulo = angulo;
        return _fallbackList.slice();
      },
    };
  }

  const cb = document.getElementById("compareCheck");
  const row = document.getElementById("compareRow");
  const msg = document.getElementById("compareMsg");
  const bar = document.getElementById("compareBar");
  if (!cb || !bar) return;

  let compareCollapsed = false;
  let compareBarPrevCount = 0;
  let changeBound = false;

  function showMsg(text) {
    if (!msg) return;
    msg.textContent = text || "";
    msg.classList.toggle("is-visible", !!text);
  }

  function readSku() {
    return (document.getElementById("ficha-sku")?.textContent || "").trim();
  }

  function readProductFromDom() {
    const sku = readSku();
    if (!sku) return null;
    const nombre =
      (document.getElementById("ficha-name")?.textContent || "").trim() || sku;
    const img =
      document.getElementById("stageImg")?.currentSrc ||
      document.getElementById("stageImg")?.src ||
      "";
    const focusAngulo =
      window.MacroledFocusAngle && typeof window.MacroledFocusAngle.get === "function"
        ? window.MacroledFocusAngle.get(sku)
        : "";
    return { sku, nombre, img, focusAngulo };
  }

  function setCheckboxProduct(product) {
    if (!product) {
      cb.dataset.sku = "";
      cb.dataset.nombre = "";
      cb.dataset.img = "";
      cb.disabled = true;
      return;
    }
    cb.dataset.sku = product.sku;
    cb.dataset.nombre = product.nombre || "";
    cb.dataset.img = product.img || "";
    cb.disabled = false;
  }

  function buildCompareUrl() {
    const label =
      cb.dataset.nombre ||
      (document.getElementById("ficha-name")?.textContent || "").trim() ||
      "ficha de producto";
    return `${COMPARE_PAGE_URL}?from=${encodeURIComponent(
      location.href
    )}&fromLabel=${encodeURIComponent(label)}`;
  }

  function updateComparePadding() {
    const isVisible = getComputedStyle(bar).display !== "none";
    document.body.classList.toggle("has-compare-bar", isVisible);
  }

  function renderCompareBar() {
    const body = document.getElementById("compareBarBody");
    const countEl = document.getElementById("compareCount");
    const list = window.MacroledCompare.getCompareList();

    if (!list.length) {
      bar.style.display = "none";
      compareBarPrevCount = 0;
      updateComparePadding();
      return;
    }

    // Abre automáticamente al agregar el primer producto
    if (list.length > compareBarPrevCount) {
      compareCollapsed = false;
    }
    
    if (
      compareBarPrevCount === 0 &&
      window.matchMedia("(max-width:900px)").matches
    ) {
      compareCollapsed = true;
    }
    compareBarPrevCount = list.length;

    bar.style.display = "block";
    bar.classList.toggle("collapsed", compareCollapsed);
    const toggle = document.getElementById("compareToggle");
    if(toggle){
      toggle.setAttribute("aria-expanded", String(!compareCollapsed));
      toggle.setAttribute("aria-label", compareCollapsed ? "Expandir comparación" : "Contraer comparación");
    }
    countEl.textContent = list.length;

    const chips = list
      .map(
        (p) => `
      <div class="compare-chip">
        <button type="button" class="compare-chip-remove" data-remove="${compareEntryId(p)}" aria-label="Quitar">×</button>
        <div class="compare-chip-thumb">${p.img ? `<img src="${p.img}" alt="" loading="lazy">` : ""}</div>
        <div class="compare-chip-info">
          <span class="compare-chip-name">${p.nombre}</span>
          ${p.sku ? `<span class="compare-chip-sku">${p.focusAngulo ? p.sku + " · " + p.focusAngulo : p.sku}</span>` : ""}
        </div>
      </div>`
      )
      .join("");

    const emptySlots = Array.from({
      length: Math.max(0, COMPARE_MAX - list.length),
    })
      .map(() => `<button type="button" class="compare-slot-empty compare-slot-action compare-slot-add" data-compare-add aria-label="Agregar producto a la comparación" title="Agregar producto"><span aria-hidden="true">+</span></button>`)
      .join("");

    const ctaDisabled = list.length < 2;
    body.innerHTML = `
      <div class="compare-items">${chips}${emptySlots}</div>
      <div class="compare-actions">
        <a ${ctaDisabled ? 'role="link" aria-disabled="true" tabindex="-1"' : `href="${buildCompareUrl()}"`} class="compare-cta${ctaDisabled ? " disabled" : ""}"
           title="${ctaDisabled ? "Agregá al menos 2 productos para comparar" : ""}">
          ${ICON_COMPARE} Comparar
        </a>
        <button type="button" class="compare-clear" id="compareClear" aria-label="Borrar todos los productos seleccionados">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          Borrar todo
        </button>
      </div>
    `;

    body.querySelectorAll("[data-compare-add]").forEach(button => {
      button.addEventListener("click", () => {
        window.MacroledComparePicker.openSelection(() => {
          renderCompareBar();
          syncCompareCheckboxes();
        });
      });
    });

    body.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        window.MacroledCompare.removeFromCompare(btn.dataset.remove);
        renderCompareBar();
        syncCompareCheckboxes();
      });
    });

    document.getElementById("compareClear").addEventListener("click", () => {
      window.MacroledCompare.clearCompare();
      renderCompareBar();
      syncCompareCheckboxes();
    });

    updateComparePadding();
  }

  function currentFocusAngulo(sku) {
    return window.MacroledFocusAngle && typeof window.MacroledFocusAngle.get === "function"
      ? window.MacroledFocusAngle.get(sku)
      : "";
  }

  function compareEntryId(product) {
    if (!product) return "";
    if (product.entryId) return String(product.entryId);
    const sku = String(product.sku || "").trim();
    const angle = String(product.focusAngulo || "").trim();
    if (angle) return sku.toUpperCase() + "|" + angle;
    return sku;
  }

  function isCurrentAngleInList(list, sku) {
    const angle = currentFocusAngulo(sku);
    const entryId = compareEntryId({ sku: sku, focusAngulo: angle });
    return list.some((p) => compareEntryId(p) === entryId);
  }

  function syncCompareCheckboxes() {
    const list = window.MacroledCompare.getCompareList();
    const atLimit = list.length >= COMPARE_MAX;
    document.querySelectorAll(".compare-checkbox").forEach((input) => {
      const sku = input.dataset.sku;
      const isSelected = !!sku && isCurrentAngleInList(list, sku);
      input.checked = isSelected;
      input.disabled = !sku || (atLimit && !isSelected);
      const label = input.closest(".compare-row");
      if (label) {
        label.title = input.disabled
          ? `Máximo ${COMPARE_MAX} productos para comparar`
          : "";
        label.classList.toggle("row-disabled", input.disabled);
      }
    });
  }

  function wireCompareCheckbox() {
    if (changeBound) return;
    changeBound = true;
    cb.addEventListener("change", () => {
      const { sku, nombre, img } = cb.dataset;
      if (!sku) {
        cb.checked = false;
        return;
      }
      if (cb.checked) {
        const focusAngulo = currentFocusAngulo(sku);
        const updated = window.MacroledCompare.addToCompare({
          sku,
          nombre,
          img,
          focusAngulo,
        });
        if (!isCurrentAngleInList(updated, sku)) {
          cb.checked = false;
          showMsg(`Máximo ${COMPARE_MAX} productos para comparar`);
        } else {
          showMsg("");
        }
      } else {
        const focusAngulo = currentFocusAngulo(sku);
        window.MacroledCompare.removeFromCompare(compareEntryId({ sku: sku, focusAngulo: focusAngulo }));
        showMsg("");
      }
      renderCompareBar();
      syncCompareCheckboxes();
    });
  }

  function bindCurrentProduct() {
    const product = readProductFromDom();
    if (!product) {
      setCheckboxProduct(null);
      showMsg("No se encontró el SKU del producto.");
      syncCompareCheckboxes();
      return;
    }
    setCheckboxProduct(product);
    showMsg("");
    wireCompareCheckbox();
    syncCompareCheckboxes();
  }

  function init() {
    bindCurrentProduct();
    renderCompareBar();
    syncCompareCheckboxes();

    document.getElementById("compareBarHeader")?.addEventListener("click", () => {
      compareCollapsed = !compareCollapsed;
      bar.classList.toggle("collapsed", compareCollapsed);
      const toggle = document.getElementById("compareToggle");
      if(toggle){
        toggle.setAttribute("aria-expanded", String(!compareCollapsed));
        toggle.setAttribute("aria-label", compareCollapsed ? "Expandir comparación" : "Contraer comparación");
      }
      updateComparePadding();
    });

    window.addEventListener("macroled-compare-changed", () => {
      renderCompareBar();
      syncCompareCheckboxes();
    });
    window.addEventListener("ml-product-changed", () => {
      bindCurrentProduct();
    });
    window.addEventListener("ml-focus-angle-changed", () => {
      syncCompareCheckboxes();
    });
    // El motor del asistente (copiado de productos/script.js) ya no manda
    // el evento "macroled-assistant-toggle" — observamos directamente la
    // clase "is-open" del panel para recalcular el padding igual que antes.
    const aiPanelEl = document.getElementById("aiPanel");
    if (aiPanelEl && window.MutationObserver) {
      const assistantObserver = new MutationObserver(() => {
        requestAnimationFrame(updateComparePadding);
        setTimeout(updateComparePadding, 320);
      });
      assistantObserver.observe(aiPanelEl, { attributes: true, attributeFilter: ["class"] });
    }
    window.addEventListener("storage", (e) => {
      if (e.key === "macroled_compare") {
        renderCompareBar();
        syncCompareCheckboxes();
      }
    });

    const skuEl = document.getElementById("ficha-sku");
    if (skuEl) {
      let lastSku = readSku();
      const mo = new MutationObserver(() => {
        const next = readSku();
        if (!next || next === lastSku) return;
        lastSku = next;
        bindCurrentProduct();
      });
      mo.observe(skuEl, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      requestAnimationFrame(init);
    });
  } else {
    requestAnimationFrame(() => requestAnimationFrame(init));
  }
})();
