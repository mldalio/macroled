/* compare.js — módulo compartido de "productos a comparar" para el catálogo,
   las fichas técnicas (Webflow) y la página de comparación.
   Guarda solo lo mínimo (sku, nombre, imagen) en localStorage bajo una clave
   fija: alcanza para pintar la barra flotante al instante sin ir a buscar
   nada a Typesense. comparar.html resuelve los datos/specs completos por su
   cuenta a partir de esos SKUs.
   Incluir con <script src="compare.js"></script> antes del script principal
   de cada página. */
(function (window) {
  const STORAGE_KEY = "macroled_compare";
  const COMPARE_MAX = 3;

  function getCompareList() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function saveCompareList(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (_) {
      // localStorage lleno o bloqueado (modo privado, etc.) — no rompemos la UI por esto
    }
    // Aviso para que la misma pestaña pueda re-renderizar sin recargar.
    // (El evento nativo "storage" del navegador solo dispara en OTRAS pestañas.)
    window.dispatchEvent(new CustomEvent("macroled-compare-changed", { detail: list }));
  }

  function isInCompare(sku) {
    return getCompareList().some((p) => p.sku === sku || p.variantSku === sku);
  }

  function setCompareVariant(principalSku, variantSku, img) {
    if (!principalSku || !variantSku) return getCompareList();
    const list = getCompareList();
    const item = list.find((p) => p.sku === principalSku);
    if (!item) return list;
    item.variantSku = variantSku;
    if (img) item.img = img;
    saveCompareList(list);
    return list;
  }

  function addToCompare(product) {
    // product: {sku, nombre, img}
    if (!product || !product.sku) return getCompareList();
    const list = getCompareList();
    if (list.some((p) => p.sku === product.sku)) return list;
    if (list.length >= COMPARE_MAX) return list;
    list.push({ sku: product.sku, nombre: product.nombre || "", img: product.img || "" });
    saveCompareList(list);
    return list;
  }

  function removeFromCompare(id) {
    const key = String(id || "");
    const list = getCompareList().filter((p) => {
      const entry = p.entryId || (p.focusAngulo ? String(p.sku || "").trim().toUpperCase() + "|" + p.focusAngulo : p.sku);
      if (entry === key) return false;
      if (!key.includes("|") && (p.sku === key || p.variantSku === key)) return false;
      return true;
    });
    saveCompareList(list);
    return list;
  }

  function clearCompare() {
    saveCompareList([]);
  }

  window.MacroledCompare = {
    MAX: COMPARE_MAX,
    getCompareList,
    addToCompare,
    setCompareVariant,
    removeFromCompare,
    clearCompare,
    isInCompare,
  };
})(window);