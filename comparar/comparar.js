/* compare.js — módulo compartido de "productos a comparar" para el catálogo,
   las fichas técnicas (Webflow) y la página de comparación.
   Guarda lo mínimo (sku, nombre, imagen) en localStorage bajo una clave
   fija: alcanza para pintar la barra flotante al instante sin ir a buscar
   nada a Typesense. comparar.html resuelve los datos/specs completos por su
   cuenta a partir de esos SKUs. focusAngulo es la excepción de los racks
   Focus: el ángulo no está en la base y viaja elegido desde el front.
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
    const item = findCompareItem(list, principalSku);
    if (!item) return list;
    item.variantSku = variantSku;
    if (img) item.img = img;
    saveCompareList(list);
    return list;
  }

  function sameSku(a, b) {
    return String(a || "").trim().toUpperCase() === String(b || "").trim().toUpperCase();
  }

  /* El mismo rack Focus puede entrar una vez por ángulo. El id estable es
     SKU|ángulo; el resto de los productos sigue identificado solo por SKU. */
  function entryIdFor(product) {
    if (!product) return "";
    if (product.entryId) return String(product.entryId);
    const sku = String(product.sku || "").trim();
    const angle = String(product.focusAngulo || "").trim();
    if (angle) return sku.toUpperCase() + "|" + angle;
    return sku;
  }

  function findCompareItem(list, id) {
    return (
      list.find((p) => entryIdFor(p) === id) ||
      list.find((p) => p.sku === id) ||
      list.find((p) => sameSku(p.sku, id))
    );
  }

  function setFocusAngulo(id, angulo) {
    if (!id || !angulo) return getCompareList();
    const list = getCompareList();
    const item = findCompareItem(list, id);
    if (!item) return list;
    item.focusAngulo = angulo;
    const sku = item.variantSku || item.sku;
    const nextId = String(sku).trim().toUpperCase() + "|" + String(angulo).trim();
    const taken = list.some((p) => p !== item && entryIdFor(p) === nextId);
    if (!taken) item.entryId = nextId;
    saveCompareList(list);
    return list;
  }

  function addToCompare(product) {
    // product: {sku, nombre, img, focusAngulo?}
    if (!product || !product.sku) return getCompareList();
    const list = getCompareList();
    const entryId = entryIdFor(product);
    if (list.some((p) => entryIdFor(p) === entryId)) return list;
    if (!product.focusAngulo && list.some((p) => p.sku === product.sku && !p.focusAngulo)) return list;
    if (list.length >= COMPARE_MAX) return list;
    const item = {
      sku: product.sku,
      nombre: product.nombre || "",
      img: product.img || "",
      entryId: entryId,
    };
    if (product.focusAngulo) item.focusAngulo = product.focusAngulo;
    list.push(item);
    saveCompareList(list);
    return list;
  }

  function removeFromCompare(id) {
    const key = String(id || "");
    const list = getCompareList().filter((p) => {
      if (entryIdFor(p) === key) return false;
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
    setFocusAngulo,
    removeFromCompare,
    clearCompare,
    isInCompare,
  };
})(window);