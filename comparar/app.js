// Resguardo: si por lo que sea comparar.js no cargó (nombre de archivo
// distinto, 404, etc.), esto evita que la página se rompa — funciona en
// memoria para la sesión actual (sin persistencia entre recargas) y avisa
// por consola cuál es el problema real.
if(!window.MacroledCompare){
  console.warn('[comparar] comparar.js no cargó (revisá que el archivo esté en la misma carpeta/URL que este HTML, con ese nombre exacto, y mirá la pestaña Network del navegador por un 404). Usando un modo de emergencia SIN persistencia entre recargas.');
  const _fallbackList = [];
  window.MacroledCompare = {
    MAX: 3,
    getCompareList: () => _fallbackList.slice(),
    addToCompare: (product) => {
      if(!product || !product.sku) return _fallbackList.slice();
      if(_fallbackList.some(p => p.sku === product.sku)) return _fallbackList.slice();
      if(_fallbackList.length >= 3) return _fallbackList.slice();
      _fallbackList.push({ sku: product.sku, nombre: product.nombre || "", img: product.img || "", focusAngulo: product.focusAngulo || "" });
      return _fallbackList.slice();
    },
    removeFromCompare: (sku) => {
      const idx = _fallbackList.findIndex(p => p.sku === sku);
      if(idx >= 0) _fallbackList.splice(idx, 1);
      return _fallbackList.slice();
    },
    clearCompare: () => { _fallbackList.length = 0; },
    isInCompare: (sku) => _fallbackList.some(p => p.sku === sku || p.variantSku === sku),
    setCompareVariant: (principalSku, variantSku, img) => {
      const item = _fallbackList.find(p => p.sku === principalSku);
      if(item){
        item.variantSku = variantSku;
        if(img) item.img = img;
      }
      return _fallbackList.slice();
    },
    setFocusAngulo: (sku, angulo) => {
      const key = String(sku || "").trim().toUpperCase();
      const item = _fallbackList.find(p => String(p.sku || "").trim().toUpperCase() === key || String(p.variantSku || "").trim().toUpperCase() === key);
      if(item && angulo) item.focusAngulo = angulo;
      return _fallbackList.slice();
    }
  };
}

/* =========================================================
   TIPS DE SPECS
   Las filas salen de especificaciones[] de la colección macroled (la misma
   base que las fichas). Este esquema solo aporta el texto de ayuda cuando
   el nombre de la spec coincide. Si un producto no tiene ese dato, la fila
   no se muestra (ver buildRows).
   ========================================================= */
const ICON_BOLT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';
const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const ICON_BOX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/></svg>';
const ICON_TAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none"/></svg>';

const SPEC_SCHEMA = [
  { categoria: "Características eléctricas", icon: ICON_BOLT, filas: [
    { label: "Potencia", key: "potencia", tip: "Consumo eléctrico, en vatios (W)." },
    { label: "Factor de potencia", key: "factor_potencia", tip: "Qué tan eficiente es el uso de la energía. Más cerca de 1 es mejor." },
    { label: "Corriente", key: "corriente", tip: "Corriente eléctrica que consume o entrega el producto." },
    { label: "Tensión", key: "tension", tip: "Voltaje de alimentación del producto (AC o DC)." },
    { label: "Frecuencia", key: "frecuencia", tip: "Frecuencia de la red eléctrica, en hertz (Hz)." },
    { label: "Anti high volt", key: "anti_high_volt", tip: "Protección contra picos de tensión en la red eléctrica." },
    { label: "Driver", key: "driver", tip: "Tipo de driver o fuente que alimenta el LED (integrado, externo, etc.)." },
    { label: "Conector", key: "conector", tip: "Tipo de conector eléctrico o de instalación." },
    { label: "Base / Conector", key: "base_conector", tip: "Tipo de base o conector de la lámpara (por ejemplo E27, GU10)." },
    { label: "Conductores", key: "conductores", tip: "Cantidad o tipo de conductores del cable." },
    { label: "Conexión", key: "conexion", tip: "Tipo de conexión del accesorio o luminaria." },
    { label: "Conectividad", key: "conectividad", tip: "Tipo de conectividad del producto (Wi‑Fi, RF, Bluetooth, etc.)." },
    { label: "Clase", key: "clase", tip: "Clase de aislamiento eléctrico del producto (I, II o III)." },
    { label: "Panel solar", key: "panel_solar", tip: "Indica si el producto incluye o es compatible con panel solar." },
    { label: "Autonomía", key: "autonomia", tip: "Tiempo de uso con batería, según intensidad." }
  ]},
  { categoria: "Características lumínicas", icon: ICON_SUN, filas: [
    { label: "Lm/W", key: "lumenes_w", tip: "Eficiencia lumínica: lúmenes que produce por cada vatio consumido." },
    { label: "Flujo luminoso", key: "flujo_luminoso", tip: "Cantidad total de luz emitida, en lúmenes (lm)." },
    { label: "Temperatura de color", key: "rango_temperatura", tip: "Tono de la luz en Kelvin: más bajo es más cálida, más alto es más fría." },
    { label: "Ángulo de apertura", key: "angulo_apertura", tip: "Ángulo en el que se distribuye la luz." },
    { label: "CRI", key: "cri", tip: "Fidelidad de color bajo esta luz, en una escala de 0 a 100." },
    { label: "Tipo de LED", key: "tipo_led", tip: "Tecnología o encapsulado del LED utilizado." },
    { label: "Eficiencia energética", key: "eficiencia_energetica", tip: "Clasificación energética del producto según su consumo." },
    { label: "Cantidad de luces", key: "cantidad_luces", tip: "Cantidad de LEDs o puntos de luz." },
    { label: "Dimerizable", key: "dimerizable", tip: "Si permite regular la intensidad de la luz." }
  ]},
  { categoria: "Características materiales", icon: ICON_BOX, filas: [
    { label: "Color", key: "color", tip: "Color de la carcasa / cuerpo del producto." },
    { label: "Material del cuerpo", key: "material_cuerpo", tip: "Material principal de la carcasa o estructura." },
    { label: "Material del lente", key: "material_lente", tip: "Material del difusor u óptica." },
    { label: "Protección IP", key: "ip", tip: "Grado de protección contra polvo y agua." },
    { label: "Protección IK", key: "ik", tip: "Grado de protección contra impactos mecánicos." },
    { label: "Temperatura de operación", key: "temperatura_operacion", tip: "Rango de temperatura ambiente de uso." },
    { label: "Compatibilidad", key: "compatibilidad", tip: "Líneas o productos con los que es compatible." },
    { label: "Vida útil", key: "vida_util", tip: "Vida estimada del LED en horas de uso." }
  ]},
  { categoria: "Características comerciales", icon: ICON_TAG, filas: [
    { label: "Garantía", key: "garantia_tiempo", tip: "Período de cobertura de garantía oficial Macroled." },
    { label: "SKU", key: "sku", tip: "Código único de identificación del producto (Stock Keeping Unit)." }
  ]}
];

// Arranca vacío: los productos vienen de localStorage (compare.js), resueltos
// contra Typesense en resolveProductsFromStorage() más abajo.
let comparedProducts = [];

const TS_HOST = "https://typesense.coresagroup.com";
const TS_API_KEY = "wpbpJ1lMSHi0ZZlB9CHY1fktyn2LqzLJ";
const COLLECTION = "macroled";

// El documento real de Typesense tiene campos nombrados directo (no un array
// `atributos`). Este mapa conecta cada key de SPEC_SCHEMA con el nombre real
// del campo en Typesense.
const FIELD_MAP = {
  potencia: "potencia",
  factor_potencia: "factor_potencia",
  corriente: "corriente",
  tension: "tension",
  frecuencia: "frecuencia",
  anti_high_volt: "anti_high_volt",
  driver: "driver",
  conector: "conector",
  base_conector: "base_conector",
  conductores: "conductores",
  conexion: "conexion",
  conectividad: "conectividad",
  clase: "clase",
  panel_solar: "panel_solar",
  autonomia: "autonomia",
  lumenes_w: "lumenes_w",
  flujo_luminoso: "flujo_luminoso",
  rango_temperatura: "rango_temperatura",
  angulo_apertura: "angulo_apertura",
  cri: "cri",
  tipo_led: "tipo_led",
  eficiencia_energetica: "eficiencia_energetica",
  cantidad_luces: "cantidad_luces",
  dimerizable: "dimerizable",
  color: "color",
  material_cuerpo: "material_cuerpo",
  material_lente: "material_lente",
  ip: "ip",
  ik: "ik",
  temperatura_operacion: "temperatura_operacion",
  compatibilidad: "compatibilidad",
  vida_util: "vida_util",
  garantia_tiempo: "garantia_tiempo",
  sku: "sku"
};

const BASE_FILTER = "tipo_registro:=producto && es_principal:true && publicar:=true";

function parseImages(doc){
  if(!doc) return [];
  let raw = doc.multiimagen || doc.multimagen || doc.multiimage;
  for(let i = 0; i < 3 && typeof raw === "string"; i++){
    const t = raw.trim();
    if(!(t.startsWith("[") || t.startsWith("{") || t.startsWith('"'))) break;
    try { raw = JSON.parse(t); } catch(_){ break; }
  }
  let items = [];
  if(Array.isArray(raw)) items = raw;
  else if(raw && typeof raw === "object") items = [raw];
  else if(typeof raw === "string" && raw.trim()){
    items = raw.split(/[;,|]/).map(s => s.trim()).filter(Boolean);
  }
  if(!items.length && doc.imagen) items = [doc.imagen];
  const urls = [];
  items.forEach(item => {
    let u = item;
    if(u && typeof u === "object") u = u.url || u.src || u.imagen || u.image || u.href || "";
    u = String(u || "").trim().replace(/^["'\[]+|["'\]]+$/g, "").trim();
    if(!u || /^null$/i.test(u) || u === "#") return;
    if(/\.(mp4|webm|mov|m3u8)(\?|#|$)/i.test(u)) return;
    if(u.startsWith("//")) u = "https:" + u;
    if(!/^https?:\/\//i.test(u)) return;
    const cdn = u.match(/cloudfront\.net\/(?:fit-in\/[^/]+\/)?(?:filters:[^/]+\/)?(.+)$/i);
    if(cdn) u = `https://s3.coresagroup.com/${cdn[1]}`;
    if(!urls.includes(u)) urls.push(u);
  });
  return urls;
}

function sourceImg(url){
  const u = String(url || "").trim();
  if(!u) return "";
  const m = u.match(/cloudfront\.net\/(?:fit-in\/[^/]+\/)?(?:filters:[^/]+\/)?(.+)$/i);
  return m ? `https://s3.coresagroup.com/${m[1]}` : u;
}

function parseSkuList(raw){
  if(!raw) return [];
  const list = Array.isArray(raw)
    ? raw.map(s => String(s).trim())
    : String(raw).split(/[,;|]/).map(s => s.trim());
  return [...new Set(list.filter(Boolean))];
}

const COLOR_HEX = {
  blanco: "#f4f4f4", negro: "#1c1c1c", gris: "#9e9e9e",
  transparente: "repeating-linear-gradient(45deg,#eef2f6 0 4px,#fff 4px 8px)",
  aluminio: "#c5c9ce", ambar: "#ffbf00", platil: "#c0c0c0",
  bronce: "#b08d57", cobre: "#b87333", cromo: "#cfd4d8",
  verde: "#2e7d32", azul: "#1565c0", rojo: "#c62828", acero: "#8a9399"
};
const COLOR_LABELS = {
  blanco: "Blanco", negro: "Negro", gris: "Gris", transparente: "Transparente",
  aluminio: "Aluminio", ambar: "Ámbar", platil: "Platil", bronce: "Bronce",
  cobre: "Cobre", cromo: "Cromo", verde: "Verde", azul: "Azul", rojo: "Rojo", acero: "Acero"
};
const COLOR_LIGHT = new Set(["blanco", "transparente", "aluminio", "platil", "cromo", "ambar", "acero"]);
const TEMP_TONES = {
  calido: { color: "#fff79b", label: "Cálido" },
  neutro: { color: "#d9d9d9", label: "Neutro" },
  frio:   { color: "#bce4fa", label: "Frío" }
};

function foldText(value){
  return String(value || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function canonicalizeColorPart(part){
  let p = foldText(part).replace(/\b(satinado|texturado|brillante|oscuro|claro|mate|metalizado)\b/g, " ").replace(/\s+/g, " ").trim();
  if(!p) return "";
  if(/^blanc/.test(p)) return "blanco";
  if(/^negr/.test(p)) return "negro";
  if(/^(gris|gray|grey)/.test(p) || /\bgris\b/.test(p)) return "gris";
  if(/transparent/.test(p)) return "transparente";
  if(/aluminio/.test(p)) return "aluminio";
  if(/ambar/.test(p)) return "ambar";
  if(/platil|platead|plata/.test(p)) return "platil";
  if(/bronce/.test(p)) return "bronce";
  if(/cobre/.test(p)) return "cobre";
  if(/cromo|cromado/.test(p)) return "cromo";
  if(/^verd/.test(p)) return "verde";
  if(/^azul/.test(p)) return "azul";
  if(/^roj/.test(p)) return "rojo";
  if(/acero/.test(p)) return "acero";
  return p.replace(/\s+/g, "-");
}

function normalizeColorKey(raw){
  const v = foldText(raw);
  if(!v) return "";
  const parts = v.split(/\s*[-/]\s*|\s+y\s+|\s+con\s+/).map(canonicalizeColorPart).filter(Boolean);
  const uniq = [];
  parts.forEach(p => { if(!uniq.includes(p)) uniq.push(p); });
  return uniq.join("-");
}

function colorLabel(key){
  if(!key) return "";
  if(COLOR_LABELS[key]) return COLOR_LABELS[key];
  return key.split("-").map(p => COLOR_LABELS[p] || (p.charAt(0).toUpperCase() + p.slice(1))).join(" / ");
}

function colorSwatchBg(key){
  const parts = String(key || "").split("-").filter(Boolean);
  if(!parts.length) return "#c3cad6";
  if(parts.length === 1) return COLOR_HEX[parts[0]] || "#c3cad6";
  const colors = parts.map(p => {
    const bg = COLOR_HEX[p] || "#c3cad6";
    return bg.includes("gradient") ? "#e8eef3" : bg;
  });
  if(colors.length === 2) return `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
  const step = 100 / colors.length;
  return `linear-gradient(135deg, ${colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(", ")})`;
}

function isLightColorKey(key){
  return String(key || "").split("-").some(p => COLOR_LIGHT.has(p));
}

function tempCategoryKey(value){
  const raw = foldText(value);
  if(/calido/.test(raw) || /\bww\b/.test(raw)) return "calido";
  if(/neutro/.test(raw) || /\bnw\b/.test(raw)) return "neutro";
  if(/frio/.test(raw) || /\bcw\b/.test(raw)) return "frio";
  const k = parseInt(value, 10);
  if(Number.isNaN(k)) return null;
  if(k <= 3000) return "calido";
  if(k <= 4500) return "neutro";
  return "frio";
}

function parseWattsValue(str){
  const m = String(str || "").match(/(\d+(?:[.,]\d+)?)\s*w\b/i);
  if(!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function docText(doc, names){
  if(!doc) return "";
  for(let i = 0; i < names.length; i++){
    const raw = doc[names[i]];
    if(raw != null && String(raw).trim()) return String(raw).trim();
  }
  const rows = readEspecificaciones(doc);
  for(let i = 0; i < names.length; i++){
    const hit = rows.find(r => String(r && r.campo || "").trim() === names[i]);
    if(hit && hit.valor != null && String(hit.valor).trim()) return String(hit.valor).trim();
  }
  return "";
}

function colorFromDoc(doc){
  return normalizeColorKey(docText(doc, ["color"]));
}

function potenciaFromDoc(doc){
  if(!doc) return null;
  const rawPotencia = docText(doc, ["potencia"]);
  const fromField = parseWattsValue(rawPotencia);
  if(fromField != null){
    const raw = String(rawPotencia).trim();
    return { key: String(fromField), watts: fromField, label: /w/i.test(raw) ? raw.replace(/\s+/g, "") : `${fromField}W` };
  }
  const fromSku = parseWattsValue(doc.sku);
  if(fromSku != null) return { key: String(fromSku), watts: fromSku, label: `${fromSku}W` };
  return null;
}

function kelvinFromText(value){
  const m = String(value || "").match(/(\d{4})\s*k\b/i) || String(value || "").match(/\b(2000|2200|2700|3000|3500|4000|4500|5000|5700|6500)\b/);
  if(!m) return null;
  const k = parseInt(m[1], 10);
  return Number.isFinite(k) && k >= 1800 && k <= 8000 ? k : null;
}

function kelvinFromSku(sku){
  const s = String(sku || "");
  const direct = kelvinFromText(s);
  if(direct) return direct;
  // Código lámpara 827/830/840/850/857/865 → CRI + CCT
  const code = s.match(/\b[89]([23456][057])\b/);
  if(!code) return null;
  const k = parseInt(code[1], 10) * 100;
  return k >= 2000 && k <= 6500 ? k : null;
}

function skuTempSuffix(sku){
  const s = String(sku || "");
  if(/\bWW\b/i.test(s)) return "calido";
  if(/\bNW\b/i.test(s)) return "neutro";
  if(/\bCW\b/i.test(s)) return "frio";
  return null;
}

function tempInfoFromDoc(doc){
  if(!doc) return { kelvin: null, tone: null };
  const tempText = docText(doc, ["rango_temperatura", "temperatura_color", "temperatura_k"]);
  const suffixTone = skuTempSuffix(doc.sku);
  const declaredTone = tempCategoryKey(doc.attr_variantes);
  const tone = suffixTone || declaredTone || tempCategoryKey(tempText);
  let kelvin = kelvinFromText(tempText)
    || kelvinFromText(doc.attr_variantes)
    || kelvinFromSku(doc.sku);
  if(tone && kelvin && tempCategoryKey(String(kelvin)) !== tone){
    kelvin = null;
  }
  return { kelvin, tone: tone || (kelvin ? tempCategoryKey(String(kelvin)) : null) };
}

function tempFromDoc(doc){
  const info = tempInfoFromDoc(doc);
  if(info.kelvin) return `${info.kelvin}K`;
  return info.tone || "";
}

function anguloFromDoc(doc){
  const field = docText(doc, ["angulo_apertura", "angulo_de_apertura", "angulo_grados"]);
  if(field){
    const n = parseInt(field.replace(",", "."), 10);
    if(Number.isFinite(n)) return `${n}°`;
    return field;
  }
  const m = String(doc && doc.sku || "").match(/(\d+)\s*D\b/i);
  return m ? `${m[1]}°` : "";
}

/* Racks Focus: el ángulo no está en la base. Se elige en la ficha o acá
   y pisa "Ángulo de apertura" solo para estos SKU. */
const FOCUS_RACK_SKUS = new Set([
  "FOCUS-BR-250W",
  "FOCUS-BR-500W",
  "FOCUS-BR-750W",
  "FOCUS-BR-1000W"
]);
const FOCUS_ANGLES = ["20°", "40°", "60°", "90°", "Asimétrico"];
const FOCUS_ANGLE_DEFAULT = "20°";

function isFocusRackSku(sku){
  return FOCUS_RACK_SKUS.has(String(sku || "").trim().toUpperCase());
}

function normalizeFocusAngle(value){
  const raw = String(value || "").trim().toLowerCase();
  return FOCUS_ANGLES.find(angle => angle.toLowerCase() === raw) || FOCUS_ANGLE_DEFAULT;
}

function isAnguloAperturaRow(row){
  const label = foldSpecLabel(row && row.label);
  const key = foldSpecLabel(String(row && row.key || "").replace(/_/g, " "));
  if(label === "angulo de apertura" || key === "angulo de apertura" || key === "angulo apertura") return true;
  return /angulo/.test(label) && /apertura/.test(label);
}

function applyFocusAngle(product){
  if(!product || !isFocusRackSku(product.sku)) return product;
  const angle = normalizeFocusAngle(product.focusAngulo);
  product.focusAngulo = angle;
  product.specs = product.specs || {};
  product.specRows = product.specRows || [];
  let matched = false;
  product.specRows.forEach(row => {
    if(!isAnguloAperturaRow(row)) return;
    product.specs[row.key] = angle;
    matched = true;
  });
  if(!matched){
    const key = "angulo_apertura";
    product.specRows.push({
      key,
      label: "Ángulo de apertura",
      group: "Lumínicas"
    });
    product.specs[key] = angle;
  }
  return product;
}

function focusAnglePickerHtml(p){
  if(!p || !isFocusRackSku(p.sku)) return "";
  const current = normalizeFocusAngle(p.focusAngulo);
  const opts = FOCUS_ANGLES.map(angle =>
    `<option value="${escAttr(angle)}"${angle === current ? " selected" : ""}>${escAttr(angle)}</option>`
  ).join("");
  return `<label class="pvariant pvariant-focus">
    <span class="pvariant-label">Ángulo</span>
    <select data-focus-angle data-entry="${escAttr(p.entryId || p.principalSku)}" data-principal="${escAttr(p.principalSku)}" aria-label="Elegir ángulo">${opts}</select>
  </label>`;
}

function resolvedKelvin(doc, docs){
  const info = tempInfoFromDoc(doc);
  if(info.kelvin) return info.kelvin;
  if(!info.tone) return null;
  const ks = [...new Set((docs || []).map(tempInfoFromDoc)
    .filter(i => i.tone === info.tone && i.kelvin)
    .map(i => i.kelvin))];
  return ks.length === 1 ? ks[0] : null;
}

function tempAxisKey(doc, docs){
  const info = tempInfoFromDoc(doc);
  if(info.tone) return info.tone;
  const k = resolvedKelvin(doc, docs);
  return k ? String(k) : "";
}

function variantOptionLabel(doc){
  if(!doc) return "";
  const declared = String(doc.attr_variantes || "").trim();
  if(declared) return declared;
  const name = foldText(doc.nombre_attr_variantes);
  const tempText = docText(doc, ["rango_temperatura", "temperatura_color"]);
  const anguloText = docText(doc, ["angulo_apertura", "angulo_de_apertura", "angulo_grados"]);
  const colorText = docText(doc, ["color"]);
  const potenciaText = docText(doc, ["potencia"]);
  if(/luz|temp/.test(name) && tempText) return tempText;
  if(/angulo/.test(name) && anguloText) return anguloText;
  if(/color/.test(name) && colorText) return colorText;
  if(/potenc/.test(name) && potenciaText) return potenciaText;
  const pot = potenciaFromDoc(doc);
  if(pot) return pot.label;
  return "";
}

function axisValue(doc, axis){
  if(axis === "color") return colorFromDoc(doc);
  if(axis === "potencia"){
    const pot = potenciaFromDoc(doc);
    return pot ? pot.key : "";
  }
  if(axis === "temp") return tempFromDoc(doc);
  if(axis === "angulo") return anguloFromDoc(doc);
  return variantOptionLabel(doc) || (doc && doc.sku) || "";
}

function valuesDiffer(docs, getter){
  const vals = [...new Set((docs || []).map(getter).filter(v => v != null && v !== ""))];
  return vals.length > 1;
}

function detectVariantAxes(docs){
  const list = docs || [];
  const axes = [];
  if(valuesDiffer(list, colorFromDoc)) axes.push("color");
  if(valuesDiffer(list, d => { const p = potenciaFromDoc(d); return p ? p.key : ""; })) axes.push("potencia");
  if(valuesDiffer(list, d => tempAxisKey(d, list))) axes.push("temp");
  if(valuesDiffer(list, anguloFromDoc)) axes.push("angulo");
  if(axes.length) return axes;
  if(valuesDiffer(list, d => variantOptionLabel(d) || d.sku)) return ["otro"];
  return [];
}

function axisTitle(axis){
  if(axis === "color") return "Color";
  if(axis === "potencia") return "Potencia";
  if(axis === "temp") return "Temperatura";
  if(axis === "angulo") return "Ángulo";
  return "Variante";
}

function tempChipMeta(value){
  const info = { kelvin: kelvinFromText(value), tone: tempCategoryKey(value) };
  const tone = info.tone ? TEMP_TONES[info.tone] : null;
  const k = info.kelvin;
  if(tone && k) return { color: tone.color, label: `${tone.label} ${k}K`, title: `${tone.label} ${k}K` };
  if(k) return { color: "#d9d9d9", label: `${k}K`, title: `${k}K` };
  if(tone) return { color: tone.color, label: tone.label, title: tone.label };
  return { color: "#d9d9d9", label: String(value || "").trim(), title: String(value || "").trim() };
}

function variantFriendlyLabel(doc, axes, docs){
  const bits = (axes || []).map(axis => {
    if(axis === "color") return colorLabel(colorFromDoc(doc));
    if(axis === "potencia"){
      const pot = potenciaFromDoc(doc);
      return pot ? pot.label : "";
    }
    if(axis === "temp"){
      const info = tempInfoFromDoc(doc);
      const tone = info.tone && TEMP_TONES[info.tone];
      const k = info.kelvin || resolvedKelvin(doc, docs);
      if(tone && k) return `${tone.label} ${k}K`;
      if(tone) return tone.label;
      return tempChipMeta(k ? `${k}K` : tempFromDoc(doc)).label;
    }
    if(axis === "angulo") return anguloFromDoc(doc);
    return variantOptionLabel(doc);
  }).filter(Boolean);
  const unique = [...new Set(bits)];
  return unique.join(" · ") || (doc && doc.sku ? String(doc.sku).trim() : "");
}

function sortVariantDocs(docs, axes){
  return [...(docs || [])].sort((a, b) => {
    if((axes || []).includes("potencia")){
      const wa = (potenciaFromDoc(a) || {}).watts || 0;
      const wb = (potenciaFromDoc(b) || {}).watts || 0;
      if(wa !== wb) return wa - wb;
    }
    if((axes || []).includes("temp")){
      const order = { calido: 1, neutro: 2, frio: 3 };
      const ia = tempInfoFromDoc(a);
      const ib = tempInfoFromDoc(b);
      const ta = order[ia.tone] || 9;
      const tb = order[ib.tone] || 9;
      if(ta !== tb) return ta - tb;
      const ka = ia.kelvin || parseInt(tempFromDoc(a), 10) || 0;
      const kb = ib.kelvin || parseInt(tempFromDoc(b), 10) || 0;
      if(ka !== kb) return ka - kb;
    }
    return variantFriendlyLabel(a, axes, docs).localeCompare(variantFriendlyLabel(b, axes, docs), "es");
  });
}

function pickerTitle(){
  return "Variante";
}

function productThumbHtml(p){
  const ph = `<span class="thumb-ph" aria-hidden="true">${ICON_BULB}</span>`;
  const img = sourceImg(p.img);
  if(!img) return `<div class="thumb is-empty">${ph}</div>`;
  return `<div class="thumb">${ph}<img src="${escAttr(img)}" alt="" onerror="this.parentNode.classList.add('is-empty');this.remove()"></div>`;
}

function buildVariantOptions(docs){
  const list = (docs || []).filter(d => d && d.sku);
  const axes = detectVariantAxes(list);
  return list.map(d => ({
    sku: d.sku,
    label: variantFriendlyLabel(d, axes, list) || d.sku,
    doc: d,
    axes
  }));
}

function mapDocToCompared(doc, extras){
  extras = extras || {};
  const imgs = parseImages(doc);
  let img = imgs[0] || sourceImg(extras.img) || "";
  if(!img && extras.variants && extras.variants.length){
    const principal = extras.variants.find(v => v.doc && v.sku === (extras.principalSku || doc.sku));
    img = principal ? (parseImages(principal.doc)[0] || "") : parseImages(extras.variants[0].doc)[0] || "";
  }
  const variants = extras.variants || [];
  const axes = extras.axes || (variants[0] && variants[0].axes) || detectVariantAxes(variants.map(v => v.doc));
  const entryId = extras.entryId || (extras.focusAngulo
    ? String(extras.principalSku || doc.sku).trim().toUpperCase() + "|" + String(extras.focusAngulo).trim()
    : (extras.principalSku || doc.sku));
  return applyFocusAngle({
    id: entryId,
    entryId,
    principalSku: extras.principalSku || doc.sku,
    sku: doc.sku,
    family: doc.familia || doc.macrofamilia || "",
    macrofamilia: doc.macrofamilia || "",
    name: doc.nombre || doc.nombre_typesense || extras.nombre || "Producto sin nombre",
    img,
    ficha: doc.link_ficha_web || "#",
    specs: mapAtributosToSpecs(doc),
    specRows: specRowsFromDoc(doc),
    variants,
    axes,
    focusAngulo: extras.focusAngulo || ""
  });
}

// variante amigable del producto para el mini-header (ej. "Blanco cálido
// 3000K") — a diferencia de currentVariantSummary(), no cae en un
// fallback "SKU: ..." cuando no hay variante real: en el mini-header el
// SKU ya se muestra en su propia línea, así que acá directamente no se
// agrega nada si no hay variante que valga la pena mostrar.
function miniVariantLabel(p){
  const angle = p && isFocusRackSku(p.sku) ? normalizeFocusAngle(p.focusAngulo) : "";
  let base = "";
  if(p && p.variants && p.variants.length >= 2){
    const current = p.variants.find(v => v.sku === p.sku);
    const doc = current ? current.doc : null;
    if(doc) base = variantFriendlyLabel(doc, p.axes, p.variants.map(v => v.doc)) || "";
  }
  if(base && angle) return `${base} · ${angle}`;
  return base || angle;
}

function currentVariantSummary(p){
  if(!p || !p.variants || p.variants.length < 2) return p ? `SKU: ${p.sku}` : "";
  const current = p.variants.find(v => v.sku === p.sku);
  const doc = current ? current.doc : null;
  if(!doc) return `SKU: ${p.sku}`;
  return variantFriendlyLabel(doc, p.axes, p.variants.map(v => v.doc)) || `SKU: ${p.sku}`;
}

function applyVariantToProduct(product, sku){
  const opt = (product.variants || []).find(v => v.sku === sku);
  if(!opt) return product;
  return mapDocToCompared(opt.doc, {
    principalSku: product.principalSku,
    entryId: product.entryId,
    variants: product.variants,
    axes: product.axes,
    nombre: product.name,
    img: product.img,
    focusAngulo: product.focusAngulo
  });
}

function uniqueLabeledDocs(docs, axes, preferredSku){
  const ordered = sortVariantDocs(docs, axes);
  const byLabel = new Map();
  ordered.forEach(doc => {
    const label = variantFriendlyLabel(doc, axes, docs);
    const prev = byLabel.get(label);
    if(!prev || doc.sku === preferredSku) byLabel.set(label, doc);
  });
  return [...byLabel.values()];
}

function variantPickerHtml(p){
  if(!p.variants || p.variants.length < 2) return "";
  const docs = p.variants.map(v => v.doc);
  const axes = (p.axes && p.axes.length) ? p.axes : detectVariantAxes(docs);
  const ordered = sortVariantDocs(docs, axes);
  const title = pickerTitle();
  const opts = ordered.map(doc => {
    const label = variantFriendlyLabel(doc, axes, docs);
    return `<option value="${escAttr(doc.sku)}"${doc.sku === p.sku ? " selected" : ""}>${escAttr(label)}</option>`;
  }).join("");
  return `<label class="pvariant">
    <span class="pvariant-label">${escAttr(title)}</span>
    <select data-entry="${escAttr(p.entryId || p.principalSku)}" data-principal="${escAttr(p.principalSku)}" aria-label="${escAttr("Elegir " + title)}">${opts}</select>
  </label>`;
}

async function fetchDocsBySkus(skus){
  const unique = [...new Set((skus || []).map(s => String(s).trim()).filter(Boolean))];
  if(!unique.length) return [];
  const escaped = unique.map(s => `\`${s.replace(/`/g, "")}\``).join(",");
  const params = new URLSearchParams({
    q: "*",
    query_by: "sku",
    filter_by: `sku:=[${escaped}]`,
    per_page: String(Math.min(Math.max(unique.length, 1), 250))
  });
  const res = await fetch(`${TS_HOST}/collections/${COLLECTION}/documents/search?${params.toString()}`, {
    headers: { "X-TYPESENSE-API-KEY": TS_API_KEY }
  });
  if(!res.ok) throw new Error(`Typesense ${res.status}`);
  const data = await res.json();
  const bySku = {};
  (data.hits || []).forEach(h => {
    const sku = h.document && h.document.sku;
    if(sku) bySku[String(sku).toUpperCase()] = h.document;
  });
  return unique.map(s => bySku[s.toUpperCase()]).filter(Boolean);
}

function skuKey(value){
  return String(value || "").trim().toUpperCase();
}

function readEspecificaciones(doc){
  let rows = doc && doc.especificaciones;
  if(typeof rows === "string"){
    try { rows = JSON.parse(rows); } catch(_){ rows = []; }
  }
  return Array.isArray(rows) ? rows : [];
}

async function hydrateComparedProduct(doc, variantSku, extras){
  extras = extras || {};
  const skuSet = new Set(parseSkuList(doc && doc.variantes_sku));
  if(doc && doc.sku) skuSet.add(doc.sku);
  if(variantSku) skuSet.add(variantSku);
  let sibs = doc ? [doc] : [];
  try{
    const fetched = await fetchDocsBySkus([...skuSet]);
    const bySku = {};
    fetched.forEach(d => { bySku[skuKey(d.sku)] = d; });
    if(doc && doc.sku && !bySku[skuKey(doc.sku)]) bySku[skuKey(doc.sku)] = doc;
    sibs = Object.values(bySku);
  }catch(err){
    console.warn("No se pudo cargar el producto completo:", err);
  }
  const variants = sibs.length > 1 ? buildVariantOptions(sibs) : [];
  const active = (variantSku && sibs.find(d => skuKey(d.sku) === skuKey(variantSku)))
    || (doc && sibs.find(d => skuKey(d.sku) === skuKey(doc.sku)))
    || sibs[0]
    || doc;
  return mapDocToCompared(active, {
    principalSku: extras.principalSku || (doc && doc.sku) || (active && active.sku),
    entryId: extras.entryId,
    nombre: extras.nombre,
    img: extras.img,
    variants,
    focusAngulo: extras.focusAngulo
  });
}

function hasSpecValue(v){
  if(v == null) return false;
  const s = String(v).trim();
  if(!s) return false;
  if(/^(-+|n\/?a|null|undefined|sin dato)$/i.test(s)) return false;
  return true;
}

function foldSpecLabel(value){
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const SPEC_TIPS = {};
SPEC_SCHEMA.forEach(section => {
  section.filas.forEach(f => {
    SPEC_TIPS[f.key] = f.tip;
    SPEC_TIPS[foldSpecLabel(f.label)] = f.tip;
  });
});

function tipForSpec(key, label){
  return SPEC_TIPS[key] || SPEC_TIPS[foldSpecLabel(label)] || "";
}

const GROUP_RULES = [
  { test: /remoto/i, title: "Características del control remoto", icon: ICON_BOX },
  { test: /controladora/i, title: "Características de la controladora", icon: ICON_BOX },
  { test: /el[eé]ctric/i, title: "Características eléctricas", icon: ICON_BOLT },
  { test: /lum[ií]nic/i, title: "Características lumínicas", icon: ICON_SUN },
  { test: /material|construcci/i, title: "Características materiales", icon: ICON_BOX },
  { test: /conect|funci/i, title: "Características de conectividad", icon: ICON_BOX },
  { test: /comercial|log[ií]stic/i, title: "Características comerciales", icon: ICON_TAG }
];

function groupMeta(grupo){
  const raw = String(grupo || "").trim();
  const index = GROUP_RULES.findIndex(rule => rule.test.test(raw));
  if(index >= 0) return { title: GROUP_RULES[index].title, icon: GROUP_RULES[index].icon, order: index };
  return { title: raw || "Especificaciones", icon: ICON_BOX, order: GROUP_RULES.length };
}

function specRowsFromDoc(doc){
  const rows = readEspecificaciones(doc);
  const out = [];
  const seen = new Set();
  rows.forEach(row => {
    const nombre = String((row && row.nombre) || "").trim();
    const valor = row && row.valor != null ? String(row.valor).trim() : "";
    if(!nombre || !hasSpecValue(valor)) return;
    const key = String((row && row.campo) || "").trim() || foldSpecLabel(nombre);
    if(seen.has(key)) return;
    seen.add(key);
    out.push({
      key,
      label: nombre,
      group: String((row && row.grupo) || "").trim() || "Especificaciones"
    });
  });
  if(!out.length){
    SPEC_SCHEMA.forEach(section => {
      section.filas.forEach(f => {
        const raw = doc && doc[FIELD_MAP[f.key]];
        if(!hasSpecValue(raw) || seen.has(f.key)) return;
        seen.add(f.key);
        out.push({ key: f.key, label: f.label, group: section.categoria });
      });
    });
  }
  if(doc && doc.sku && !seen.has("sku")){
    out.push({ key: "sku", label: "SKU", group: "Comerciales y logística" });
  }
  return out;
}

function mapAtributosToSpecs(doc){
  const specs = {};
  const rows = readEspecificaciones(doc);
  rows.forEach(row => {
    const nombre = String((row && row.nombre) || "").trim();
    const valor = row && row.valor != null ? String(row.valor).trim() : "";
    if(!nombre || !hasSpecValue(valor)) return;
    const key = String((row && row.campo) || "").trim() || foldSpecLabel(nombre);
    if(!hasSpecValue(specs[key])) specs[key] = valor;
  });
  if(!Object.keys(specs).length){
    for(const key in FIELD_MAP){
      const raw = doc[FIELD_MAP[key]];
      if(hasSpecValue(raw)) specs[key] = String(raw).trim();
    }
  }
  if(!specs.sku && doc && doc.sku) specs.sku = String(doc.sku);
  return specs;
}

function escAttr(s){
  return (s || "").toString().replace(/"/g, "&quot;");
}

function escHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function tsFilterValue(value){
  return "`" + String(value).replace(/\\/g, "\\\\").replace(/`/g, "\\`") + "`";
}

async function searchTypesenseModal(query){
  const reference = comparedProducts[0];
  const params = new URLSearchParams({
    q: query && String(query).trim() ? String(query).trim() : "*",
    query_by: "nombre,nombre_typesense,sku,descripcion",
    filter_by: BASE_FILTER,
    per_page: "20",
    page: "1",
    include_fields: "sku,nombre,nombre_typesense,descripcion,macrofamilia,familia,multiimage,imagen,link_ficha_web,variantes_sku,es_principal,especificaciones"
  });
  const scores = [];
  const macro = reference && reference.macrofamilia ? `macrofamilia:=${tsFilterValue(reference.macrofamilia)}` : "";
  if(reference && reference.family){
    const family = `familia:=${tsFilterValue(reference.family)}`;
    scores.push(`(${macro ? macro + " && " : ""}${family}):3`);
  }
  if(macro) scores.push(`(${macro}):1`);
  if(scores.length) params.set("sort_by", `_eval([${scores.join(",")}]):desc,_text_match:desc`);
  const res = await fetch(`${TS_HOST}/collections/${COLLECTION}/documents/search?${params.toString()}`, {
    headers: { "X-TYPESENSE-API-KEY": TS_API_KEY }
  });
  if(!res.ok) throw new Error(`Typesense ${res.status}`);
  const data = await res.json();
  return (data.hits || []).map(hit => hit.document).filter(Boolean).map(doc => ({
    ...doc,
    nombre_typesense: doc.nombre || doc.nombre_typesense || doc.sku
  }));
}

const COMPARE_MAX = 3;
// se crea una sola vez: leer mobileMQ.matches es barato, pero
// window.matchMedia(...) arma un MediaQueryList nuevo cada vez que se
// llama — evitarlo importa acá porque se consulta en cada frame de
// scroll horizontal (ver pinStickyColumns).
const mobileMQ = window.matchMedia("(max-width: 480px)");
const ICON_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_LINK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
const ICON_BULB = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.9V17h8v-2.1A7 7 0 0 0 12 2z"/></svg>`;
const SPEC_TIP_MARK = `<svg class="spec-tip__mark" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.4"/><path d="M8 7.2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="5.1" r="0.9" fill="currentColor"/></svg>`;

let showOnlyDiffs = false;
let tipBubble = null;
let tipOpenFor = null;

function ensureTipBubble(){
  if(!tipBubble){
    tipBubble = document.createElement("div");
    tipBubble.className = "tip-bubble";
    tipBubble.setAttribute("role", "tooltip");
    tipBubble.innerHTML = '<span class="tip-bubble__title"></span><span class="tip-bubble__body"></span>';
    document.body.appendChild(tipBubble);
  }
  return tipBubble;
}

function showTip(el){
  const bubble = ensureTipBubble();
  const titleEl = bubble.querySelector(".tip-bubble__title");
  const bodyEl = bubble.querySelector(".tip-bubble__body");
  const title = el.getAttribute("data-tip-title") || el.querySelector(".spec-tip__label")?.textContent?.trim() || el.textContent.trim();
  const body = el.dataset.tip || "";
  if(titleEl) titleEl.textContent = title;
  if(bodyEl) bodyEl.textContent = body;

  bubble.classList.remove("is-below");
  bubble.style.left = "-9999px";
  bubble.style.top = "-9999px";
  bubble.classList.add("show");
  el.classList.add("is-open");

  const anchor = el.getBoundingClientRect();
  const br = bubble.getBoundingClientRect();
  let left = anchor.left + anchor.width / 2 - br.width / 2;
  left = Math.max(10, Math.min(left, window.innerWidth - br.width - 10));

  let top = anchor.top - br.height - 12;
  let below = false;
  if(top < 10){
    top = anchor.bottom + 12;
    below = true;
  }
  bubble.classList.toggle("is-below", below);
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;

  const arrowX = anchor.left + anchor.width / 2 - left;
  bubble.style.setProperty("--tip-arrow-x", `${Math.max(14, Math.min(arrowX, br.width - 14))}px`);
}

function hideTip(){
  if(tipBubble) tipBubble.classList.remove("show");
  document.querySelectorAll(".spec-tip.is-open").forEach(el => el.classList.remove("is-open"));
  tipOpenFor = null;
}

function wireTooltips(container){
  container.querySelectorAll(".spec-tip").forEach(el => {
    if(el.dataset.tipWired === "1") return;
    el.dataset.tipWired = "1";
    el.addEventListener("mouseenter", () => showTip(el));
    el.addEventListener("mouseleave", hideTip);
    el.addEventListener("focus", () => showTip(el));
    el.addEventListener("blur", hideTip);
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isSameOpen = tipOpenFor === el;
      hideTip();
      if(!isSameOpen){
        showTip(el);
        tipOpenFor = el;
      }
    });
  });
}
document.addEventListener("click", () => hideTip());

/* =========================================================
   RENDER
   ========================================================= */
function buildRows(){
  const catalog = new Map();
  comparedProducts.forEach(p => {
    (p.specRows || []).forEach(row => {
      if(!catalog.has(row.key)) catalog.set(row.key, row);
    });
  });
  const byGroup = new Map();
  catalog.forEach(row => {
    const meta = groupMeta(row.group);
    if(!byGroup.has(meta.title)) byGroup.set(meta.title, { title: meta.title, icon: meta.icon, order: meta.order, filas: [] });
    byGroup.get(meta.title).filas.push(row);
  });
  const rows = [];
  [...byGroup.values()].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "es")).forEach(section => {
    const filas = section.filas.filter(f => {
      const vals = comparedProducts.map(p => p.specs[f.key]);
      if(!vals.some(hasSpecValue)) return false;
      if(!showOnlyDiffs) return true;
      const compareVals = comparedProducts.map(p => hasSpecValue(p.specs[f.key]) ? String(p.specs[f.key]).trim() : "—");
      return !compareVals.every(v => v === compareVals[0]);
    });
    if(!filas.length) return;
    rows.push({ type: "section", label: section.title, icon: section.icon || "" });
    filas.forEach(f => rows.push({ type: "row", label: f.label, key: f.key, tip: tipForSpec(f.key, f.label) }));
  });
  return rows;
}

function render(){
  const grid = document.getElementById("compareGrid");
  const rows = buildRows();

  document.getElementById("countLabel").textContent =
    `${comparedProducts.length} producto${comparedProducts.length === 1 ? "" : "s"}`;

  // la pista de "deslizá para comparar" solo tiene sentido si hay más de un
  // producto para desplazarse a ver (si no, no hay nada que deslizar)
  document.getElementById("swipeHint").classList.toggle("show", comparedProducts.length > 1);
  document.getElementById("swipeHint").classList.remove("hidden");

  // Fila de encabezado: primera celda tiene el toggle de diferencias adentro,
  // seguida siempre de 3 columnas (producto o slot "Agregar"). En mobile
  // esta celda se oculta por CSS (queda tapada por el ancho angosto de la
  // columna) y en su lugar se usa #diffBar, siempre visible arriba de la
  // tabla — ver el media query de .header-label / .diff-bar en styles.css.
  let html = `
    <div class="cell label header-label" style="border-bottom:1px solid #edeff2;">
      <label class="diff-toggle">
        <span class="switch" id="diffSwitch"><input type="checkbox" id="diffCheckbox"><span class="knob"></span></span>
        <span class="dt-full">Mostrar solo las diferencias</span>
        <span class="dt-short">Solo diferencias</span>
      </label>
    </div>`;

  for(let i = 0; i < COMPARE_MAX; i++){
    const p = comparedProducts[i];
    if(p){
      const fichaHref = String(p.ficha || "").trim();
      const canOpenFicha = fichaHref && fichaHref !== "#";
      const linkOpen = canOpenFicha
        ? `<a class="phead-link" href="${escAttr(fichaHref)}" aria-label="${escAttr("Ver ficha de " + p.name)}">`
        : `<div class="phead-link is-static">`;
      const linkClose = canOpenFicha ? "</a>" : "</div>";
      html += `
        <div class="cell product-head coldata">
          <button class="remove" data-remove="${p.id}" title="Quitar de la comparación">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          ${linkOpen}
          ${productThumbHtml(p)}
          <div class="pname">${escHtml(p.name)}</div>
          <div class="psku">${escAttr(p.sku)}</div>
          ${canOpenFicha ? `<span class="phead-hint">${ICON_LINK}<span>Ver ficha</span></span>` : ""}
          ${linkClose}
          ${variantPickerHtml(p)}
          ${focusAnglePickerHtml(p)}
        </div>`;
    }else{
      html += `
        <div class="cell add-slot coldata">
          <div class="box" data-open-modal="1">
            <span class="plus">+</span>
            <span class="lbl">Agregar</span>
          </div>
        </div>`;
    }
  }

  html += `<div id="headerSentinel" style="grid-column:1/-1;height:1px;"></div>`;

  // Filas de specs: misma lógica de 3 columnas fijas, celda vacía si no hay producto ahí
  rows.forEach(row => {
    if(row.type === "section"){
      html += `<div class="cell section"><span class="section-title">${row.icon || ""}<span class="section-title-text">${escHtml(row.label)}</span></span></div>`;
      return;
    }
    const labelCell = row.tip
      ? `<button type="button" class="spec-tip" data-tip-title="${escAttr(row.label)}" data-tip="${escAttr(row.tip)}" aria-label="${escAttr(row.label)}: más información"><span class="spec-tip__label">${row.label}</span>${SPEC_TIP_MARK}</button>`
      : row.label;
    // en mobile, .label-full ocupa la fila completa (mismo trato que
    // .cell.section) y el valor de cada producto pasa a una fila propia
    // debajo, ahora en un grid de 3 columnas (sin columna de label
    // reservada) — ver el media query de .label-full en styles.css.
    // .label-full-text es el target del pin en mobile (el texto se
    // desliza para quedar pegado a la izquierda mientras la celda entera,
    // ya del ancho total, no necesita moverse — mismo patrón que
    // .section-title). En desktop .label-full no cambia de ancho, así que
    // ahí se sigue pineando la celda entera (ver pinStickyColumns).
    html += `<div class="cell label label-full"><span class="label-full-text">${labelCell}</span></div>`;
    for(let i = 0; i < COMPARE_MAX; i++){
      const p = comparedProducts[i];
      if(p){
        const val = p.specs[row.key];
        html += `<div class="cell value coldata">${hasSpecValue(val) ? `<span class="value-text">${escHtml(val)}</span>` : '<span class="dash">—</span>'}</div>`;
      }else{
        html += `<div class="cell value empty-col coldata"></div>`;
      }
    }
  });

  grid.innerHTML = html;
  grid.setAttribute("aria-busy", "false");

  grid.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      comparedProducts = comparedProducts.filter(p => p.id !== btn.dataset.remove);
      window.MacroledCompare.removeFromCompare(btn.dataset.remove);
      render();
    });
  });
  grid.querySelectorAll(".pvariant select:not([data-focus-angle])").forEach(sel => {
    sel.addEventListener("change", () => {
      const entryId = sel.dataset.entry || sel.dataset.principal;
      const sku = sel.value;
      comparedProducts = comparedProducts.map(p =>
        (p.entryId || p.principalSku) === entryId ? applyVariantToProduct(p, sku) : p
      );
      const updated = comparedProducts.find(p => (p.entryId || p.principalSku) === entryId);
      if(window.MacroledCompare.setCompareVariant){
        window.MacroledCompare.setCompareVariant(entryId, sku, updated && updated.img);
      }
      render();
    });
  });
  grid.querySelectorAll("[data-focus-angle]").forEach(sel => {
    sel.addEventListener("change", () => {
      const entryId = sel.dataset.entry || sel.dataset.principal;
      const angle = normalizeFocusAngle(sel.value);
      comparedProducts = comparedProducts.map(p => {
        if((p.entryId || p.principalSku) !== entryId) return p;
        p.focusAngulo = angle;
        const nextId = String(p.sku || "").trim().toUpperCase() + "|" + angle;
        const taken = comparedProducts.some(other => other !== p && (other.entryId || other.id) === nextId);
        if(!taken){
          p.entryId = nextId;
          p.id = nextId;
        }
        return applyFocusAngle(p);
      });
      if(window.MacroledCompare.setFocusAngulo){
        window.MacroledCompare.setFocusAngulo(entryId, angle);
      }
      render();
    });
  });
  grid.querySelectorAll("[data-open-modal]").forEach(el => el.addEventListener("click", openModal));
  wireTooltips(grid);

  // el toggle de desktop (dentro del grid) se recrea en cada render, así
  // que hay que re-conectar su listener y re-sincronizar su estado visual.
  // Los de mobile (#diffBar y el de debajo del mini-header) viven fuera
  // del grid y ya están conectados una sola vez más abajo — acá solo se
  // sincroniza su estado visual.
  document.getElementById("diffCheckbox").addEventListener("change", (e) => {
    showOnlyDiffs = e.target.checked;
    document.getElementById("diffSwitch").classList.toggle("on", showOnlyDiffs);
    document.getElementById("diffFloatSwitch")?.classList.toggle("on", showOnlyDiffs);
    document.getElementById("miniDiffSwitch")?.classList.toggle("on", showOnlyDiffs);
    render();
  });
  if(showOnlyDiffs){
    document.getElementById("diffCheckbox").checked = true;
    document.getElementById("diffSwitch").classList.add("on");
  }
  document.getElementById("diffFloatSwitch")?.classList.toggle("on", showOnlyDiffs);
  document.getElementById("miniDiffSwitch")?.classList.toggle("on", showOnlyDiffs);

  updateMiniHeader();
  observeHeaderSentinel();
  updateScrollAffordance();
  collectPinTargets();
  pinStickyColumns();
}

/* =========================================================
   MODAL "Buscar producto para comparar"
   ========================================================= */
function openModal(){
  window.MacroledComparePicker.open({
    search: searchTypesenseModal,
    isSelected: sku => {
      const matches = comparedProducts.filter(p => skuKey(p.principalSku) === skuKey(sku) || skuKey(p.sku) === skuKey(sku));
      if(!isFocusRackSku(sku)) return matches.length > 0;
      const used = new Set(matches.map(p => normalizeFocusAngle(p.focusAngulo)));
      return used.size >= FOCUS_ANGLES.length;
    },
    atLimit: () => comparedProducts.length >= COMPARE_MAX,
    add: async doc => {
      const sku = doc.sku || doc.id || "";
      const used = new Set(comparedProducts
        .filter(p => skuKey(p.principalSku) === skuKey(sku) || skuKey(p.sku) === skuKey(sku))
        .map(p => normalizeFocusAngle(p.focusAngulo)));
      const focusAngulo = isFocusRackSku(sku) ? (FOCUS_ANGLES.find(angle => !used.has(angle)) || "") : "";
      if(isFocusRackSku(sku) && used.size && !focusAngulo) return;
      const entryId = focusAngulo ? String(sku).trim().toUpperCase() + "|" + focusAngulo : sku;
      const hydrated = await hydrateComparedProduct(doc, sku, { principalSku: sku, entryId, focusAngulo });
      if (comparedProducts.length >= COMPARE_MAX || comparedProducts.some(p => (p.entryId || p.id) === entryId)) return;
      comparedProducts.push(hydrated);
      window.MacroledCompare.addToCompare({ sku, nombre: hydrated.name || "", img: hydrated.img || parseImages(doc)[0] || "", focusAngulo, entryId });
      render();
    }
  });
}
function closeModal(){ window.MacroledComparePicker.close(); }

/* =========================================================
   TOOLBAR — imprimir
   ========================================================= */
const PRINT_CHROME_SELECTORS = [
  "#macroled-menu",
  ".footer-wrap",
  ".w-nav",
  ".nl-backdrop",
  ".nl-popup",
  ".compare-bar",
  ".w-webflow-badge",
  "#aiLaunch",
  ".ai-launch",
  "#aiPanel",
  "#aiBackdrop"
];

function setComparePrintChrome(hidden){
  document.documentElement.classList.toggle("is-printing-compare", hidden);
  PRINT_CHROME_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if(hidden){
        if(!el.hasAttribute("data-print-prev-display")){
          el.setAttribute("data-print-prev-display", el.style.getPropertyValue("display"));
        }
        el.style.setProperty("display", "none", "important");
      } else if(el.hasAttribute("data-print-prev-display")){
        const prev = el.getAttribute("data-print-prev-display");
        el.removeAttribute("data-print-prev-display");
        if(prev) el.style.setProperty("display", prev);
        else el.style.removeProperty("display");
      }
    });
  });
}

function prepareComparePrint(){
  const shell = document.getElementById("compareShell");
  if(shell) shell.scrollLeft = 0;
  document.documentElement.style.setProperty("--mini-scroll-x", "0px");

  document.body.classList.remove("assistant-open", "print-cols-1", "print-cols-2", "print-cols-3");
  const n = Math.max(1, Math.min(3, (comparedProducts && comparedProducts.length) || 1));
  document.body.classList.add("print-cols-" + n);

  const panel = document.getElementById("aiPanel");
  const backdrop = document.getElementById("aiBackdrop");
  if(panel){ panel.classList.remove("is-open"); panel.hidden = true; }
  if(backdrop){ backdrop.classList.remove("is-open"); backdrop.hidden = true; }
  const modal = document.getElementById("modalOverlay");
  if(modal) modal.classList.remove("open");
  setComparePrintChrome(true);
}

function cleanupComparePrint(){
  document.body.classList.remove("print-cols-1", "print-cols-2", "print-cols-3");
  setComparePrintChrome(false);
}

document.getElementById("printBtn").addEventListener("click", () => {
  prepareComparePrint();
  requestAnimationFrame(() => window.print());
});
window.addEventListener("beforeprint", prepareComparePrint);
window.addEventListener("afterprint", cleanupComparePrint);

/* =========================================================
   BOTÓN "VOLVER" DINÁMICO
   Prioridad de destino (siempre una URL concreta, no history.back):
   1) ?from=<url> que mandó el catálogo/ficha — conserva filtros/búsqueda
   2) document.referrer — la página desde la que se abrió la comparativa
   3) lo guardado en sessionStorage (sobrevive un refresh de esta página)
   4) catálogo de productos
   ========================================================= */
const FROM_STORAGE_KEY = "macroledCompareFrom";
const FROM_LABEL_STORAGE_KEY = "macroledCompareFromLabel";
const PRODUCTS_PAGE_FALLBACK = (() => {
  try{
    const path = (location.pathname || "").replace(/\\/g, "/");
    if(/\/comparar(\/|$)/i.test(path) && !/\.webflow\.io$/i.test(location.hostname)){
      return "../productos/";
    }
  }catch(_){}
  return "/nuevo-productos";
})();
const urlParams = new URLSearchParams(location.search);

function isComparePath(pathname){
  const path = String(pathname || "").replace(/\/+$/, "").toLowerCase();
  return /nuevo-comparativa$/.test(path) || /\/comparar$/.test(path) || /comparar\.html$/.test(path);
}

function isSafeBackUrl(url){
  try{
    const u = new URL(url, location.href);
    if(u.protocol !== "http:" && u.protocol !== "https:") return false;
    if(isComparePath(u.pathname)) return false;
    const host = u.hostname.toLowerCase();
    if(host === location.hostname.toLowerCase()) return true;
    return host === "macroled.com"
      || host === "www.macroled.com"
      || host.endsWith(".macroled.com")
      || host === "macroled.webflow.io"
      || host.endsWith(".webflow.io");
  }catch(_){
    return false;
  }
}

function labelFromUrl(url){
  try{
    const u = new URL(url, location.href);
    const q = u.searchParams.get("q");
    if(q) return `Resultados para "${q}"`;
    const mf = u.searchParams.get("macrofamilia");
    if(mf) return mf;
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    if(path.includes("nuevo-productos") || /\/productos$/.test(path)) return "productos";
    return "la página anterior";
  }catch(_){
    return "productos";
  }
}

function persistBackOrigin(url, label){
  try{
    if(url && isSafeBackUrl(url)) sessionStorage.setItem(FROM_STORAGE_KEY, url);
    if(label) sessionStorage.setItem(FROM_LABEL_STORAGE_KEY, label);
  }catch(_){}
}

function readStored(key){
  try{ return sessionStorage.getItem(key); }catch(_){ return null; }
}

const fromParam = urlParams.get("from");
const fromLabelParam = urlParams.get("fromLabel");
if(fromParam && isSafeBackUrl(fromParam)) persistBackOrigin(fromParam, fromLabelParam);
else if(document.referrer && isSafeBackUrl(document.referrer) && !readStored(FROM_STORAGE_KEY)){
  persistBackOrigin(document.referrer, fromLabelParam);
}

const fromUrl = [fromParam, document.referrer, readStored(FROM_STORAGE_KEY)]
  .find(url => url && isSafeBackUrl(url)) || PRODUCTS_PAGE_FALLBACK;
const fromLabel = fromLabelParam || readStored(FROM_LABEL_STORAGE_KEY) || labelFromUrl(fromUrl);

const backLink = document.getElementById("backLink");
const backLinkText = document.getElementById("backLinkText");
if(fromLabel) backLinkText.textContent = `Volver a ${fromLabel}`;
backLink.href = fromUrl;

// una vez que el usuario deslizó, ocultamos el banner
document.getElementById("compareShell").addEventListener("scroll", function onFirstScroll(){
  if(this.scrollLeft > 12){
    document.getElementById("swipeHint").classList.add("hidden");
    this.removeEventListener("scroll", onFirstScroll);
  }
}, { passive: true });

/* =========================================================
   AFFORDANCE PERSISTENTE DE SCROLL — a diferencia del banner de texto
   (que se oculta para siempre en el primer scroll), el gradiente queda
   mientras haya más columnas por ver.
   shell.scrollWidth/clientWidth son lecturas de layout: si se piden justo
   después de escribir estilos (como los transform de pinStickyColumns),
   el navegador tiene que resolver el layout pendiente antes de poder
   contestar — eso es "layout thrashing", y forzarlo en cada frame de
   scroll es una causa real de scroll trabado. Por eso esta función NO se
   llama desde el callback de rAF (ver resyncHorizontalScrollUI): solo se
   ejecuta al asentarse el scroll (settle timer / scrollend), donde una
   lectura de layout ocasional no se nota. En mobile el gradiente ni se ve
   (.scroll-fade{display:none}, ver styles.css), así que ahí ni vale la
   pena leer nada. */
function updateScrollAffordance(){
  const shell = document.getElementById("compareShell");
  if(!shell) return;
  const max = shell.scrollWidth - shell.clientWidth;
  const hasOverflow = max > 4;
  // Activa el "modo pin" (transform + will-change en labels/section-titles,
  // ver pinStickyColumns) solo cuando la tabla realmente scrollea. Sin esto,
  // en desktop ancho (sin overflow) esas celdas quedaban promovidas a su
  // propia capa de composición sin ningún motivo, y eso hacía que Chromium
  // dejara de pintar el borde-left vecino (.cell.coldata, la línea
  // separadora entre columnas) hasta el próximo repaint forzado (p.ej. al
  // abrir DevTools).
  shell.classList.toggle("has-hscroll", hasOverflow);

  if(mobileMQ.matches) return;
  const fade = document.getElementById("scrollFade");
  if(!fade) return;
  fade.classList.toggle("show", hasOverflow && shell.scrollLeft < max - 4);
}

/* =========================================================
   COLUMNA DE LABELS + TÍTULO DE SECCIÓN "FIJOS" EN EL SCROLL HORIZONTAL
   — no se usa position:sticky (con muchas celdas sticky apiladas se ve
   una costura/sombra entre ellas al scrollear, incluso en Chromium). En
   cambio, se mueven a mano con transform en cada scroll: como todas
   reciben el mismo valor en el mismo frame, se desplazan en perfecto
   conjunto y no queda ninguna costura visible.

   pinStickyColumns() corre en cada frame de scroll (ver
   resyncHorizontalScrollUI), así que NO puede volver a recorrer el DOM
   con querySelectorAll/querySelector cada vez — con una comparación de
   20-30 specs eso es re-escanear todo #compareGrid decenas de veces por
   segundo mientras se scrollea, y se sentía como lag/scroll trabado. En
   vez de eso, collectPinTargets() junta las referencias UNA sola vez por
   render() (cuando el grid recién se recreó) y pinStickyColumns() solo
   itera ese array ya armado. */
let pinTargets = null;

function collectPinTargets(){
  pinTargets = {
    plainLabels: document.querySelectorAll("#compareGrid .cell.label:not(.label-full)"),
    fullLabels: Array.from(document.querySelectorAll("#compareGrid .cell.label.label-full")).map(el => ({
      el, inner: el.querySelector(".label-full-text")
    })),
    sectionTitles: document.querySelectorAll("#compareGrid .cell.section .section-title"),
  };
}

function pinStickyColumns(){
  if(!pinTargets) return;
  const shell = document.getElementById("compareShell");
  const hasOverflow = shell.classList.contains("has-hscroll");
  // Sin overflow no hay nada que "pinear": dejar el transform vacío evita
  // promover estas celdas a su propia capa de composición sin necesidad
  // (ver el comentario en updateScrollAffordance).
  const t = hasOverflow ? `translateX(${shell.scrollLeft}px)` : "";
  const isMobile = mobileMQ.matches;
  pinTargets.plainLabels.forEach(el => { el.style.transform = t; });
  // .label-full: en mobile ocupa toda la fila (mismo ancho que el contenido
  // scrolleable), así que la celda no se mueve — solo el texto de adentro se
  // desliza para quedar pegado a la izquierda (idéntico a .section-title).
  // En desktop la celda vuelve a ser una columna angosta más, así que se
  // pinea entera como cualquier .cell.label (si no, su fondo blanco no
  // taparía los valores que scrollean por detrás).
  pinTargets.fullLabels.forEach(({ el, inner }) => {
    el.style.transform = isMobile ? "" : t;
    if(inner) inner.style.transform = isMobile ? t : "";
  });
  pinTargets.sectionTitles.forEach(el => { el.style.transform = t; });
}

/* =========================================================
   MINI-HEADER STICKY — aparece pegado arriba cuando la fila real de
   productos (con foto, nombre y botones) ya scrolleó fuera de vista, para
   no perder de vista qué columna es cada producto. Funciona en mobile y
   desktop por igual.
   ========================================================= */
let headerObserver = null;

function updateMiniHeader(){
  const miniGrid = document.getElementById("miniGrid");
  // en desktop/tablet el grid real sigue teniendo 4 columnas (label + 3
  // productos), así que el mini-header espeja esa primera columna vacía
  // para que sus celdas queden alineadas con las de producto de abajo. En
  // mobile esa columna ya no existe (ver el media query de 480px en
  // styles.css: .compare-grid pasa a 3 columnas), así que acá tampoco.
  const isMobile = mobileMQ.matches;
  let html = isMobile ? "" : `<div class="mini-cell"></div>`;
  for(let i = 0; i < COMPARE_MAX; i++){
    const p = comparedProducts[i];
    if(p){
      const variantLabel = miniVariantLabel(p);
      const variantHtml = variantLabel ? `<div class="variant">${escAttr(variantLabel)}</div>` : "";
      html += `<div class="mini-cell"><div class="thumb">${p.img ? `<img src="${escAttr(p.img)}" alt="">` : ""}</div><div class="mini-info"><div class="name">${p.name}</div><div class="sku">${escAttr(p.sku)}</div>${variantHtml}</div></div>`;
    }else{
      html += `<div class="mini-cell"></div>`;
    }
  }
  miniGrid.innerHTML = html;
}

// #miniDiffToggle vive dentro de #miniHeader, que nunca se recrea (a
// diferencia de #miniGrid, que se reescribe entero en cada
// updateMiniHeader()), así que se engancha acá una sola vez.
document.getElementById("miniDiffToggle")?.addEventListener("click", () => {
  showOnlyDiffs = !showOnlyDiffs;
  render();
});

function observeHeaderSentinel(){
  const sentinel = document.getElementById("headerSentinel");
  if(!sentinel) return;
  if(headerObserver) headerObserver.disconnect();
  headerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // se activa apenas la fila de productos (arriba del sentinel) sale
      // por encima de la pantalla — no cuando todavía no llegamos a ella
      const scrolledPast = entry.boundingClientRect.top < 0;
      document.getElementById("miniHeader").classList.toggle("show", scrolledPast);
    });
  }, { threshold: 0 });
  headerObserver.observe(sentinel);
}

/* =========================================================
   SWITCH "SOLO DIFERENCIAS" EN MOBILE — hay dos controles fuera del
   grid: #diffBar (fijo, siempre visible arriba de la tabla mientras la
   fila de productos está a la vista) y #miniDiffToggle (fila propia
   debajo del mini-header, visible una vez que esa fila scrollea fuera de
   vista y el mini-header se pone sticky — ver #miniDiffRow en
   styles.css). En desktop ninguno de los dos se ve: se usa el de adentro
   del grid (.header-label). Los tres actúan sobre el mismo estado
   (showOnlyDiffs) y se mantienen sincronizados entre sí en render().
   ========================================================= */
// se protege con un check de null: si esta página quedó cacheada con un
// HTML viejo (sin el bloque #diffBar) mientras se sirve un app.js más
// nuevo, esto no debe tirar abajo el resto del script — sin esto, una
// excepción acá corta TODO el render que sigue más abajo en el archivo.
const diffFloatToggleEl = document.getElementById("diffFloatToggle");
if(diffFloatToggleEl){
  diffFloatToggleEl.addEventListener("click", () => {
    showOnlyDiffs = !showOnlyDiffs;
    document.getElementById("diffSwitch")?.classList.toggle("on", showOnlyDiffs);
    const diffCheckboxEl = document.getElementById("diffCheckbox");
    if(diffCheckboxEl) diffCheckboxEl.checked = showOnlyDiffs;
    document.getElementById("diffFloatSwitch")?.classList.toggle("on", showOnlyDiffs);
    document.getElementById("miniDiffSwitch")?.classList.toggle("on", showOnlyDiffs);
    render();
  });
}

/* =========================================================
   UN SOLO LISTENER DE SCROLL HORIZONTAL — antes había varios listeners
   de "scroll" separados en #compareShell (mini-scroll-x, pinStickyColumns,
   updateScrollAffordance), cada uno haciendo sus propias consultas/cambios
   al DOM en cada evento. Durante un scroll con inercia eso puede disparar
   muchas veces por segundo y competir con el scroll-snap nativo por
   tiempo de main thread, haciendo que el snap no llegue a asentarse bien
   (cards a mitad de camino en vez de mostrarse completas). Ahora todo
   corre junto, una sola vez por frame.
   ========================================================= */
function resyncHorizontalScrollUI(){
  const shell = document.getElementById("compareShell");
  document.documentElement.style.setProperty("--mini-scroll-x", `${-shell.scrollLeft}px`);
  pinStickyColumns();
}

// se asienta el scroll (settle timer / scrollend): acá sí conviene correr
// updateScrollAffordance(), que lee scrollWidth/clientWidth — ver el
// comentario en su definición sobre por qué NO se llama en cada frame.
function resyncHorizontalScrollUISettled(){
  resyncHorizontalScrollUI();
  updateScrollAffordance();
  document.getElementById("compareShell").classList.remove("is-hscrolling");
}

let hScrollTicking = false;
let scrollSettleTimer = null;
document.getElementById("compareShell").addEventListener("scroll", function(){
  // "is-hscrolling" solo vive mientras el dedo/rueda está efectivamente
  // moviendo el carrusel — ver el comentario junto a .cell.label en
  // styles.css sobre por qué will-change/backface-visibility no pueden
  // quedar prendidos todo el tiempo (con ~30 filas de specs eso son ~45
  // capas de composición promovidas en simultáneo, aunque el usuario ni
  // esté tocando el carrusel — eso es lo que se sentía como scroll lento,
  // vertical inclusive, ya que esas capas de más pesan en cada frame de
  // cualquier scroll de la página, no solo el horizontal).
  this.classList.add("is-hscrolling");
  if(!hScrollTicking){
    hScrollTicking = true;
    requestAnimationFrame(() => { hScrollTicking = false; resyncHorizontalScrollUI(); });
  }
  clearTimeout(scrollSettleTimer);
  scrollSettleTimer = setTimeout(resyncHorizontalScrollUISettled, 120);
}, { passive: true });
document.getElementById("compareShell").addEventListener("scrollend", resyncHorizontalScrollUISettled, { passive: true });

/* =========================================================
   CARGA INICIAL — resuelve los SKUs guardados en localStorage
   (compare.js) contra Typesense para traer los datos completos
   ========================================================= */
async function resolveProductsFromStorage(){
  const stored = window.MacroledCompare.getCompareList(); // [{sku, nombre, img, variantSku}]

  if(!stored.length){
    comparedProducts = [];
    render();
    return;
  }

  try{
    const principalDocs = await fetchDocsBySkus(stored.map(p => p.sku));
    const bySku = {};
    principalDocs.forEach(d => { bySku[skuKey(d.sku)] = d; });

    const siblingSkus = [];
    stored.forEach(p => {
      const doc = bySku[skuKey(p.sku)];
      if(doc) parseSkuList(doc.variantes_sku).forEach(s => siblingSkus.push(s));
      if(p.variantSku) siblingSkus.push(p.variantSku);
    });
    if(siblingSkus.length){
      (await fetchDocsBySkus(siblingSkus)).forEach(d => { bySku[skuKey(d.sku)] = d; });
    }

    comparedProducts = stored.map(p => {
      const principal = bySku[skuKey(p.sku)];
      const storedEntry = p.entryId || (p.focusAngulo ? String(p.sku).trim().toUpperCase() + "|" + p.focusAngulo : p.sku);
      if(!principal){
        return { id: storedEntry, entryId: storedEntry, principalSku: p.sku, sku: p.sku, family: "", name: p.nombre || p.sku, img: p.img || "", ficha: "#", specs: {}, specRows: [], variants: [], focusAngulo: p.focusAngulo || "" };
      }
      const skuSet = new Set(parseSkuList(principal.variantes_sku));
      skuSet.add(principal.sku);
      const sibs = [...skuSet].map(s => bySku[skuKey(s)]).filter(Boolean);
      if(!sibs.some(d => skuKey(d.sku) === skuKey(principal.sku))) sibs.unshift(principal);
      const variants = sibs.length > 1 ? buildVariantOptions(sibs) : [];
      const activeSku = (p.variantSku && bySku[skuKey(p.variantSku)]) ? p.variantSku : principal.sku;
      return mapDocToCompared(bySku[skuKey(activeSku)] || principal, {
        principalSku: p.sku,
        entryId: storedEntry,
        nombre: p.nombre,
        img: p.img,
        variants,
        focusAngulo: p.focusAngulo
      });
    });
  }catch(err){
    console.error("No se pudieron resolver los productos guardados contra Typesense:", err);
    comparedProducts = stored.map(p => ({ id: p.sku, principalSku: p.sku, sku: p.sku, family: "", name: p.nombre || p.sku, img: p.img || "", ficha: "#", specs: {}, variants: [] }));
  }
  render();
}

// Si desde otra pestaña (el catálogo) se agrega/saca un producto, refrescamos.
window.addEventListener("storage", (e) => { if(e.key === "macroled_compare") resolveProductsFromStorage(); });

resolveProductsFromStorage();

/* =========================================================
   ASISTENTE — mismo núcleo que en productos/ficha
   ========================================================= */
(function () {
  "use strict";

  const N8N_WEBHOOK_URL = "https://n8n.coresagroup.com/webhook/macroled-ia";
  const AI_TIMEOUT_MS = 12000;

  /* Id de sesión: uno por carga de página, solo en memoria. Al refrescar
     arranca conversación nueva. Si el webhook responde resetSession,
     se genera uno nuevo al toque. */
  function newSessionId() {
    return window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : `sid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  window.MacroledSessionId = window.MacroledSessionId || newSessionId();

  function defaultFallbackHtml() {
    return "No pude encontrar información sobre esa consulta en este momento.";
  }

  function init(options) {
    options = options || {};
    const getPayload = typeof options.getPayload === "function" ? options.getPayload : (q) => ({ pregunta: q });
    const localAnswer = typeof options.localAnswer === "function" ? options.localAnswer : null;
    const getSuggestions = typeof options.suggestions === "function" ? options.suggestions : () => [];
    const fallbackHtml = typeof options.fallbackHtml === "function" ? options.fallbackHtml : defaultFallbackHtml;
    const greeting = options.greeting || "Hola, soy el asistente de <b>productos Macroled</b>.";

    const aiLaunch = document.getElementById("aiLaunch");
    const aiPanel = document.getElementById("aiPanel");
    const aiBackdrop = document.getElementById("aiBackdrop");
    const aiMessages = document.getElementById("aiMessages");
    const aiTyping = document.getElementById("aiTyping");
    const aiSuggestions = document.getElementById("aiSuggestions");
    const aiForm = document.getElementById("aiForm");
    const aiInput = document.getElementById("aiInput");
    const aiClose = document.getElementById("aiClose");

    if (!aiPanel || !aiForm || !aiMessages) {
      console.warn("[asistente] Faltan elementos del widget en el DOM — no se inicializa.");
      return;
    }

    let aiBusy = false;
    let aiLastTrigger = null;
    const usedSuggestions = new Set();
    let askedCount = 0;

    function openAssistant(trigger) {
      aiLastTrigger = trigger || document.activeElement;
      if (aiBackdrop) {
        aiBackdrop.hidden = false;
        aiBackdrop.removeAttribute("hidden");
      }
      aiPanel.hidden = false;
      aiPanel.removeAttribute("hidden");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          aiPanel.classList.add("is-open");
          if (aiBackdrop) aiBackdrop.classList.add("is-open");
        });
      });
      document.body.classList.add("assistant-open");
      try {
        const isTouchUi =
          window.matchMedia("(max-width: 640px)").matches ||
          window.matchMedia("(hover: none) and (pointer: coarse)").matches;
        if (aiInput) {
          if (isTouchUi) aiInput.blur();
          else aiInput.focus();
        }
      } catch (_) {}
    }

    function closeAssistant() {
      aiPanel.classList.remove("is-open");
      if (aiBackdrop) aiBackdrop.classList.remove("is-open");
      document.body.classList.remove("assistant-open");
      setTimeout(() => {
        aiPanel.hidden = true;
        if (aiBackdrop) aiBackdrop.hidden = true;
        if (aiLastTrigger && typeof aiLastTrigger.focus === "function") aiLastTrigger.focus();
      }, 280);
    }

    function linkifyHtml(html) {
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      function walk(node) {
        if (node.nodeType === 3) {
          const text = node.nodeValue;
          const re = /\b((?:https?:\/\/|www\.)[^\s<]+)/gi;
          if (!re.test(text)) return;
          re.lastIndex = 0;
          const frag = document.createDocumentFragment();
          let last = 0;
          let match;
          while ((match = re.exec(text))) {
            if (match.index > last) {
              frag.appendChild(document.createTextNode(text.slice(last, match.index)));
            }
            let raw = match[1];
            const punct = raw.match(/[),.;:!?]+$/);
            let hrefSrc = raw;
            let extra = "";
            if (punct) {
              hrefSrc = raw.slice(0, -punct[0].length);
              extra = punct[0];
            }
            const a = document.createElement("a");
            a.href = /^https?:\/\//i.test(hrefSrc) ? hrefSrc : "https://" + hrefSrc;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = hrefSrc;
            frag.appendChild(a);
            if (extra) frag.appendChild(document.createTextNode(extra));
            last = match.index + raw.length;
          }
          if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
          node.parentNode.replaceChild(frag, node);
        } else if (node.nodeType === 1) {
          if (node.tagName === "A") {
            node.setAttribute("target", "_blank");
            node.setAttribute("rel", "noopener noreferrer");
            return;
          }
          Array.prototype.slice.call(node.childNodes).forEach(walk);
        }
      }
      Array.prototype.slice.call(wrap.childNodes).forEach(walk);
      return wrap.innerHTML;
    }

    function addMsg(role, html) {
      const el = document.createElement("div");
      el.className = `ai-msg ${role}`;
      el.innerHTML = `<div class="ai-bubble">${role === "bot" ? linkifyHtml(html) : html}</div>`;
      aiMessages.appendChild(el);
      aiMessages.scrollTop = aiMessages.scrollHeight;
    }

    function renderSuggestions() {
      if (!aiSuggestions) return;
      if (askedCount >= 2) {
        aiSuggestions.innerHTML = "";
        return;
      }
      aiSuggestions.innerHTML = getSuggestions()
        .filter((s) => !usedSuggestions.has(s))
        .map((s) => `<button type="button" class="ai-chip">${s}</button>`)
        .join("");
    }

    async function askAI(question) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
      try {
        const res = await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            ...getPayload(question),
            sessionId: window.MacroledSessionId,
          }),
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const item = Array.isArray(data) ? data[0] : data;
        if (item && item.resetSession) window.MacroledSessionId = newSessionId();
        const texto = item && (item.respuesta || item.output || item.answer);
        if (!texto) throw new Error("Respuesta vacía del agente");
        return String(texto).replace(/\n/g, "<br>");
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn("[asistente] error consultando IA:", err);
        return fallbackHtml();
      }
    }

    async function ask(question) {
      const q = question.trim();
      if (!q || aiBusy) return;
      aiBusy = true;
      if (getSuggestions().includes(q)) usedSuggestions.add(q);
      askedCount += 1;
      if (aiSuggestions) aiSuggestions.innerHTML = "";
      addMsg("user", q.replace(/</g, "&lt;"));
      aiTyping.classList.add("is-on");
      aiForm.querySelector(".ai-send").disabled = true;

      let respuesta = localAnswer ? localAnswer(q) : null;
      if (respuesta) {
        await new Promise((r) => setTimeout(r, 300 + Math.random() * 250));
      } else {
        respuesta = await askAI(q);
      }

      aiTyping.classList.remove("is-on");
      addMsg("bot", respuesta);
      renderSuggestions();
      aiForm.querySelector(".ai-send").disabled = false;
      aiBusy = false;
    }

    if (aiLaunch) aiLaunch.addEventListener("click", (e) => openAssistant(e.currentTarget));
    if (aiClose) aiClose.addEventListener("click", closeAssistant);
    if (aiBackdrop) aiBackdrop.addEventListener("click", closeAssistant);
    if (aiSuggestions) {
      aiSuggestions.addEventListener("click", (e) => {
        const chip = e.target.closest(".ai-chip");
        if (chip) ask(chip.textContent);
      });
    }
    aiForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = aiInput.value;
      aiInput.value = "";
      ask(q);
    });
    function getFocusableEls() {
      const selector =
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(aiPanel.querySelectorAll(selector)).filter(
        (el) => el.offsetParent !== null
      );
    }

    document.addEventListener("keydown", (e) => {
      if (!aiPanel.classList.contains("is-open")) return;
      if (e.key === "Escape") {
        closeAssistant();
        return;
      }
      if (e.key === "Tab") {
        const focusable = getFocusableEls();
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!aiPanel.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    addMsg("bot", greeting);
    renderSuggestions();
    window.MacroledAssistantOpen = openAssistant;
    return { openAssistant, closeAssistant, renderSuggestions, ask };
  }

  window.MacroledAssistant = { init };
})();

(function () {
  "use strict";
  if (!window.MacroledAssistant) return;

  function getComparePayload(question) {
    const productos = (typeof comparedProducts !== "undefined" ? comparedProducts : []).map((p) => ({
      sku: p.sku,
      nombre: p.name,
      specs: p.specs || {},
    }));
    return {
      pregunta: question,
      contexto: "comparar",
      productos,
      skus: productos.map((p) => p.sku).filter(Boolean),
      sessionId: window.MacroledSessionId,
    };
  }

  function compareFallbackHtml() {
    return `No pude encontrar información sobre esa consulta. Revisá la tabla de comparación o probá con otra pregunta.`;
  }

  try {
    window.MacroledAssistant.init({
      greeting: `Hola, soy el asistente de <b>productos Macroled</b>. Preguntame por un dato o diferencia concreta de los productos que estás comparando.`,
      getPayload: getComparePayload,
      fallbackHtml: compareFallbackHtml,
    });
  } catch (err) {
    console.error("[asistente-comparar] no se pudo inicializar:", err);
  }
})();
