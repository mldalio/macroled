(function () {
  "use strict";

  /* Salvavidas por si este mismo archivo queda incluido dos veces en la
     página (dos <script src> apuntando al mismo bundle). Esto NO soluciona
     el caso de tener el script VIEJO todavía pegado en otro lado — para eso
     hay que sacarlo a mano de Webflow (Page Settings / Embeds). */
  if (window.__mlFichaScriptLoaded) return;
  window.__mlFichaScriptLoaded = true;
  /* Descargas carga este archivo solo para generar PDFs. No hay que
     iniciar la ficha ni pisar el asistente de esa página. */
  const skipFichaBoot = window.__mlSkipFichaBoot === true;

  /* —— Gallery —— */
  let GALLERY = [];
  let activeIndex = 0;
  const thumbsEl = document.getElementById("thumbs");
  const stageWrap = document.getElementById("stageWrap");
  const stageEl = document.getElementById("stage");
  const stageImg = document.getElementById("stageImg");
  const stageVideo = document.getElementById("stageVideo");
  const stagePlay = document.getElementById("stagePlay");
  const zoomLens = document.getElementById("zoomLens");
  const zoomPane = document.getElementById("zoomPane");
  const openLightboxBtn = document.getElementById("openLightboxBtn");
  const mobileShareBtn = document.getElementById("mobileShareBtn");
  const canHoverZoom = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const THUMB_PLAY = `<span class="thumb-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>`;

  /* Portada de video por línea (fallback si no hay data-video-poster) */
  const LINE_VIDEO_POSTERS = {
    ECO: "eco_line-portada.png",
    POWER: "power_line-portada.png",
    PRO: "pro_line-portada.png",
    "PRO COMPACT": "pro_line-portada.png",
    UNI: "uni_line-portada.png",
  };
  const LINE_POSTER_BASE = "https://s3.coresagroup.com/MACROLED/WEB/luces-auto/";

  function normalizeLinea(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function posterFromLinea(linea) {
    const key = normalizeLinea(linea);
    if (!key) return "";
    const file = LINE_VIDEO_POSTERS[key] || LINE_VIDEO_POSTERS[key.replace(/_/g, " ")];
    return file ? LINE_POSTER_BASE + file : "";
  }

  function lineaFromVideoUrl(url) {
    const u = String(url || "");
    const file = (u.split("/").pop() || "").replace(/\.[a-z0-9]+$/i, "");
    const fromFile = normalizeLinea(file.replace(/[_-]+/g, " "));
    if (LINE_VIDEO_POSTERS[fromFile]) return fromFile;
    if (LINE_VIDEO_POSTERS[fromFile.split(" ")[0]]) return fromFile.split(" ")[0];
    const parts = u.split("/").map(normalizeLinea);
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      if (LINE_VIDEO_POSTERS[parts[i]]) return parts[i];
    }
    return "";
  }

  function resolveVideoPoster(el, videos, imageFallback) {
    const explicit = (el.getAttribute("data-video-poster") || "").trim();
    if (explicit) return explicit;
    const fromLine = posterFromLinea(
      el.getAttribute("data-linea") || el.getAttribute("data-line") || ""
    );
    if (fromLine) return fromLine;
    for (const v of videos || []) {
      const inferred = posterFromLinea(lineaFromVideoUrl(v));
      if (inferred) return inferred;
    }
    return (imageFallback || "").trim();
  }

  const FANCY_OPTS = {
    Images: { zoom: true, wheel: "zoom" },
    Toolbar: {
      display: {
        left: ["infobar"],
        middle: [],
        right: ["zoomIn", "zoomOut", "slideshow", "thumbs", "close"],
      },
    },
  };

  function youtubeId(url) {
    const m = String(url || "").match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i
    );
    return m ? m[1] : null;
  }

  function detectMediaType(url) {
    const u = String(url || "").trim();
    if (!u) return "image";
    if (youtubeId(u) || /youtube\.com|youtu\.be/i.test(u)) return "youtube";
    if (/vimeo\.com/i.test(u)) return "vimeo";
    if (/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(u)) return "html5video";
    return "image";
  }

  function isVideoType(type) {
    return type === "html5video" || type === "youtube" || type === "vimeo";
  }

  function mediaThumb(url, type, poster) {
    if (type === "youtube") {
      const id = youtubeId(url);
      if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    if (isVideoType(type)) return poster || "";
    return url;
  }

  function urlsToGallery(urls, altBase, poster) {
    const seen = new Set();
    let imageCount = 0;
    let videoCount = 0;
    return (urls || [])
      .map((u) => String(u || "").trim())
      .filter((u) => {
        if (!u || u.length < 5) return false;
        const type = detectMediaType(u);
        if (type === "image" && /\/(250|1000)\//.test(u)) return false;
        if (seen.has(u)) return false;
        seen.add(u);
        return true;
      })
      .map((url) => {
        const type = detectMediaType(url);
        const isVideo = isVideoType(type);
        if (isVideo) videoCount += 1;
        else imageCount += 1;
        const n = isVideo ? videoCount : imageCount;
        const label = isVideo ? `video ${n}` : `vista ${n}`;
        const thumb = mediaThumb(url, type, poster);
        return {
          type,
          alt: altBase ? `${altBase} — ${label}` : label,
          thumb,
          display: url,
          full: url,
          poster: poster || (type === "youtube" ? thumb : "") || "",
        };
      });
  }

  function stopStageVideo() {
    if (!stageVideo) return;
    try {
      stageVideo.pause();
      stageVideo.removeAttribute("src");
      stageVideo.load();
    } catch (_) {}
    stageVideo.hidden = true;
  }

  function renderThumbs() {
    if (!thumbsEl) return;
    thumbsEl.hidden = GALLERY.length <= 1;
    thumbsEl.innerHTML = GALLERY.map((g, i) => {
      const videoClass = isVideoType(g.type) ? " is-video" : "";
      const activeClass = i === activeIndex ? " is-active" : "";
      const img = g.thumb
        ? `<img src="${g.thumb}" alt="" loading="lazy">`
        : `<span class="thumb-fallback" aria-hidden="true"></span>`;
      return `<button type="button" class="thumb${activeClass}${videoClass}" role="option" data-index="${i}" aria-label="${g.alt}" aria-selected="${i === activeIndex}">
        ${img}${isVideoType(g.type) ? THUMB_PLAY : ""}
      </button>`;
    }).join("");
  }

  /**
   * La columna de miniaturas no pasa de alto de la foto principal.
   * Si hay más de las que entran, se desplaza dentro de esa columna.
   */
  function syncThumbsHeight() {
    if (!thumbsEl || !stageEl) return;
    const height = stageEl.offsetHeight;
    thumbsEl.style.maxHeight = height ? height + "px" : "";
  }

  if (stageEl && thumbsEl) {
    if ("ResizeObserver" in window) {
      new ResizeObserver(syncThumbsHeight).observe(stageEl);
    } else {
      window.addEventListener("resize", syncThumbsHeight);
    }
    window.addEventListener("load", syncThumbsHeight);
  }

  function syncZoomBg() {
    const g = GALLERY[activeIndex];
    if (!g || !zoomPane || isVideoType(g.type)) {
      if (zoomPane) zoomPane.style.backgroundImage = "";
      return;
    }
    zoomPane.style.backgroundImage = `url("${g.full}")`;
  }

  function setActive(i) {
    if (!GALLERY.length || !stageImg) return;
    activeIndex = (i + GALLERY.length) % GALLERY.length;
    const g = GALLERY[activeIndex];
    const video = isVideoType(g.type);
    stopZoom();
    stopStageVideo();

    stageEl.classList.toggle("is-video", video);
    if (openLightboxBtn) {
      openLightboxBtn.setAttribute("aria-label", video ? "Ampliar video" : "Ampliar imagen");
    }

    if (g.type === "html5video" && stageVideo) {
      stageImg.hidden = true;
      stageVideo.hidden = false;
      if (stagePlay) stagePlay.hidden = true;
      stageVideo.poster = g.poster || g.thumb || "";
      stageVideo.src = g.display;
      stageVideo.load();
    } else {
      if (stageVideo) stageVideo.hidden = true;
      stageImg.hidden = false;
      stageImg.src = video ? g.thumb || g.poster || g.display : g.display;
      stageImg.alt = g.alt;
      if (stagePlay) stagePlay.hidden = !(video && (g.type === "youtube" || g.type === "vimeo"));
    }

    syncZoomBg();
    renderThumbs();
  }

  function setGallery(urls, altBase, opts) {
    opts = opts || {};
    GALLERY = urlsToGallery(urls, altBase, opts.poster || "");
    if (!GALLERY.length) {
      const fallback = document.querySelector(".cms-product-item")?.getAttribute("data-image");
      if (fallback) GALLERY = urlsToGallery([fallback], altBase, opts.poster || "");
    }
    activeIndex = 0;
    setActive(0);
    const aiImg = document.getElementById("aiProductImg");
    if (aiImg && GALLERY[0]) aiImg.src = GALLERY[0].thumb || GALLERY[0].display;
  }

  function fancyItem(g) {
    if (g.type === "html5video") {
      return {
        src: g.full,
        type: "html5video",
        caption: g.alt,
        preload: false,
        thumb: g.thumb || g.poster || undefined,
        poster: g.poster || g.thumb || undefined,
      };
    }
    if (g.type === "youtube") {
      return { src: g.full, type: "youtube", caption: g.alt, thumb: g.thumb || undefined };
    }
    if (g.type === "vimeo") {
      return { src: g.full, type: "vimeo", caption: g.alt, thumb: g.thumb || undefined };
    }
    /* Sin type forzado: Fancybox detecta la imagen por la URL */
    return { src: g.full, caption: g.alt };
  }

  function openFancy(index) {
    if (!GALLERY.length || typeof Fancybox === "undefined") return;
    const startIndex = Math.max(0, Math.min(index || 0, GALLERY.length - 1));
    try {
      Fancybox.show(GALLERY.map(fancyItem), { ...FANCY_OPTS, startIndex });
    } catch (err) {
      console.warn("[lightbox]", err);
      try {
        Fancybox.show(
          GALLERY.filter((g) => !isVideoType(g.type)).map((g) => ({ src: g.full, caption: g.alt })),
          { ...FANCY_OPTS, startIndex: 0 }
        );
      } catch (err2) {
        console.warn("[lightbox:fallback]", err2);
      }
    }
  }

  function stopZoom() {
    stageWrap.classList.remove("is-zooming");
  }

  function activeIsImage() {
    return GALLERY[activeIndex] && !isVideoType(GALLERY[activeIndex].type);
  }

  function updateZoom(e) {
    if (!canHoverZoom || !activeIsImage()) return;
    const rect = stageEl.getBoundingClientRect();
    const viewportMargin = 24;
    const spaceRight = window.innerWidth - rect.right - 14 - viewportMargin;
    const preferredPane = Math.min(440, window.innerWidth * 0.46);
    const fitsBeside = spaceRight >= 260;

    zoomPane.classList.toggle("is-below", !fitsBeside);

    let paneW, paneH;
    if (fitsBeside) {
      paneW = Math.max(260, Math.min(preferredPane, spaceRight));
      zoomPane.style.width = `${paneW}px`;
      zoomPane.style.removeProperty("top");
      paneH = zoomPane.offsetHeight || paneW;
    } else {
      zoomPane.style.width = "";
      paneW = zoomPane.offsetWidth || rect.width;
      paneH = zoomPane.offsetHeight || paneW * 0.625;
    }

    const zoomFactor = 2.35;
    const lensW = Math.min(rect.width * 0.55, Math.max(100, paneW / zoomFactor));
    const lensH = Math.min(rect.height * 0.55, Math.max(100, paneH / zoomFactor));
    zoomLens.style.width = `${lensW}px`;
    zoomLens.style.height = `${lensH}px`;

    let x = e.clientX - rect.left - lensW / 2;
    let y = e.clientY - rect.top - lensH / 2;
    x = Math.max(0, Math.min(x, rect.width - lensW));
    y = Math.max(0, Math.min(y, rect.height - lensH));
    zoomLens.style.left = `${x}px`;
    zoomLens.style.top = `${y}px`;

    const bgW = (rect.width / lensW) * paneW;
    const bgH = (rect.height / lensH) * paneH;
    zoomPane.style.backgroundSize = `${bgW}px ${bgH}px`;
    zoomPane.style.backgroundPosition = `${-(x * (bgW / rect.width))}px ${-(y * (bgH / rect.height))}px`;
  }

  if (thumbsEl) {
    thumbsEl.addEventListener("mouseover", (e) => {
      const btn = e.target.closest(".thumb");
      if (!btn || !canHoverZoom) return;
      const i = Number(btn.dataset.index);
      if (i !== activeIndex) setActive(i);
    });
    thumbsEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".thumb");
      if (!btn) return;
      setActive(Number(btn.dataset.index));
    });
  }

  if (canHoverZoom && stageEl) {
    stageEl.addEventListener("mouseenter", (e) => {
      if (e.target.closest(".zoom-btn")) return;
      if (!activeIsImage()) return;
      syncZoomBg();
      stageWrap.classList.add("is-zooming");
      updateZoom(e);
    });
    stageEl.addEventListener("mousemove", (e) => {
      if (!stageWrap.classList.contains("is-zooming")) return;
      if (!activeIsImage() || e.target.closest(".zoom-btn")) {
        stopZoom();
        return;
      }
      updateZoom(e);
    });
    stageEl.addEventListener("mouseleave", stopZoom);
  }

  function onOpenGallery(e) {
    e.preventDefault();
    e.stopPropagation();
    stopZoom();
    openFancy(activeIndex);
  }

  /* Swipe horizontal sobre la imagen principal (mobile/touch): cambia de
     foto sin abrir el visor. Un tap simple (sin arrastre) sigue abriendo
     el visor vía el click handler de más abajo. La imagen sigue al dedo
     mientras se arrastra, para que se note que "hay más fotos" del lado
     al que se está deslizando. */
  const STAGE_SWIPE_THRESHOLD = 40;
  const STAGE_SLIDE_MS = 150;
  let stageSwipeStartX = 0;
  let stageSwipeDx = 0;
  let stageSwipeDragging = false;
  let stageSwipeSettling = false;
  let stageJustSwiped = false;

  function setStageDrag(px, animate) {
    stageImg.style.transition = animate
      ? `transform ${STAGE_SLIDE_MS}ms cubic-bezier(.22,.8,.32,1)`
      : "none";
    stageImg.style.transform = px ? `translateX(${px}px)` : "";
  }

  if (stageEl) stageEl.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch" || e.target.closest(".zoom-btn") || stageSwipeSettling) return;
    stageSwipeStartX = e.clientX;
    stageSwipeDx = 0;
    stageSwipeDragging = false;
  });
  if (stageEl) stageEl.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "touch" || GALLERY.length < 2 || stageSwipeSettling) return;
    stageSwipeDx = e.clientX - stageSwipeStartX;
    if (!stageSwipeDragging && Math.abs(stageSwipeDx) > 10) stageSwipeDragging = true;
    if (stageSwipeDragging) setStageDrag(stageSwipeDx, false);
  });
  function finishStageSwipe(e) {
    if (e.pointerType !== "touch" || !stageSwipeDragging) return;
    stageSwipeDragging = false;
    const stageWidth = stageEl.clientWidth || 1;
    if (Math.abs(stageSwipeDx) >= STAGE_SWIPE_THRESHOLD && GALLERY.length > 1) {
      stageJustSwiped = true;
      stageSwipeSettling = true;
      const dir = stageSwipeDx < 0 ? 1 : -1; // swipe a la izquierda -> foto siguiente
      setStageDrag(-dir * stageWidth, true);
      window.setTimeout(() => {
        setActive(activeIndex + dir);
        setStageDrag(dir * stageWidth, false);
        void stageImg.offsetWidth; // fuerza reflow antes de animar la entrada
        setStageDrag(0, true);
        window.setTimeout(() => {
          stageSwipeSettling = false;
        }, STAGE_SLIDE_MS);
      }, STAGE_SLIDE_MS);
    } else {
      setStageDrag(0, true);
    }
  }
  if (stageEl) stageEl.addEventListener("pointerup", finishStageSwipe);
  if (stageEl) stageEl.addEventListener("pointercancel", () => {
    if (stageSwipeDragging) setStageDrag(0, true);
    stageSwipeDragging = false;
  });

  if (stageEl) stageEl.addEventListener("click", (e) => {
    if (stageJustSwiped) {
      stageJustSwiped = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.target.closest(".zoom-btn")) return;
    // Controles nativos del video visible: no abrir lightbox
    if (e.target.closest("video") && stageVideo && !stageVideo.hidden) return;
    onOpenGallery(e);
  });
  if (openLightboxBtn) {
    openLightboxBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onOpenGallery(e);
    });
  }

  if (mobileShareBtn) {
    mobileShareBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.__mlToggleShareFromStage === "function") {
        window.__mlToggleShareFromStage(mobileShareBtn);
      }
    });
  }

  window.MacroledFicha = { setGallery, setActive, getGallery: () => GALLERY };

  /* —— Tabs —— */
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      // Genérico: cualquier .tab-panel cuyo id sea "panel-<data-tab>" se sincroniza.
      // Así los tabs nuevos (armados/despiece, etc.) no requieren tocar este archivo.
      document.querySelectorAll(".tab-panel[id^='panel-']").forEach((panel) => {
        const key = panel.id.slice("panel-".length);
        const on = key === tab.dataset.tab;
        panel.classList.toggle("is-active", on);
        panel.hidden = !on;
      });
      requestAnimationFrame(syncAccordionHeights);
    });
  });

  /* —— Spec schema + tooltips + hide empty —— */
  const ICON_BOLT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>';
  const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const ICON_BOX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/></svg>';
  const ICON_WIFI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5a9.5 9.5 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1.2" fill="currentColor" stroke="none"/></svg>';
  const ICON_REMOTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 18h6"/></svg>';

  const SPEC_GROUPS = [
    {
      title: "Características eléctricas",
      icon: ICON_BOLT,
      rows: [
        { key: "Tensión", tip: "Voltaje de alimentación del producto (AC o DC)." },
        { key: "Tensión nominal", tip: "Voltaje nominal de trabajo del producto (por ejemplo 12 V)." },
        { key: "Rango de tensión", tip: "Rango de voltaje de entrada aceptado por el producto (mínimo / máximo)." },
        { key: "Entrada", tip: "Datos de alimentación de entrada: tensión, frecuencia y corriente." },
        { key: "Tipo de energía", tip: "Fuente de energía con la que opera (red, batería, USB, etc.)." },
        { key: "Frecuencia", tip: "Frecuencia de la red eléctrica, en hertz (Hz)." },
        { key: "Corriente", tip: "Corriente eléctrica que consume o entrega el producto." },
        { key: "Corriente entrada", tip: "Corriente de entrada nominal del equipo." },
        { key: "Corriente de entrada Iin (A)", tip: "Corriente de entrada (Iin) que consume el producto, en amperios (A)." },
        { key: "Corriente de salida Iout (A)", tip: "Corriente de salida (Iout) entregada a la lámpara, en amperios (A)." },
        { key: "Potencia", tip: "Consumo eléctrico, en vatios (W)." },
        { key: "Potencia nominal por lámpara", tip: "Potencia nominal declarada por cada lámpara, en vatios (W)." },
        { key: "Potencia de entrada por lámpara", tip: "Potencia de entrada consumida por cada lámpara (puede variar entre altas y bajas)." },
        { key: "Potencia estable por lámpara", tip: "Potencia de trabajo estable por lámpara en régimen continuo (altas / bajas)." },
        { key: "Driver", tip: "Tipo de driver o fuente que alimenta el LED (integrado, externo, etc.)." },
        { key: "Tipo de driver", tip: "Tipo de fuente/driver que alimenta el LED." },
        { key: "CANBUS", tip: "Compatibilidad con sistema CANBUS del vehículo (evita errores de lámpara fundida)." },
        { key: "Compatible con sensor", tip: "Indica si admite sensores externos (movimiento, luz, etc.)." },
        { key: "Sensor incluido", tip: "Si el producto trae sensor de fábrica." },
        { key: "Factor de Potencia (FP)", tip: "Qué tan eficiente es el uso de la energía. Más cerca de 1 es mejor." },
        { key: "THD", tip: "Distorsión armónica de la corriente. Cuanto más bajo, mejor calidad eléctrica." },
        { key: "Dimerizable", tip: "Si permite regular la intensidad de la luz." },
        { key: "Canales", tip: "Cantidad de canales de control o salida." },
        { key: "Indicador luminoso", tip: "Señalización LED de estado en el equipo." },
        { key: "Tomacorriente", tip: "Si incluye toma de corriente integrada." },
        { key: "Conector USB", tip: "Puerto USB disponible (carga o datos)." },
        { key: "Capacitor", tip: "Capacidad del capacitor integrado, cuando aplica." },
        { key: "EMC", tip: "Cumplimiento de compatibilidad electromagnética." },
        { key: "SDCM", tip: "Uniformidad de color entre unidades. Más bajo es más consistente." },
        { key: "Anti-High-Volt", tip: "Protección contra picos de tensión en la red eléctrica." },
        { key: "ON-OFF Switch", tip: "Interruptor de encendido/apagado o ciclos On-Off soportados." },
        { key: "Protector SPD", tip: "Protección contra sobretensiones (Surge Protection Device)." },
        { key: "SPD", tip: "Protección contra sobretensiones (Surge Protection Device)." },
        { key: "No Flicker - sin parpadeo", tip: "Diseño sin parpadeo perceptible (flicker-free)." },
        { key: "Corriente de Irrupción (Inrush)", tip: "Pico de corriente al encender el equipo." },
        { key: "Tiempo de irrupción Th50", tip: "Duración del pico de irrupción hasta el 50%." },
        { key: "Clase de protección", tip: "Clase de aislamiento eléctrico (I, II, III)." },
        { key: "Clase eléctrica", tip: "Clase de aislamiento eléctrico del producto (I, II o III)." },
        { key: "Max. n° de lum. freno de circuito B16 A", tip: "Máximo de luminarias por breaker tipo B 16 A." },
        { key: "Max. n° de lum. freno de circuito C10 A", tip: "Máximo de luminarias por breaker tipo C 10 A." },
        { key: "Max. n° de lum. freno de circuito C16 A", tip: "Máximo de luminarias por breaker tipo C 16 A." },
        { key: "Tipo de carga", tip: "Método de carga de la batería (USB-C, magnética, etc.)." },
        { key: "Tiempo de carga", tip: "Tiempo aproximado para cargar la batería al completo." },
        { key: "Autonomía", tip: "Tiempo de uso con batería, según intensidad." },
        { key: "Temperatura de trabajo", tip: "Rango de temperatura ambiente de operación del producto." },
      ],
    },
    {
      title: "Características lumínicas",
      icon: ICON_SUN,
      rows: [
        { key: "Lúmenes/W", tip: "Eficiencia lumínica: lúmenes por cada vatio consumido." },
        { key: "Flujo luminoso", tip: "Cantidad total de luz emitida, en lúmenes (lm)." },
        { key: "Flujo luminoso nominal total", tip: "Flujo luminoso nominal total del producto, en lúmenes (lm)." },
        { key: "Flujo luminoso inicial total", tip: "Flujo luminoso al encender (inicial), total del sistema. Puede variar entre altas y bajas." },
        { key: "Flujo luminoso estable total", tip: "Flujo luminoso en régimen estable, total del sistema, en lúmenes (lm)." },
        { key: "Temperatura del color", tip: "Tono de la luz en Kelvin: más bajo es más cálida, más alto es más fría." },
        { key: "Tipo de luz", tip: "Clasificación del tono (cálido, neutro, frío) o modo de luz." },
        { key: "Tipo de blanco", tip: "Tipo de blanco de la luz (cálido, neutro o frío)." },
        { key: "Ángulo de apertura", tip: "Ángulo en el que se distribuye la luz." },
        { key: "CRI", tip: "Fidelidad de color bajo esta luz, en una escala de 0 a 100." },
        { key: "Tipo de LED", tip: "Tecnología o encapsulado del LED utilizado." },
        { key: "Tipo de chip LED", tip: "Modelo o referencia del chip LED utilizado en el producto." },
        { key: "Tiempo de arranque", tip: "Tiempo hasta alcanzar el flujo luminoso nominal." },
        { key: "Vida útil", tip: "Vida estimada del LED en horas de uso." },
        { key: "UGR", tip: "Nivel de deslumbramiento molesto que puede causar la luminaria." },
        { key: "LM80", tip: "Ensayo que certifica cuánto se deprecia la luz del LED con el tiempo." },
        { key: "Desviación estándar de igualación de colores", tip: "Consistencia de color entre unidades (relacionado con SDCM)." },
        { key: "Desviación estándar", tip: "Consistencia de color entre unidades (relacionado con SDCM)." },
        { key: "Grupo de seguridad fotobiológica acc. EN62778", tip: "Clasificación de riesgo fotobiológico según normativa EN62778." },
        { key: "EN62778", tip: "Cumplimiento de seguridad fotobiológica según norma EN62778." },
      ],
    },
    {
      title: "Características materiales",
      icon: ICON_BOX,
      rows: [
        { key: "Dimensiones", tip: "Medidas exteriores del producto." },
        { key: "Tamaño", tip: "Dimensiones o formato general del producto." },
        { key: "Peso", tip: "Peso neto del producto." },
        { key: "Material del cuerpo", tip: "Material principal de la carcasa o estructura." },
        { key: "Material de tapa", tip: "Material de la tapa o cubierta." },
        { key: "Material del lente", tip: "Material del difusor u óptica." },
        { key: "Conector", tip: "Tipo de conector eléctrico o de instalación." },
        { key: "Conexión", tip: "Tipo de conexión del accesorio o luminaria." },
        { key: "Compatibilidad", tip: "Líneas o productos con los que es compatible." },
        { key: "Color del cuerpo", tip: "Color de la carcasa / cuerpo del producto." },
        { key: "Color de carcasa", tip: "Color exterior de la carcasa." },
        { key: "Panel táctil", tip: "Indica si el producto incluye panel táctil de control." },
        { key: "Largo del cable", tip: "Longitud del cable incluido." },
        { key: "Dimensiones del cable", tip: "Sección o medidas del cable incluido." },
        { key: "Tipo de cable", tip: "Tipo o especificación del cable incluido." },
        { key: "Largo del rollo", tip: "Longitud total del rollo de tira." },
        { key: "Distancia corte", tip: "Distancia entre puntos de corte de la tira." },
        { key: "Cantidad de luces", tip: "Cantidad de LEDs o puntos de luz." },
        { key: "Tipo de montaje", tip: "Forma de instalación (sobreponer, empotrar, pie, etc.)." },
        { key: "Tipo de instalación", tip: "Forma de instalación o montaje del producto." },
        { key: "Temperatura de operación", tip: "Rango de temperatura ambiente de uso." },
        { key: "Protección IP", tip: "Grado de protección contra polvo y agua." },
        { key: "Protección IK", tip: "Grado de protección contra impactos mecánicos." },
        { key: "Protección", tip: "Grados de protección del producto (IP / IK)." },
        { key: "Protección estanca", tip: "Nivel de estanqueidad / sellado frente a polvo y agua." },
        { key: "RPM del cooler", tip: "Velocidad de giro del ventilador de refrigeración, en revoluciones por minuto." },
        { key: "Cooler outer diameter", tip: "Diámetro exterior del cooler / ventilador." },
        { key: "Filamentos de cobre", tip: "Cantidad de filamentos o heatpipes de cobre del disipador." },
      ],
    },
    {
      title: "Características de conectividad",
      icon: ICON_WIFI,
      rows: [
        { key: "Modo de conectividad", tip: "Protocolo o medio de conexión (Wi‑Fi, RF, Bluetooth, etc.)." },
        { key: "Conectividad", tip: "Tipo de conectividad del producto." },
        { key: "Frecuencia de operación", tip: "Frecuencia de radio o red en la que opera." },
        { key: "Chip", tip: "Chipset de conectividad integrado." },
        { key: "Tipo de red", tip: "Tipo de red compatible (2.4 GHz, Zigbee, etc.)." },
        { key: "Sistemas operativos soportados", tip: "SO móviles o de escritorio compatibles con la app." },
        { key: "Distancia de alcance RF en exterior", tip: "Alcance de radiofrecuencia en exteriores." },
        { key: "Distancia de alcance RF en interior", tip: "Alcance de radiofrecuencia en interiores." },
        { key: "Compatible con asistentes", tip: "Asistentes de voz o ecosistemas compatibles." },
        { key: "Funciones", tip: "Funciones inteligentes o de control disponibles." },
        { key: "APP", tip: "Aplicación móvil asociada al producto." },
        { key: "Conductores", tip: "Cantidad o tipo de conductores del cable." },
      ],
    },
    {
      title: "Características eléctricas de la controladora",
      icon: ICON_BOLT,
      rows: [
        { key: "Tensión controladora", tip: "Tensión de alimentación de la controladora." },
        { key: "Potencia controladora", tip: "Potencia máxima de la controladora." },
        { key: "Corriente por canal", tip: "Corriente máxima entregada por cada canal." },
      ],
    },
    {
      title: "Características del control remoto",
      icon: ICON_REMOTE,
      rows: [
        { key: "Alimentación remoto", tip: "Tipo de batería o alimentación del control remoto." },
        { key: "Dimensiones remoto", tip: "Medidas del control remoto." },
        { key: "Cantidad de botones", tip: "Número de botones del control remoto." },
        { key: "Alcance", tip: "Distancia máxima de operación del control remoto." },
      ],
    },
    {
      title: "Características de la controladora",
      icon: ICON_BOX,
      rows: [
        { key: "Dimensiones controladora", tip: "Medidas de la controladora." },
        { key: "Material del cuerpo controladora", tip: "Material de la carcasa de la controladora." },
        { key: "Conector controladora", tip: "Tipo de conector de la controladora." },
        { key: "Color de carcasa controladora", tip: "Color exterior de la controladora." },
        { key: "Largo del cable controladora", tip: "Longitud del cable de la controladora." },
        { key: "Garantía controladora", tip: "Garantía específica de la controladora." },
        { key: "Temperatura de operación controladora", tip: "Rango térmico de uso de la controladora." },
        { key: "Protección IP controladora", tip: "Grado IP de la controladora." },
      ],
    },
  ];

  /* Aliases CMS / labels → key canónica del schema */
  const SPEC_KEY_ALIASES = {
    Tension: "Tensión",
    Tensión: "Tensión",
    "Tension nominal": "Tensión nominal",
    "Tensión nominal": "Tensión nominal",
    "TENSION NOMINAL": "Tensión nominal",
    "Rango de tension": "Rango de tensión",
    "Rango de tensión": "Rango de tensión",
    "RANGO DE TENSION": "Rango de tensión",
    "RANGO DE TENSIÓN": "Rango de tensión",
    "Potencia nominal por lampara": "Potencia nominal por lámpara",
    "Potencia nominal por lámpara": "Potencia nominal por lámpara",
    "POTENCIA NOMINAL POR LAMPARA": "Potencia nominal por lámpara",
    "POTENCIA NOMINAL POR LÁMPARA": "Potencia nominal por lámpara",
    "Potencia de entrada por lampara": "Potencia de entrada por lámpara",
    "Potencia de entrada por lámpara": "Potencia de entrada por lámpara",
    "POTENCIA DE ENTRADA POR LAMPARA": "Potencia de entrada por lámpara",
    "POTENCIA DE ENTRADA POR LÁMPARA": "Potencia de entrada por lámpara",
    "Potencia estable por lampara": "Potencia estable por lámpara",
    "Potencia estable por lámpara": "Potencia estable por lámpara",
    "POTENCIA ESTABLE POR LAMPARA": "Potencia estable por lámpara",
    "POTENCIA ESTABLE POR LÁMPARA": "Potencia estable por lámpara",
    "Corriente de entrada lin (A)": "Corriente de entrada Iin (A)",
    "Corriente de entrada Iin (A)": "Corriente de entrada Iin (A)",
    "Corriente de entrada Lin (A)": "Corriente de entrada Iin (A)",
    "CORRIENTE DE ENTRADA IIN (A)": "Corriente de entrada Iin (A)",
    "CORRIENTE DE ENTRADA LIN (A)": "Corriente de entrada Iin (A)",
    "Corriente de salida lout (A)": "Corriente de salida Iout (A)",
    "Corriente de salida Iout (A)": "Corriente de salida Iout (A)",
    "Corriente de salida Lout (A)": "Corriente de salida Iout (A)",
    "CORRIENTE DE SALIDA IOUT (A)": "Corriente de salida Iout (A)",
    "CORRIENTE DE SALIDA LOUT (A)": "Corriente de salida Iout (A)",
    "Tipo de chip LED": "Tipo de chip LED",
    "TIPO DE CHIP LED": "Tipo de chip LED",
    "Tipo de Chip LED": "Tipo de chip LED",
    "Flujo luminoso nominal total": "Flujo luminoso nominal total",
    "FLUJO LUMINOSO NOMINAL TOTAL": "Flujo luminoso nominal total",
    "Flujo luminoso inicial total": "Flujo luminoso inicial total",
    "FLUJO LUMINOSO INICIAL TOTAL": "Flujo luminoso inicial total",
    "Flujo luminoso estable total": "Flujo luminoso estable total",
    "FLUJO LUMINOSO ESTABLE TOTAL": "Flujo luminoso estable total",
    "Tipo de Energia": "Tipo de energía",
    "Tipo de Energía": "Tipo de energía",
    Dimeable: "Dimerizable",
    Dimerizable: "Dimerizable",
    "Lumenes Lm/w": "Lúmenes/W",
    "Lúmenes Lm/w": "Lúmenes/W",
    "Lm/W": "Lúmenes/W",
    "Flujo Luminoso": "Flujo luminoso",
    "Temperatura de color": "Temperatura del color",
    "Temperatura Color": "Temperatura del color",
    "Angulo de Apertura": "Ángulo de apertura",
    "Ángulo de Apertura": "Ángulo de apertura",
    "tipo de led": "Tipo de LED",
    "Tipo de led": "Tipo de LED",
    "Vida util": "Vida útil",
    "Certificado LM80": "LM80",
    LM80: "LM80",
    "Color de carcasa": "Color de carcasa",
    "Color del cuerpo": "Color del cuerpo",
    COLOR: "Color del cuerpo",
    Color: "Color del cuerpo",
    Material: "Material del cuerpo",
    "Material cuerpo": "Material del cuerpo",
    "MATERIAL CUERPO": "Material del cuerpo",
    Tamaño: "Tamaño",
    Dimensiones: "Dimensiones",
    DIMENSIONES: "Dimensiones",
    "Proteccion IP": "Protección IP",
    "Protección IP": "Protección IP",
    IP: "Protección IP",
    IK: "Protección IK",
    "Proteccion IK": "Protección IK",
    "Protección IK": "Protección IK",
    Garantia: "Garantía",
    Garantía: "Garantía",
    "GARANTIA TIEMPO": "Garantía",
    "Garantia tiempo": "Garantía",
    "Garantía tiempo": "Garantía",
    "Garantia Macroled": "Garantía Macroled",
    "Garantia de fabrica": "Garantía de fábrica",
    "Garantía de fabrica": "Garantía de fábrica",
    "Temperatura de operacion": "Temperatura de operación",
    "TEMPERATURA DE OPERACION": "Temperatura de operación",
    "TEMPERATURA COLOR": "Temperatura del color",
    "FLUJO LUMINOSO": "Flujo luminoso",
    "ANGULO DE APERTURA": "Ángulo de apertura",
    "LUMENES/W": "Lúmenes/W",
    FRECUENCIA: "Frecuencia",
    Frecuencia: "Frecuencia",
    AUTONOMÍA: "Autonomía",
    Autonomia: "Autonomía",
    CLASE: "Clase de protección",
    Clase: "Clase de protección",
    Cri: "CRI",
    CRI: "CRI",
    "PANEL TACTIL": "Panel táctil",
    "Panel tactil": "Panel táctil",
    "Panel táctil": "Panel táctil",
    "Control remoto": "Control remoto",
    "CONTROL REMOTO": "Control remoto",
    FUNCIONES: "Funciones",
    POTENCIA: "Potencia",
    TENSIÓN: "Tensión",
    "TIPO DE CARGA": "Tipo de carga",
    "Tipo de carga": "Tipo de carga",
    "TIEMPO DE CARGA": "Tiempo de carga",
    "Tiempo de carga": "Tiempo de carga",
    "TIPO DE LED": "Tipo de LED",
    "TIPO DE LUZ": "Tipo de luz",
    DIMERIZABLE: "Dimerizable",
    Smart: "Smart",
    Sdcm: "SDCM",
    SDCM: "SDCM",
    "Frecuencia de Operacion": "Frecuencia de operación",
    "Clase de proteccion": "Clase de protección",
    "Factor de Potencia (FP)": "Factor de Potencia (FP)",
    "Factor de potencia": "Factor de Potencia (FP)",
    "Anti high volt": "Anti-High-Volt",
    "Anti High Volt": "Anti-High-Volt",
    "Anti-high-volt": "Anti-High-Volt",
    "On-Off": "ON-OFF Switch",
    "On/Off Switch": "ON-OFF Switch",
    "ON / OFF switch": "ON-OFF Switch",
    Entrada: "Entrada",
    ENTRADA: "Entrada",
    Driver: "Driver",
    DRIVER: "Driver",
    CANBUS: "CANBUS",
    Canbus: "CANBUS",
    "Clase electrica": "Clase eléctrica",
    "Clase eléctrica": "Clase eléctrica",
    "Clase Eléctrica": "Clase eléctrica",
    "CLASE ELECTRICA": "Clase eléctrica",
    "Temperatura de Trabajo": "Temperatura de trabajo",
    "Temperatura de trabajo": "Temperatura de trabajo",
    "TEMPERATURA DE TRABAJO": "Temperatura de trabajo",
    SPD: "SPD",
    "Protector SPD": "Protector SPD",
    "Corriente Irrupción": "Corriente de Irrupción (Inrush)",
    "Corriente de irrupción": "Corriente de Irrupción (Inrush)",
    "Corriente de Irrupción": "Corriente de Irrupción (Inrush)",
    "Tipo de Blanco": "Tipo de blanco",
    "Tipo de blanco": "Tipo de blanco",
    "TIPO DE BLANCO": "Tipo de blanco",
    EN62778: "EN62778",
    "Desviacion estandar": "Desviación estándar",
    "Desviación estándar": "Desviación estándar",
    "Desviación Estándar": "Desviación estándar",
    "Color cuerpo": "Color del cuerpo",
    "Material del Lente": "Material del lente",
    "Material del lente": "Material del lente",
    "Tipo de instalacion": "Tipo de instalación",
    "Tipo de instalación": "Tipo de instalación",
    "TIPO DE INSTALACION": "Tipo de instalación",
    "Tipo de montaje": "Tipo de montaje",
    Proteccion: "Protección",
    Protección: "Protección",
    "Proteccion estanca": "Protección estanca",
    "Protección estanca": "Protección estanca",
    "PROTECCION ESTANCA": "Protección estanca",
    "Tipo de cable": "Tipo de cable",
    "TIPO DE CABLE": "Tipo de cable",
    "RPM del cooler": "RPM del cooler",
    "RPM DEL COOLER": "RPM del cooler",
    "Cooler outer diameter": "Cooler outer diameter",
    "Filamentos de cobre": "Filamentos de cobre",
    "FILAMENTOS DE COBRE": "Filamentos de cobre",
    UGR: "UGR",
    EMC: "EMC",
    THD: "THD",
    "Eficiencia (lm/W)": "Lúmenes/W",
    "Eficiencia (lm/w)": "Lúmenes/W",
    "Material Lente": "Material del lente",
    "Material lente": "Material del lente",
    "Material del Lente": "Material del lente",
  };

  const SPEC_ALIAS_NORM = Object.create(null);
  Object.keys(SPEC_KEY_ALIASES).forEach((alias) => {
    const folded = alias
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (!SPEC_ALIAS_NORM[folded]) SPEC_ALIAS_NORM[folded] = SPEC_KEY_ALIASES[alias];
  });

  /**
   * Atributos sueltos del CMS Webflow → key canónica.
   * En Designer: Custom Attribute name = "data-flujo-luminoso", value = campo CMS.
   * Si el valor viene vacío, no se muestra la fila.
   */
  const CMS_SPEC_ATTRS = {
    "data-autonomia": "Autonomía",
    "data-angulo-de-apertura": "Ángulo de apertura",
    "data-clase": "Clase de protección",
    "data-color": "Color del cuerpo",
    "data-cri": "CRI",
    "data-dimensiones": "Dimensiones",
    "data-funciones": "Funciones",
    "data-flujo-luminoso": "Flujo luminoso",
    "data-flujo-luminoso-nominal-total": "Flujo luminoso nominal total",
    "data-flujo-luminoso-inicial-total": "Flujo luminoso inicial total",
    "data-flujo-luminoso-estable-total": "Flujo luminoso estable total",
    "data-tipo-de-chip-led": "Tipo de chip LED",
    "data-frecuencia": "Frecuencia",
    "data-garantia-tiempo": "Garantía",
    "data-ip": "Protección IP",
    "data-lumenes-w": "Lúmenes/W",
    "data-material-cuerpo": "Material del cuerpo",
    "data-panel-tactil": "Panel táctil",
    "data-peso": "Peso",
    "data-potencia": "Potencia",
    "data-temperatura-color": "Temperatura del color",
    "data-temperatura-de-operacion": "Temperatura de operación",
    "data-tension": "Tensión",
    "data-tension-nominal": "Tensión nominal",
    "data-rango-de-tension": "Rango de tensión",
    "data-potencia-nominal-por-lampara": "Potencia nominal por lámpara",
    "data-potencia-de-entrada-por-lampara": "Potencia de entrada por lámpara",
    "data-potencia-estable-por-lampara": "Potencia estable por lámpara",
    "data-corriente-de-entrada-iin": "Corriente de entrada Iin (A)",
    "data-corriente-de-salida-iout": "Corriente de salida Iout (A)",
    "data-tiempo-de-carga": "Tiempo de carga",
    "data-tipo-de-carga": "Tipo de carga",
    "data-tipo-de-led": "Tipo de LED",
    "data-tipo-de-luz": "Tipo de luz",
    "data-dimerizable": "Dimerizable",
    "data-smart": "Smart",
    "data-control-remoto": "Control remoto",
    "data-entrada": "Entrada",
    "data-driver": "Driver",
    "data-canbus": "CANBUS",
    "data-clase-electrica": "Clase eléctrica",
    "data-temperatura-de-trabajo": "Temperatura de trabajo",
    "data-spd": "SPD",
    "data-tipo-de-blanco": "Tipo de blanco",
    "data-en62778": "EN62778",
    "data-desviacion-estandar": "Desviación estándar",
    "data-tipo-de-instalacion": "Tipo de instalación",
    "data-proteccion": "Protección",
    "data-proteccion-estanca": "Protección estanca",
    "data-tipo-de-cable": "Tipo de cable",
    "data-rpm-del-cooler": "RPM del cooler",
    "data-cooler-outer-diameter": "Cooler outer diameter",
    "data-filamentos-de-cobre": "Filamentos de cobre",
    "data-material-del-lente": "Material del lente",
    "data-ugr": "UGR",
    "data-emc": "EMC",
    "data-thd": "THD",
    "data-vida-util": "Vida útil",
    "data-tiempo-de-arranque": "Tiempo de arranque",
    "data-largo-del-cable": "Largo del cable",
  };

  function normalizeSpecKey(key) {
    if (!key) return "";
    if (SPEC_KEY_ALIASES[key]) return SPEC_KEY_ALIASES[key];
    const folded = String(key)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    if (SPEC_ALIAS_NORM[folded]) return SPEC_ALIAS_NORM[folded];
    return key;
  }

  function hasSpecValue(v) {
    if (v == null) return false;
    const s = String(v).trim();
    if (!s) return false;
    if (/^(-+|n\/?a|null|undefined|sin dato)$/i.test(s)) return false;
    return true;
  }

  function isTruthyFlag(v) {
    return /^(si|sí|true|1|yes|smart)$/i.test(String(v == null ? "" : v).trim());
  }

  const SMART_APP_LINES = new Set(["ROMA", "TOKIO"]);

  function isSmartProduct(el, specs) {
    const smartRaw =
      specs["Smart"] || specs["Tecnología"] || el.getAttribute("data-smart");
    return isTruthyFlag(smartRaw);
  }

  function isRomaTokioSmartProduct(el, specs) {
    if (!isSmartProduct(el, specs)) return false;

    const linea = normalizeLinea(
      el.getAttribute("data-linea") || el.getAttribute("data-line") || ""
    );
    if (SMART_APP_LINES.has(linea)) return true;

    const hints = [
      el.getAttribute("data-name"),
      el.getAttribute("data-family"),
      el.getAttribute("data-subfamilia"),
      specs["Subfamilia"],
      specs["Familia"],
    ]
      .map((v) => normalizeLinea(v))
      .join(" ");
    return /\bROMA\b/.test(hints) || /\bTOKIO\b/.test(hints);
  }

  function syncSmartBanner(el, specs) {
    const banner = document.getElementById("smartBanner");
    if (banner) banner.hidden = !isSmartProduct(el, specs);
    const warning = document.getElementById("smartWarning");
    if (warning) warning.hidden = !isRomaTokioSmartProduct(el, specs);
  }

  /* Orden de jerarquía. Solo se muestran hasta TRUST_MAX visibles. */
  const TRUST_PRIORITY = [
    "garantia",
    "certificado",
    "ahorro",
    "cri",
    "dimerizable",
    "smart",
    "panel-tactil",
    "control-remoto",
    "angulo",
    "ip-ik",
    "material",
  ];
  const TRUST_MAX = 4;

  function syncTrustPriority() {
    const root = document.querySelector(".trust");
    if (!root) return;
    const byKey = {};
    root.querySelectorAll(".trust-item[data-trust]").forEach((el) => {
      byKey[el.getAttribute("data-trust")] = el;
    });
    let shown = 0;
    TRUST_PRIORITY.forEach((key) => {
      const el = byKey[key];
      if (!el) return;
      const eligible = el.getAttribute("data-trust-eligible") === "1";
      if (eligible && shown < TRUST_MAX) {
        el.hidden = false;
        shown++;
      } else {
        el.hidden = true;
      }
    });
  }

  function setTrustEligible(key, on) {
    const el = document.querySelector(`.trust-item[data-trust="${key}"]`);
    if (!el) return null;
    el.setAttribute("data-trust-eligible", on ? "1" : "0");
    return el;
  }

  /** True si el producto tiene al menos un dato del grupo "Características lumínicas". */
  function hasLuminousSpecs(specs) {
    const group = SPEC_GROUPS.find((g) => g.title === "Características lumínicas");
    if (!group || !specs) return false;
    return group.rows.some((row) => hasSpecValue(lookupSpec(specs, row.key)));
  }

  function lookupSpec(map, key) {
    if (hasSpecValue(map[key])) return String(map[key]).trim();
    for (const [alias, canonical] of Object.entries(SPEC_KEY_ALIASES)) {
      if (canonical === key && hasSpecValue(map[alias])) return String(map[alias]).trim();
    }
    return "";
  }

  let tipBubble = null;
  let tipOpenFor = null;

  const SPEC_TIP_MARK =
    '<svg class="spec-tip__mark" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.4"/><path d="M8 7.2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="8" cy="5.1" r="0.9" fill="currentColor"/></svg>';

  function ensureTipBubble() {
    if (!tipBubble) {
      tipBubble = document.createElement("div");
      tipBubble.className = "tip-bubble";
      tipBubble.setAttribute("role", "tooltip");
      tipBubble.innerHTML = '<span class="tip-bubble__title"></span><span class="tip-bubble__body"></span>';
      document.body.appendChild(tipBubble);
    }
    return tipBubble;
  }

  function showTip(el) {
    const bubble = ensureTipBubble();
    const titleEl = bubble.querySelector(".tip-bubble__title");
    const bodyEl = bubble.querySelector(".tip-bubble__body");
    const title = el.getAttribute("data-tip-title") || el.querySelector(".spec-tip__label")?.textContent?.trim() || el.textContent.trim();
    const body = el.dataset.tip || "";
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.textContent = body;

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
    if (top < 10) {
      top = anchor.bottom + 12;
      below = true;
    }
    bubble.classList.toggle("is-below", below);
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;

    const arrowX = anchor.left + anchor.width / 2 - left;
    bubble.style.setProperty("--tip-arrow-x", `${Math.max(14, Math.min(arrowX, br.width - 14))}px`);
  }

  function hideTip() {
    if (tipBubble) tipBubble.classList.remove("show");
    document.querySelectorAll(".spec-tip.is-open").forEach((el) => el.classList.remove("is-open"));
    tipOpenFor = null;
  }

  function wireTooltips(container) {
    container.querySelectorAll(".spec-tip").forEach((el) => {
      if (el.dataset.tipWired === "1") return;
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
        if (!isSameOpen) {
          showTip(el);
          tipOpenFor = el;
        }
      });
    });
  }
  document.addEventListener("click", () => hideTip());

  function syncAccordionHeights() {
    document.querySelectorAll(".spec-group.is-open .spec-body").forEach((body) => {
      body.style.maxHeight = body.scrollHeight + "px";
    });
  }

  let dbSpecRows = [];
  let lastSpecExtra = {};

  /* Racks Focus: el ángulo no está en la base. Se elige en la ficha y viaja
     a la comparativa como dato de front. */
  const FOCUS_RACK_SKUS = new Set([
    "FOCUS-BR-250W",
    "FOCUS-BR-500W",
    "FOCUS-BR-750W",
    "FOCUS-BR-1000W",
  ]);
  const FOCUS_ANGLES = ["20°", "40°", "60°", "90°", "Asimétrico"];
  const FOCUS_ANGLE_DEFAULT = "20°";
  const focusAngleBySku = Object.create(null);

  function focusSkuKey(sku) {
    return String(sku || "").trim().toUpperCase();
  }

  function isFocusRackSku(sku) {
    return FOCUS_RACK_SKUS.has(focusSkuKey(sku));
  }

  function focusAngleFor(sku) {
    const key = focusSkuKey(sku);
    if (!FOCUS_RACK_SKUS.has(key)) return "";
    if (focusAngleBySku[key] && FOCUS_ANGLES.includes(focusAngleBySku[key])) return focusAngleBySku[key];
    try {
      const stored = sessionStorage.getItem("ml_focus_angle_" + key);
      if (FOCUS_ANGLES.includes(stored)) {
        focusAngleBySku[key] = stored;
        return stored;
      }
    } catch (_) {}
    try {
      const list = window.MacroledCompare && window.MacroledCompare.getCompareList();
      const saved = (list || []).filter((item) => focusSkuKey(item.sku) === key || focusSkuKey(item.variantSku) === key);
      if (saved.length === 1 && FOCUS_ANGLES.includes(saved[0].focusAngulo)) {
        focusAngleBySku[key] = saved[0].focusAngulo;
        return saved[0].focusAngulo;
      }
    } catch (_) {}
    focusAngleBySku[key] = FOCUS_ANGLE_DEFAULT;
    return FOCUS_ANGLE_DEFAULT;
  }

  function withFocusAngleRow(groups, map) {
    const sku = String((map && map.SKU) || "").trim();
    if (!isFocusRackSku(sku)) return groups;
    const angle = focusAngleFor(sku);
    map["Ángulo de apertura"] = angle;
    const copy = groups.map((group) => ({ ...group, rows: group.rows.slice() }));
    let luminic = copy.find((group) => /lum[ií]nic/i.test(group.title));
    if (!luminic) {
      luminic = { title: "Características lumínicas", icon: ICON_SUN, rows: [] };
      const electricIdx = copy.findIndex((group) => /el[eé]ctric/i.test(group.title));
      copy.splice(electricIdx >= 0 ? electricIdx + 1 : 0, 0, luminic);
    }
    if (!luminic.rows.some((row) => normalizeSpecKey(row.key) === "Ángulo de apertura")) {
      luminic.rows.push({ key: "Ángulo de apertura", tip: "Ángulo en el que se distribuye la luz." });
    }
    return copy;
  }

  function specTipFor(key) {
    for (let i = 0; i < SPEC_GROUPS.length; i++) {
      const row = SPEC_GROUPS[i].rows.find((item) => item.key === key);
      if (row) return row.tip || "";
    }
    return "";
  }

  /* Grupos que vienen en especificaciones[] de la base. Cada producto puede
     traer specs que no están en SPEC_GROUPS: se muestran igual, en su grupo. */
  function groupsFromDatabase() {
    const order = [
      { test: /remoto/i, title: "Características del control remoto", icon: ICON_REMOTE },
      { test: /controladora/i, title: "Características de la controladora", icon: ICON_BOX },
      { test: /el[eé]ctric/i, title: "Características eléctricas", icon: ICON_BOLT },
      { test: /lum[ií]nic/i, title: "Características lumínicas", icon: ICON_SUN },
      { test: /material|construcci/i, title: "Características materiales", icon: ICON_BOX },
      { test: /conect|funci/i, title: "Características de conectividad", icon: ICON_WIFI },
    ];
    const commercialKeys = new Set(["SKU", "EAN13", "Familia", "Macrofamilia", "Subfamilia", "Garantía"]);
    const byTitle = new Map();
    const extras = [];

    dbSpecRows.forEach((row) => {
      const nombre = String((row && row.nombre) || "").trim();
      const valor = String((row && row.valor) || "").trim();
      if (!nombre || !hasSpecValue(valor)) return;
      const key = normalizeSpecKey(nombre);
      if (commercialKeys.has(key)) return;
      const grupo = String((row && row.grupo) || "").trim();
      const meta = order.find((rule) => rule.test.test(grupo));
      const title = meta ? meta.title : grupo || "Especificaciones";
      const icon = meta ? meta.icon : ICON_BOX;
      if (!byTitle.has(title)) {
        const bucket = { title: title, icon: icon, rows: [] };
        byTitle.set(title, bucket);
        if (!meta) extras.push(bucket);
      }
      const bucket = byTitle.get(title);
      if (bucket.rows.some((item) => item.key === key)) return;
      bucket.rows.push({ key: key, tip: specTipFor(key) });
    });

    const ordered = [];
    order.forEach((rule) => {
      const bucket = byTitle.get(rule.title);
      if (bucket && bucket.rows.length) ordered.push(bucket);
    });
    extras.forEach((bucket) => {
      if (bucket.rows.length) ordered.push(bucket);
    });
    return ordered;
  }

  function renderSpecGroups(specs) {
    const root = document.getElementById("specGroups");
    if (!root) return;
    const map = specs || {};
    const groups = withFocusAngleRow(dbSpecRows.length ? groupsFromDatabase() : SPEC_GROUPS, map);
    let html = "";

    groups.forEach((group, gi) => {
      const visibleRows = group.rows
        .map((row) => {
          const val = lookupSpec(map, row.key);
          return val ? { ...row, val } : null;
        })
        .filter(Boolean);

      /* Evitar duplicar Dimerizable si ya salió en eléctricas y también está en lumínicas */
      const seenKeys = new Set();
      const uniqueRows = visibleRows.filter((r) => {
        if (seenKeys.has(r.key)) return false;
        seenKeys.add(r.key);
        return true;
      });

      if (!uniqueRows.length) return;

      const open = gi < 3;
      html += `
        <div class="spec-group${open ? " is-open" : ""}">
          <button type="button" class="spec-group-head" aria-expanded="${open ? "true" : "false"}">
            <span class="sg-title">${group.icon}<span class="sg-title-text">${escapeHtml(group.title)}</span></span>
            <span class="sg-toggle" aria-hidden="true">${open ? "\u2212" : "+"}</span>
          </button>
          <div class="spec-body" style="max-height:${open ? "none" : "0px"}">
            ${uniqueRows
              .map(
                (r) => `
              <div class="spec-row" data-spec-key="${escapeHtml(r.key)}">
                <span class="k">${
                  r.tip
                    ? `<button type="button" class="spec-tip" data-tip-title="${escapeHtml(r.key)}" data-tip="${escapeHtml(r.tip)}" aria-label="${escapeHtml(r.key)}: más información"><span class="spec-tip__label">${escapeHtml(r.key)}</span>${SPEC_TIP_MARK}</button>`
                    : escapeHtml(r.key)
                }</span>
                <span class="v" data-spec-val>${escapeHtml(r.val)}</span>
              </div>`
              )
              .join("")}
          </div>
        </div>`;
    });

    root.innerHTML = html || `<p class="soon-note" style="color:var(--muted);font-size:14px;padding:12px 0">Sin especificaciones cargadas.</p>`;

    /* Deduplicar Dimerizable entre grupos: si aparece en eléctricas, quitar de lumínicas */
    const electricGroup = [...root.querySelectorAll(".spec-group")].find((g) =>
      g.querySelector(".sg-title-text")?.textContent?.includes("eléctricas")
    );
    const luminicGroup = [...root.querySelectorAll(".spec-group")].find((g) =>
      g.querySelector(".sg-title-text")?.textContent?.includes("lumínicas")
    );
    if (electricGroup && luminicGroup) {
      const hasDimE = electricGroup.querySelector('[data-spec-key="Dimerizable"]');
      const dimL = luminicGroup.querySelector('[data-spec-key="Dimerizable"]');
      if (hasDimE && dimL) dimL.remove();
      if (!luminicGroup.querySelector(".spec-row")) luminicGroup.hidden = true;
    }

    wireTooltips(root);
    requestAnimationFrame(syncAccordionHeights);
  }

  const specGroupsRoot = document.getElementById("specGroups");
  const commercialGroupsRoot = document.getElementById("commercialGroups");

  function onSpecAccordionClick(e) {
    const head = e.target.closest(".spec-group-head");
    if (!head || e.target.closest(".spec-tip")) return;
    const group = head.closest(".spec-group");
    const body = group.querySelector(".spec-body");
    const toggle = head.querySelector(".sg-toggle");
    group.classList.toggle("is-open");
    const open = group.classList.contains("is-open");
    head.setAttribute("aria-expanded", open ? "true" : "false");
    body.style.maxHeight = open ? body.scrollHeight + "px" : "0px";
    toggle.textContent = open ? "\u2212" : "+";
  }

  if (specGroupsRoot) specGroupsRoot.addEventListener("click", onSpecAccordionClick);
  if (commercialGroupsRoot) commercialGroupsRoot.addEventListener("click", onSpecAccordionClick);
  window.addEventListener("resize", syncAccordionHeights);

  function syncQuickSpecs(specs) {
    const root = document.querySelector(".quick-specs");
    if (!root) return;
    let visible = 0;
    root.querySelectorAll(".qspec").forEach((block) => {
      const key = normalizeSpecKey(block.getAttribute("data-spec-key"));
      const valEl = block.querySelector("[data-spec-val]");
      let val = lookupSpec(specs, key);
      /* En "Luz" mostramos la categoría (Cálido/Neutro/Frío/RGB): el Kelvin exacto
         ya aparece en el chip de variante y en la tabla de especificaciones. */
      if (key === "Temperatura del color") {
        const tipo = lookupSpec(specs, "Tipo de luz");
        const cat = tempCategory(tipo) || tempCategory(val);
        val = (cat && TEMP_LABELS[cat]) || tipo || val;
      }
      if (valEl) valEl.textContent = val || "";
      const on = hasSpecValue(val);
      block.hidden = !on;
      if (on) visible++;
    });
    root.setAttribute("data-count", String(visible));
    root.hidden = visible === 0;
    const charsBlock = root.closest(".chars-block");
    if (charsBlock) charsBlock.hidden = visible === 0;
  }

  function syncCommercialTable(specs, extra) {
    const map = Object.assign({}, specs, extra || {});
    const table = document.getElementById("commercialTable");
    const group = document.getElementById("commercialGroup");
    let visible = 0;
    document.querySelectorAll("#panel-commercial [data-spec-key]").forEach((block) => {
      const key = block.getAttribute("data-spec-key");
      const valEl = block.querySelector("[data-spec-val]");
      let val = "";
      if (key === "SKU") val = map.SKU || "";
      else if (key === "EAN13") val = map.EAN13 || "";
      else if (key === "Familia") val = map.Familia || "";
      else if (key === "Macrofamilia") val = map.Macrofamilia || "";
      else val = lookupSpec(map, key);
      if (valEl && val) valEl.textContent = val;
      const on = hasSpecValue(val);
      block.hidden = !on;
      if (on) visible++;
    });
    if (group) group.hidden = visible === 0;
    if (table) {
      wireTooltips(table);
      if (group && group.classList.contains("is-open")) {
        table.style.maxHeight = table.scrollHeight + "px";
      }
    }
  }

  function updateSpecVals(specs, extra) {
    const map = Object.assign({}, specs, extra || {});
    renderSpecGroups(map);
    syncQuickSpecs(map);
    syncCommercialTable(map, extra);
  }

  function refreshOpenAccordions() {
    syncAccordionHeights();
  }

  /* —— Compatible (reemplazado por destacados.js / Typesense) —— */

  /* —— Variants (CMS siblings) —— */

  /**
   * "Nombre ATTR_Variantes" del CMS → claves de spec que pueden contener ese valor.
   * Las claves del objeto van normalizadas (sin acentos, minúsculas) porque el CMS
   * trae variaciones como "Ángulo ", "angulo" o "Temperatura de color".
   */
  const DIM_LABEL_CANDIDATES = {
    color: ["Color del cuerpo", "Color"],
    "color del cuerpo": ["Color del cuerpo", "Color"],
    luz: ["Temperatura del color", "Tipo de luz"],
    "tipo de luz": ["Tipo de luz", "Temperatura del color"],
    temperatura: ["Temperatura del color", "Tipo de luz"],
    "temperatura de color": ["Temperatura del color", "Tipo de luz"],
    "temperatura del color": ["Temperatura del color", "Tipo de luz"],
    cct: ["Temperatura del color", "Tipo de luz"],
    angulo: ["Ángulo de apertura"],
    "angulo de apertura": ["Ángulo de apertura"],
    apertura: ["Ángulo de apertura"],
    potencia: ["Potencia"],
    conector: ["Conector", "Conexión"],
    conexion: ["Conexión", "Conector"],
    ip: ["Protección IP"],
    "proteccion ip": ["Protección IP"],
    medida: ["Dimensiones"],
    medidas: ["Dimensiones"],
    dimensiones: ["Dimensiones"],
    tension: ["Tensión"],
    material: ["Material del cuerpo"],
    "material del cuerpo": ["Material del cuerpo"],
    "flujo luminoso": ["Flujo luminoso"],
    "cantidad de luces": ["Cantidad de luces"],
  };

  /* Identificadores y datos comerciales: nunca son el eje de una variante. */
  const NON_DIM_KEYS = new Set([
    "SKU",
    "EAN13",
    "Familia",
    "Macrofamilia",
    "Subfamilia",
    "Garantía",
  ]);

  /* Ejes que pueden ser selector. Cuáles aparecen lo deciden las variantes
     enlazadas (Variantes_Multireference / variantes_sku), no nombre_attr_variantes. */
  const DIM_AUTODETECT_PRIORITY = [
    "Potencia",
    "Color del cuerpo",
    "Temperatura del color",
    "Tipo de luz",
    "Ángulo de apertura",
    "Protección IP",
  ];

  const COLOR_SWATCH = {
    blanco: "#f4f4f4",
    negro: "#1a1a1a",
    rojo: "#c62828",
    verde: "#2e7d32",
    azul: "#1565c0",
    amarillo: "#f9a825",
    gris: "#9e9e9e",
    bronce: "#b08d57",
    cobre: "#b87333",
    dorado: "#c9a227",
    plata: "#c0c0c0",
    plateado: "#c0c0c0",
    platil: "#c0c0c0",
    cromo: "#cfd4d8",
    niquel: "#b6b6b6",
    madera: "#a97142",
    aluminio: "#d6d8da",
    cromado: "#cfd4d8",
    transparente: "repeating-conic-gradient(#e5e5e5 0% 25%, #ffffff 0% 50%) 50% / 8px 8px",
  };

  function normKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /* Specs que describen el color de la luz (no el del cuerpo del artefacto). */
  const TEMP_SPEC_KEYS = new Set(["Temperatura del color", "Tipo de luz"]);

  const TEMP_LABELS = {
    calido: "Cálido",
    neutro: "Neutro",
    frio: "Frío",
    cct: "CCT",
    rgb: "RGB",
    rgbw: "RGB+W",
  };

  /* Mismos tonos que los badges de las cards (destacados.js). */
  const RGB_WHEEL = "#ff3b30,#ffcc00,#34c759,#00bcd4,#5856d6,#ff2d55,#ff3b30";
  const TEMP_SWATCH = {
    calido: "#fff79b",
    neutro: "#d9d9d9",
    frio: "#bce4fa",
    ambar: "#f9a825",
    azul: "#1565c0",
    verde: "#2e7d32",
    rojo: "#c62828",
    amarillo: "#f9d923",
    cct: "linear-gradient(90deg,#fff79b,#d9d9d9,#bce4fa)",
    rgb: `conic-gradient(${RGB_WHEEL})`,
    rgbw: `conic-gradient(#ffffff 0 25%,${RGB_WHEEL})`,
  };

  /**
   * "2700K" → calido, "6500K" → frio, "RGB+W" → rgbw,
   * "2700K a 6500K" → cct (sintonizable, no es un tono fijo).
   */
  function kelvinsIn(value) {
    return normKey(value).match(/\d{4}/g) || [];
  }

  function tempCategory(value) {
    const v = normKey(value);
    if (!v) return null;
    if (v.indexOf("rgb") !== -1) return /rgb\s*\+?\s*w|rgbw/.test(v) ? "rgbw" : "rgb";
    if (/calid|warm/.test(v)) return "calido";
    if (/neutr/.test(v)) return "neutro";
    if (/frio|cool/.test(v)) return "frio";
    if (/ambar|amber/.test(v)) return "ambar";
    if (/azul|blue/.test(v)) return "azul";
    if (/verde|green/.test(v)) return "verde";
    if (/rojo|red/.test(v)) return "rojo";
    if (/amarill|yellow/.test(v)) return "amarillo";

    const kelvins = kelvinsIn(value);
    if (!kelvins.length) return null;
    if (kelvins.length > 1) return "cct";
    const k = parseInt(kelvins[0], 10);
    if (k <= 3500) return "calido";
    if (k <= 5000) return "neutro";
    return "frio";
  }

  /* Cálido → neutro → frío → CCT → RGB → RGB+W, y dentro del blanco por Kelvin. */
  function tempSort(a, b) {
    const TIER = { cct: 2, rgb: 3, rgbw: 4 };
    const catA = tempCategory(a);
    const catB = tempCategory(b);
    const tierA = TIER[catA] || 1;
    const tierB = TIER[catB] || 1;
    if (tierA !== tierB) return tierA - tierB;

    if (tierA === 1) {
      const ka = kelvinsIn(a);
      const kb = kelvinsIn(b);
      if (ka.length === 1 && kb.length === 1) {
        const diff = parseInt(ka[0], 10) - parseInt(kb[0], 10);
        if (diff) return diff;
      }
      const BLANCOS = ["calido", "neutro", "frio"];
      const ia = BLANCOS.indexOf(catA);
      const ib = BLANCOS.indexOf(catB);
      if (ia !== ib) return ia - ib;
    }

    return String(a).localeCompare(String(b), "es");
  }

  const variantsTarget = document.getElementById("product-variants") || document.querySelector(".container_variants");

  function parseList(raw) {
    return String(raw || "")
      .split(/[;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function parseSpecs(el) {
    const out = {};

    /* 1) data-specs JSON opcional (legacy / fallback) */
    try {
      let rawJson = el.getAttribute("data-specs");
      if (rawJson) {
        /* Webflow a veces deja espacios/newlines; limpiar comas colgantes leves */
        rawJson = String(rawJson)
          .replace(/,\s*([}\]])/g, "$1")
          .trim();
        const parsed = JSON.parse(rawJson) || {};
        Object.keys(parsed).forEach((k) => {
          if (!hasSpecValue(parsed[k])) return;
          out[normalizeSpecKey(k)] = String(parsed[k]).trim();
        });
      }
    } catch (e) {
      console.warn("JSON inválido en data-specs de", el.getAttribute("data-sku"), e);
    }

    /* 2) Campos CMS individuales (ganan sobre JSON si ambos existen) */
    Object.keys(CMS_SPEC_ATTRS).forEach((attr) => {
      const raw = el.getAttribute(attr);
      if (!hasSpecValue(raw)) return;
      out[CMS_SPEC_ATTRS[attr]] = String(raw).trim();
    });

    return out;
  }

  function slugify(str) {
    return String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function variantSort(a, b) {
    const colorOrder = ["blanco", "negro", "gris", "plata", "platil", "rojo", "verde", "azul", "bronce", "cobre"];
    const ia = colorOrder.indexOf(normKey(a));
    const ib = colorOrder.indexOf(normKey(b));
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    const na = parseFloat(String(a).replace(",", ".").replace(/[^\d.]/g, "")) || 0;
    const nb = parseFloat(String(b).replace(",", ".").replace(/[^\d.]/g, "")) || 0;
    if (na !== nb) return na - nb;
    return String(a).localeCompare(String(b), "es");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setText(sel, value) {
    const el = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (el && value != null && value !== "") el.textContent = value;
  }

  function setHref(sel, url) {
    const el = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (el && url) el.href = url;
  }

  function isValidFileUrl(url) {
    const u = String(url || "").trim();
    return !!(u && u !== "#" && !/^javascript:/i.test(u));
  }

  function setDownloadBtnLabel(btn, label) {
    if (!btn) return;
    const svg = btn.querySelector("svg");
    btn.textContent = "";
    if (svg) btn.appendChild(svg);
    btn.appendChild(document.createTextNode(" " + label));
  }

  /**
   * Botones de descarga del hero (arriba de comparar):
   * primero la ficha técnica, después el catálogo.
   * La ficha técnica siempre se genera al hacer click.
   * El manual queda en la pestaña Descargas.
   */
  function syncActionDownloads(fichaUrl, catalogoUrl, manualUrl) {
    void fichaUrl;
    void manualUrl;
    const btnPrimary = document.getElementById("btn-ficha");
    const btnSecondary = document.getElementById("btn-catalogo");
    const actions = document.querySelector(".cta-stack .actions");

    const hasManualOverride = btnPrimary && btnPrimary.getAttribute("data-cta-mode") === "contact";
    const contactUrl = (btnPrimary && btnPrimary.getAttribute("data-contact-url")) || "https://www.electroestrada.com.ar/";

    const fichaDoc = {
      key: "ficha",
      generate: true,
      primaryLabel: "Descargar ficha técnica",
      secondaryLabel: "Descargar ficha técnica",
    };

    const catalogDoc = isValidFileUrl(catalogoUrl)
      ? {
          key: "catalogo",
          url: catalogoUrl,
          primaryLabel: "Catálogo",
          secondaryLabel: "Catálogo",
        }
      : null;

    const contactDoc = {
      key: "contacto",
      url: contactUrl,
      primaryLabel: "Contacto comercial",
      secondaryLabel: "Contacto comercial",
    };

    const finalDocs = (hasManualOverride ? [contactDoc, catalogDoc] : [fichaDoc, catalogDoc]).filter(Boolean);

    const apply = (btn, doc, isPrimary) => {
      if (!btn) return;
      if (!doc) {
        btn.hidden = true;
        btn.removeAttribute("href");
        delete btn.dataset.generatePdf;
        return;
      }
      btn.hidden = false;
      setDownloadBtnLabel(btn, isPrimary ? doc.primaryLabel : doc.secondaryLabel);
      if (doc.generate) {
        btn.dataset.generatePdf = "1";
        btn.href = "#";
        btn.removeAttribute("target");
        btn.removeAttribute("rel");
        return;
      }
      delete btn.dataset.generatePdf;
      btn.href = doc.url;
      btn.target = "_blank";
      btn.rel = "noopener";
    };

    apply(btnPrimary, finalDocs[0] || null, true);
    apply(btnSecondary, finalDocs[1] || null, false);
    if (actions) actions.hidden = finalDocs.length === 0;
  }

  const DOWNLOAD_CARD_ORDER = ["ficha", "catalogo", "garantia", "manual", "ies"];

  function orderDownloadCards() {
    const list = document.getElementById("files-list");
    if (!list) return;
    const cards = Array.from(list.querySelectorAll(".dl-card"));
    const byKey = new Map(cards.map((card) => [card.getAttribute("data-file"), card]));
    DOWNLOAD_CARD_ORDER.forEach((key) => {
      const card = byKey.get(key);
      if (card) list.appendChild(card);
    });
    cards.forEach((card) => {
      if (!DOWNLOAD_CARD_ORDER.includes(card.getAttribute("data-file"))) list.appendChild(card);
    });
  }

  function syncFileCards(files) {
    orderDownloadCards();
    const map = {
      ficha: files && files.ficha,
      garantia: files && files.garantia,
      manual: files && files.manual,
      catalogo: files && files.catalogo,
      ies: files && files.ies,
    };
    let visibleCount = 0;
    document.querySelectorAll("#files-list .dl-card").forEach((card) => {
      const key = card.getAttribute("data-file");
      if (key === "ficha-anterior") {
        card.hidden = true;
        card.removeAttribute("href");
        return;
      }
      /* La ficha y la garantía siempre se generan, aunque haya un link cargado. */
      if (key === "ficha" || key === "garantia") {
        card.href = "#";
        card.hidden = false;
        card.dataset.generatePdf = "1";
        card.removeAttribute("target");
        card.removeAttribute("rel");
        const openLabel = card.querySelector(".dl-card__btn");
        if (openLabel && openLabel.textContent.trim() !== "Generando…") openLabel.textContent = "Descargar";
        visibleCount++;
        return;
      }
      const url = (map[key] || "").trim();
      if (url && url !== "#") {
        card.href = url;
        card.hidden = false;
        visibleCount++;
      } else {
        card.removeAttribute("href");
        card.hidden = true;
      }
    });

    // Ningún documento cargado para este SKU: se oculta el tab en vez de
    // mostrarlo vacío (mismo criterio que armados/despiece/compatibles).
    const tabFiles = document.getElementById("tab-files");
    if (tabFiles) {
      const wasActive = tabFiles.classList.contains("is-active");
      tabFiles.hidden = visibleCount === 0;
      if (visibleCount === 0 && wasActive) {
        const fallback = document.querySelector('.tab[data-tab="specs"]');
        if (fallback) fallback.click();
      }
    }
  }

  /**
   * PDF de ficha técnica: imagen principal + especificaciones + info comercial
   * del producto que está en pantalla. Se arma en el navegador al hacer click.
   */
  function pdfFileName(sku, suffix) {
    const base = String(sku || "producto").trim().replace(/[\\/:*?"<>|]+/g, "-") || "producto";
    return base + "-" + suffix + ".pdf";
  }

  function deliverGeneratedPdf(blob, filename, preview) {
    const viewUrl = URL.createObjectURL(blob);
    const fileUrl = URL.createObjectURL(blob);
    if (preview && !preview.closed) preview.location.replace(viewUrl);
    else window.open(viewUrl, "_blank", "noopener");
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => {
      URL.revokeObjectURL(viewUrl);
      URL.revokeObjectURL(fileUrl);
    }, 120000);
  }

  function pdfSafe(value) {
    return String(value || "")
      .normalize("NFC")
      .replace(/\u00A0/g, " ")
      .replace(/[\u2010-\u2015]/g, "-")
      .replace(/[\u2018\u2019\u2032]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u2026/g, "...")
      .replace(/\u2264/g, "<=")
      .replace(/\u2265/g, ">=")
      .replace(/[\u03A9\u2126]/g, "Ohm")
      .replace(/[\u00B5\u03BC]/g, "u")
      .replace(/\u00D7/g, "x")
      .replace(/[^\u0000-\u00FF]/g, "");
  }

  function loadJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-ml-jspdf]");
      if (existing) {
        existing.addEventListener("load", () => resolve(window.jspdf.jsPDF), { once: true });
        existing.addEventListener("error", () => reject(new Error("jspdf")), { once: true });
        return;
      }
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js";
      s.dataset.mlJspdf = "1";
      s.onload = () => resolve(window.jspdf.jsPDF);
      s.onerror = () => reject(new Error("jspdf"));
      document.head.appendChild(s);
    });
  }

  function currentSheetImageUrl() {
    const current = GALLERY[activeIndex];
    if (current && !isVideoType(current.type)) return current.full || current.display || "";
    const photo = GALLERY.find((g) => g && !isVideoType(g.type));
    if (photo) return photo.full || photo.display || "";
    if (heroItem) return (heroItem.getAttribute("data-image") || "").trim();
    return "";
  }

  function loadPdfImage(url) {
    return new Promise((resolve) => {
      if (!url) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      const timer = setTimeout(() => resolve(null), 8000);
      img.onload = () => {
        clearTimeout(timer);
        try {
          const max = 900;
          const nw = img.naturalWidth || 1;
          const nh = img.naturalHeight || 1;
          const scale = Math.min(1, max / Math.max(nw, nh));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(nw * scale));
          canvas.height = Math.max(1, Math.round(nh * scale));
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve({
            data: canvas.toDataURL("image/png"),
            format: "PNG",
            w: canvas.width,
            h: canvas.height,
          });
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => {
        clearTimeout(timer);
        resolve(null);
      };
      img.src = url;
    });
  }

  function collectSheetData() {
    const el = heroItem;
    const specs = el ? parseSpecs(el) : {};
    const ctx = window.__mlProductCtx || {};
    const name = (document.getElementById("ficha-name")?.textContent || ctx.name || "").trim();
    const sku = (document.getElementById("ficha-sku")?.textContent || ctx.sku || "").trim();
    const ean = (document.getElementById("ficha-ean")?.textContent || ctx.ean13 || "").trim();
    const lead = (document.getElementById("ficha-lead")?.textContent || ctx.description || "").trim();
    const eyebrow = (document.getElementById("ficha-eyebrow")?.textContent || "").trim();
    const family = (ctx.family || (el && el.getAttribute("data-family")) || "").trim();
    const macro = (ctx.macro || (el && el.getAttribute("data-macrofamilia")) || "").trim();
    const map = Object.assign({}, specs, {
      SKU: sku,
      EAN13: ean,
      Familia: family,
      Macrofamilia: macro,
    });

    const shown = readShownFicha();
    const groups = shown.groups.length ? shown.groups : groupsFromSpecs(map);
    const commercial = shown.commercial;
    const highlights = shown.highlights;

    const line = (el && el.getAttribute("data-linea") || "").trim();
    const links = [];
    const webUrl = sheetWebUrl(el);
    const addSheetLink = (key, url) => {
      const href = String(url || "").trim();
      if (!key || !isValidFileUrl(href)) return;
      if (links.some((item) => item.url === href)) return;
      links.push({ key, val: href, url: href });
    };
    if (webUrl) addSheetLink("Ficha Web", webUrl);
    [
      ["Ficha técnica general", (el && el.getAttribute("data-ficha")) || (el && el.getAttribute("data-ficha-anterior"))],
      ["Catálogo", el && el.getAttribute("data-catalogo")],
      ["Manual de uso", el && el.getAttribute("data-manual")],
      ["Archivo IES", el && el.getAttribute("data-ies")],
    ].forEach(([key, url]) => addSheetLink(key, url));

    return {
      name,
      sku,
      ean,
      lead,
      eyebrow,
      family,
      line,
      groups,
      commercial,
      links,
      highlights,
      webUrl,
      imageUrl: currentSheetImageUrl(),
    };
  }

  let forcedSheetUrl = "";

  function sheetWebUrl(el) {
    if (forcedSheetUrl) return forcedSheetUrl;
    const href = String(window.location.href || "").split("#")[0];
    if (/^https?:\/\//i.test(href)) return href;
    const raw = (el && (el.getAttribute("data-product-url") || el.getAttribute("data-link")) || "").trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw && raw !== "#") return "https://www.macroled.com.ar/" + raw.replace(/^\//, "");
    return "https://www.macroled.com.ar/";
  }

  function cleanShownText(el) {
    return String((el && el.textContent) || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* Solo cuenta el hidden del propio dato. Las solapas (comercial, descargas)
     están ocultas hasta que se abren, pero sus filas igual forman parte de la ficha. */
  function isShown(el) {
    return !!(el && !el.hidden);
  }

  function shownSpecRows(root) {
    const rows = [];
    if (!root) return rows;
    root.querySelectorAll(".spec-row").forEach((row) => {
      if (!isShown(row)) return;
      const key = cleanShownText(row.querySelector(".spec-tip__label") || row.querySelector(".k"));
      const val = cleanShownText(row.querySelector("[data-spec-val]"));
      if (key && hasSpecValue(val)) rows.push({ key, val });
    });
    return rows;
  }

  /* Lo que el PDF imprime sale de lo que la ficha tiene visible.
     Si este producto no muestra un dato, no entra. */
  function readShownFicha() {
    const groups = [];
    document.querySelectorAll("#specGroups .spec-group").forEach((group) => {
      if (!isShown(group)) return;
      const title = cleanShownText(group.querySelector(".sg-title-text"));
      const rows = shownSpecRows(group);
      if (title && rows.length) groups.push({ title, rows });
    });

    const commercial = shownSpecRows(document.getElementById("commercialTable"));

    const highlights = [];
    document.querySelectorAll(".quick-specs .qspec").forEach((block) => {
      if (!isShown(block)) return;
      const key = cleanShownText(block.querySelector(".label"));
      const val = cleanShownText(block.querySelector("[data-spec-val]"));
      if (key && hasSpecValue(val)) highlights.push({ key, val });
    });

    return { groups, commercial, highlights };
  }

  function groupsFromSpecs(map) {
    const groups = [];
    SPEC_GROUPS.forEach((group) => {
      const rows = [];
      const seen = new Set();
      group.rows.forEach((row) => {
        if (seen.has(row.key)) return;
        const val = lookupSpec(map, row.key);
        if (!hasSpecValue(val)) return;
        seen.add(row.key);
        rows.push({ key: row.key, val: String(val).trim() });
      });
      if (rows.length) groups.push({ title: group.title, rows });
    });
    const electric = groups.find((g) => g.title === "Características eléctricas");
    const luminic = groups.find((g) => g.title === "Características lumínicas");
    if (electric && luminic && electric.rows.some((r) => r.key === "Dimerizable")) {
      luminic.rows = luminic.rows.filter((r) => r.key !== "Dimerizable");
      if (!luminic.rows.length) groups.splice(groups.indexOf(luminic), 1);
    }
    return groups;
  }

  function loadQrLib() {
    if (typeof window.qrcode === "function") return Promise.resolve(window.qrcode);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-ml-qr]");
      const done = () => resolve(window.qrcode);
      if (existing) {
        existing.addEventListener("load", done, { once: true });
        existing.addEventListener("error", () => reject(new Error("qr")), { once: true });
        return;
      }
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
      s.dataset.mlQr = "1";
      s.onload = done;
      s.onerror = () => reject(new Error("qr"));
      document.head.appendChild(s);
    });
  }

  const PDF_CYAN = [0, 177, 235];
  const PDF_GRAY = [124, 123, 123];
  const CORESA_LOGO_URL = "https://cdn.prod.website-files.com/674eb5c4242fba76abefe2f3/69b9aefdcd76a4148f045172_coresa-negro.svg";
  const CORESA_WEB_URL = "https://www.coresagroup.com/";
  const PDF_CONTACTO_URL = "https://www.macroled.com.ar/contacto";
  const MACROLED_LOGO_VIEW = { w: 482.06, h: 65.07 };
  const MACROLED_LOGO_PATH =
    "M191.2,54.17c.37.59.26,1.35-.24,1.83-6.06,5.7-13.78,8.8-22.14,8.8-9.29,0-16.97-3.01-23.47-9.19-6.48-6.25-9.64-13.83-9.64-23.17,0-8.64,3.87-17.61,9.64-23.17C151.84,3.09,159.52.09,168.81.09c8.11,0,15.61,2.91,21.58,8.28.52.47.64,1.24.27,1.84l-6.34,10.34-.23-.25c-4.04-4.65-9.18-7.01-15.28-7.01-5.37,0-9.8,1.77-13.55,5.42-3.63,3.71-5.4,8.2-5.4,13.74s1.77,10.03,5.4,13.74c3.74,3.64,8.18,5.42,13.55,5.42,10.61,0,15.98-7.77,15.98-7.77l6.41,10.34ZM110.4,1.2l25.62,62.61h-15.25l-2.45-6.17s-.02-.05-.03-.08c-1.41-3.46-4.2-4.18-7.58-4.18h-19.27l-4.15,10.42h-15.24L96.36,4.35c.84-2.04,2.82-3.37,5.03-3.37h8.92l.09.22ZM112.45,41.71l-7.71-19.52c-.24-.61-1.11-.61-1.35,0l-7.79,19.52h16.85ZM51.21,4.22l-17.78,27.35c-.29.44-.93.44-1.21,0L14.44,4.22c-1.34-2.02-3.61-3.24-6.03-3.24H0v62.84h13.42V29.13c0-.71.93-1,1.32-.4l17.48,26.01c.29.43.92.43,1.2,0l17.39-25.99c.4-.59,1.32-.31,1.32.4v34.67h13.51V.98h-8.41c-2.43,0-4.69,1.22-6.03,3.24ZM387.61,49.9v-11.77h23.06v-13.05h-22.34c-.4,0-.72-.32-.72-.72v-10.16h22.38c3,0,5.43-2.43,5.43-5.43V.98h-42.11v62.84h43.33v-13.2h-28.3c-.4,0-.72-.33-.72-.72ZM341.28,49.53V6.41c0-3-2.43-5.43-5.43-5.43h-9.15v62.84h38.3v-13.56h-23c-.4,0-.72-.33-.72-.72ZM236.17,40.33l15.42,23.49h-13.54c-1.88,0-3.63-.97-4.62-2.57l-11.2-18.11h-8.53v20.67h-14.21V.98h26.12c5.86,0,10.9,2.04,14.98,6.07,4.23,4,6.28,8.83,6.28,14.78,0,7.57-4.28,14.29-10.44,17.47-.37.19-.5.67-.27,1.02ZM232.58,22.02c0-4.47-3.15-7.84-7.32-7.84h-11.55v15.4c0,.4.32.72.72.72h9.68c5.14,0,8.46-3.25,8.46-8.28ZM482.06,32.53c0,9.47-2.88,17.14-8.57,22.8-5.57,5.63-13.76,8.48-24.34,8.48h-23.02V.98h22.93c10.49,0,18.68,2.94,24.34,8.75,5.75,5.71,8.66,13.39,8.66,22.8ZM467.67,32.53c0-5.73-1.48-10.27-4.4-13.48-2.86-3.24-7.93-4.87-15.09-4.87h-7.74v35.71c0,.4.32.72.73.72h7.1c13.24,0,19.41-5.75,19.41-18.09ZM309.06,9.46c6.39,6.25,9.63,14.01,9.63,23.07s-3.21,16.88-9.54,23.16c-6.36,6.22-14.2,9.37-23.31,9.37s-16.86-3.15-23.3-9.37c-6.34-6.29-9.55-14.08-9.55-23.17s3.21-16.8,9.54-23.07c6.42-6.28,14.26-9.46,23.31-9.46s16.89,3.18,23.22,9.46ZM304.34,32.53c0-5.26-1.8-9.81-5.35-13.51-3.57-3.73-8-5.63-13.15-5.63s-9.58,1.9-13.15,5.63c-3.55,3.71-5.35,8.25-5.35,13.51s1.75,9.93,5.35,13.69c3.54,3.62,7.97,5.45,13.15,5.45s9.5-1.81,13.06-5.54c3.61-3.68,5.43-8.25,5.43-13.6Z";
  const macroledLogoCache = {};

  function macroledLogoHeight(widthMm) {
    return widthMm * (MACROLED_LOGO_VIEW.h / MACROLED_LOGO_VIEW.w);
  }

  function rasterizeSvgMarkup(svg, fallbackW, fallbackH, background) {
    return new Promise((resolve) => {
      const img = new Image();
      const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      const finish = (image) => {
        URL.revokeObjectURL(blobUrl);
        resolve(image);
      };
      img.onload = () => {
        const paint = () => {
          const w = img.naturalWidth || fallbackW || 63;
          const h = img.naturalHeight || fallbackH || 26;
          const scale = 6;
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(w * scale));
          canvas.height = Math.max(1, Math.round(h * scale));
          const ctx = canvas.getContext("2d");
          if (background) {
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          finish({ data: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height });
        };
        if (typeof img.decode === "function") img.decode().then(paint).catch(paint);
        else paint();
      };
      img.onerror = () => finish(null);
      img.src = blobUrl;
    });
  }

  function loadSvgImage(url) {
    return fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("logo");
        return res.text();
      })
      .then((svg) => rasterizeSvgMarkup(svg, 63, 26))
      .catch(() => null);
  }

  function macroledLogoImage(fill, background) {
    const key = fill + "|" + (background || "");
    if (!macroledLogoCache[key]) {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' +
        MACROLED_LOGO_VIEW.w +
        '" height="' +
        MACROLED_LOGO_VIEW.h +
        '" viewBox="0 0 ' +
        MACROLED_LOGO_VIEW.w +
        " " +
        MACROLED_LOGO_VIEW.h +
        '"><path fill="' +
        fill +
        '" d="' +
        MACROLED_LOGO_PATH +
        '"></path></svg>';
      macroledLogoCache[key] = rasterizeSvgMarkup(svg, MACROLED_LOGO_VIEW.w, MACROLED_LOGO_VIEW.h, background);
    }
    return macroledLogoCache[key];
  }

  function drawPdfLogo(doc, image, x, y, widthMm) {
    if (!image) return null;
    const h = macroledLogoHeight(widthMm);
    try {
      doc.addImage(image.data, "PNG", x, y, widthMm, h);
      return { w: widthMm, h };
    } catch (e) {
      return null;
    }
  }

  function placePdfImage(doc, image, x, y, maxW, maxH) {
    if (!image) return 0;
    const ratio = image.w / image.h || 1;
    let iw = maxW;
    let ih = maxW / ratio;
    if (ih > maxH) {
      ih = maxH;
      iw = maxH * ratio;
    }
    try {
      doc.addImage(image.data, image.format || "PNG", x + (maxW - iw) / 2, y + (maxH - ih) / 2, iw, ih);
    } catch (e) {
      return 0;
    }
    return ih;
  }

  function drawPdfQr(doc, url, x, y, size) {
    if (typeof window.qrcode !== "function" || !url) return;
    const qr = window.qrcode(0, "M");
    qr.addData(url);
    qr.make();
    const n = qr.getModuleCount();
    const cell = size / n;
    doc.setFillColor(255, 255, 255);
    doc.rect(x - 0.8, y - 0.8, size + 1.6, size + 1.6, "F");
    doc.setFillColor(25, 25, 25);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) doc.rect(x + c * cell, y + r * cell, cell + 0.08, cell + 0.08, "F");
      }
    }
  }

  async function downloadTechnicalSheet(preview) {
    const data = collectSheetData();
    const [JsPDF, image, coresaLogo, macroledLogoWhite, macroledLogoCyan] = await Promise.all([
      loadJsPdf(),
      loadPdfImage(data.imageUrl),
      loadSvgImage(CORESA_LOGO_URL),
      macroledLogoImage("#ffffff", "#00b1eb"),
      macroledLogoImage("#00b1eb", "#ffffff"),
      loadQrLib().catch(() => null),
    ]);
    const doc = new JsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentW = pageW - margin * 2;
    const footerTop = pageH - 30;
    const state = { y: 32 };

    function paintCover() {
      doc.setFillColor(PDF_GRAY[0], PDF_GRAY[1], PDF_GRAY[2]);
      doc.rect(0, 0, pageW, 214, "F");

      const coverLogoW = 68.8;
      const coverLogoH = macroledLogoHeight(coverLogoW);
      const logoPadX = 9;
      const logoPadY = 8;
      const logoBoxW = coverLogoW + logoPadX * 2;
      const logoBoxY = 13;
      const logoBoxH = coverLogoH + logoPadY * 2;
      doc.setFillColor(PDF_CYAN[0], PDF_CYAN[1], PDF_CYAN[2]);
      doc.rect(0, logoBoxY, logoBoxW, logoBoxH, "F");
      const drewCoverLogo = drawPdfLogo(doc, macroledLogoWhite, logoPadX, logoBoxY + logoPadY, coverLogoW);
      if (!drewCoverLogo) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(32);
        doc.setTextColor(255, 255, 255);
        doc.text("MACROLED", logoBoxW / 2, logoBoxY + 23, { align: "center" });
      }

      doc.setTextColor(255, 255, 255);
      const titleX = logoBoxW + 8;
      const titleW = pageW - titleX - 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      const kicker = pdfSafe(data.family || data.eyebrow || "");
      if (kicker) doc.text(doc.splitTextToSize(kicker, titleW).slice(0, 1), titleX, 26);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      const heroTitle = pdfSafe(data.line ? data.line.toUpperCase() : data.name || "Producto");
      const heroLines = doc.splitTextToSize(heroTitle, titleW).slice(0, 2);
      doc.text(heroLines, titleX, 36);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      if (data.sku) doc.text(pdfSafe(data.sku), titleX, 36 + heroLines.length * 8);

      placePdfImage(doc, image, (pageW - 130) / 2, 62, 130, 142);

      doc.setFillColor(255, 255, 255);
      doc.rect(0, 214, pageW, pageH - 214 - 28, "F");
      const perRow = 3;
      const colW = Math.min(66, (pageW - 12) / perRow);
      data.highlights.forEach((item, i) => {
        const row = Math.floor(i / perRow);
        const rowStart = row * perRow;
        const rowCount = Math.min(perRow, data.highlights.length - rowStart);
        const x = (pageW - rowCount * colW) / 2 + (i - rowStart) * colW + colW / 2;
        const y = 230 + row * 31;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12.9);
        doc.setTextColor(110, 110, 110);
        doc.text(pdfSafe(item.key), x, y, { align: "center" });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15.7);
        doc.setTextColor(25, 25, 25);
        doc.text(doc.splitTextToSize(pdfSafe(item.val), colW - 4).slice(0, 2), x, y + 8.6, { align: "center" });
      });
    }

    function paintContentHeader() {
      const headerTitle = pdfSafe([data.family, data.line].filter(Boolean).join(" ") || data.name || "Producto");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(PDF_CYAN[0], PDF_CYAN[1], PDF_CYAN[2]);
      const lines = doc.splitTextToSize(headerTitle, 112).slice(0, 2);
      doc.text(lines, margin, 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      if (data.sku) doc.text(pdfSafe(data.sku), margin, 16 + lines.length * 5.4);
      const headerLogoW = 46.8;
      const drewHeaderLogo = drawPdfLogo(
        doc,
        macroledLogoCyan,
        pageW - margin - headerLogoW,
        11.2,
        headerLogoW
      );
      if (!drewHeaderLogo) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(19.6);
        doc.setTextColor(PDF_CYAN[0], PDF_CYAN[1], PDF_CYAN[2]);
        doc.text("MACROLED", pageW - margin, 19, { align: "right" });
      }
      state.y = 30;
    }

    function ensure(h) {
      if (state.y + h <= footerTop) return;
      doc.addPage();
      paintContentHeader();
    }

    function drawSpecTable(title, rows) {
      const barH = 7;
      ensure(barH + 8);
      doc.setFillColor(PDF_CYAN[0], PDF_CYAN[1], PDF_CYAN[2]);
      doc.rect(margin, state.y, contentW, barH, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(pdfSafe(title), margin + 2.2, state.y + 4.8);
      state.y += barH;

      rows.forEach((row) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const label = pdfSafe(row.key);
        const valueLines = doc.splitTextToSize(pdfSafe(row.val), contentW * 0.58);
        const h = Math.max(6.5, valueLines.length * 4.15 + 2.3);
        ensure(h);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(PDF_CYAN[0], PDF_CYAN[1], PDF_CYAN[2]);
        doc.text(label, margin + 2.2, state.y + 4.4);
        const linkUrl = row.url || "";
        doc.setTextColor(linkUrl ? PDF_CYAN[0] : 30, linkUrl ? PDF_CYAN[1] : 30, linkUrl ? PDF_CYAN[2] : 30);
        doc.text(valueLines, margin + contentW - 2.2, state.y + 4.4, { align: "right" });
        const labelW = doc.getTextWidth(label);
        const valueW = Math.max.apply(null, valueLines.map((line) => doc.getTextWidth(line)).concat(0));
        const x1 = margin + 2.2 + labelW + 1.6;
        const x2 = margin + contentW - 2.2 - valueW - 1.6;
        if (x2 > x1 + 3) {
          doc.setDrawColor(186, 186, 186);
          doc.setLineWidth(0.15);
          doc.setLineDashPattern([0.25, 0.7], 0);
          doc.line(x1, state.y + 4.7, x2, state.y + 4.7);
          doc.setLineDashPattern([], 0);
        }
        if (linkUrl) {
          doc.link(margin + contentW - 2.2 - valueW, state.y + 1.2, valueW, Math.max(4, h - 2), { url: linkUrl });
        }
        state.y += h;
      });
      state.y += 5;
    }

    function paintFooters() {
      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        const y = pageH - 24;
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.25);
        [72, 124, 170].forEach((x) => doc.line(x, y, x, y + 14));
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(110, 110, 110);
        doc.text("Una marca de:", margin, y + 3.5);
        if (coresaLogo) {
          const logoW = 20;
          const logoH = logoW * (coresaLogo.h / coresaLogo.w);
          const logoX = margin;
          const logoY = y + 5.2;
          try {
            doc.addImage(coresaLogo.data, "PNG", logoX, logoY, logoW, logoH);
            doc.link(logoX, logoY, logoW, logoH, { url: CORESA_WEB_URL });
          } catch (e) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(35, 35, 35);
            doc.textWithLink("CORESA", margin, y + 10, { url: CORESA_WEB_URL });
          }
        } else {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(35, 35, 35);
          doc.textWithLink("CORESA", margin, y + 10, { url: CORESA_WEB_URL });
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(35, 35, 35);
        doc.textWithLink("Contacto", 78, y + 5, { url: PDF_CONTACTO_URL });
        doc.setFont("helvetica", "normal");
        doc.setTextColor(110, 110, 110);
        doc.textWithLink("macroled.com.ar/contacto", 78, y + 10, { url: PDF_CONTACTO_URL });
        doc.setFont("helvetica", "bold");
        doc.setTextColor(35, 35, 35);
        doc.text("Web", 130, y + 5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(110, 110, 110);
        doc.text("www.macroled.com.ar", 130, y + 10);
        try {
          drawPdfQr(doc, data.webUrl, pageW - margin - 16, y - 2, 16);
        } catch (e) {
          /* Sin QR la ficha igual se descarga. */
        }
      }
    }

    paintCover();
    doc.addPage();
    paintContentHeader();
    if (image) {
      placePdfImage(doc, image, (pageW - 78) / 2, state.y, 78, 62);
      state.y += 68;
    }
    data.groups.forEach((group) => drawSpecTable(group.title, group.rows));
    if (data.commercial.length) drawSpecTable("Información comercial", data.commercial);
    if (data.links.length) drawSpecTable("Enlaces", data.links);
    paintFooters();

    const fileName = pdfFileName(data.sku, "ficha");
    doc.setProperties({
      title: fileName.replace(/\.pdf$/i, ""),
      creator: "MACROLED",
    });
    deliverGeneratedPdf(doc.output("blob"), fileName, preview);
  }

  const WARRANTY_NUMBERS = ["", "Un", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve", "Diez", "Once", "Doce"];

  function formatWarrantyTerm(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";
    const match = value.match(/(\d+)\s*(años|año|meses|mes)/i);
    if (!match) return value.replace(/\s+a partir de la fecha de compra\.?$/i, "");
    const count = parseInt(match[1], 10);
    const word = WARRANTY_NUMBERS[count] || String(count);
    const unit = /mes/i.test(match[2]) ? (count === 1 ? "mes" : "meses") : count === 1 ? "año" : "años";
    return word + " (" + count + ") " + unit;
  }

  function currentWarrantyTerm() {
    const row = document.querySelector('#commercialTable [data-spec-key="Garantía"]');
    if (row && !row.hidden) {
      const shown = (row.querySelector("[data-spec-val]")?.textContent || "").trim();
      if (hasSpecValue(shown)) return shown;
    }
    const ctx = window.__mlProductCtx;
    if (ctx && hasSpecValue(ctx.warranty)) return String(ctx.warranty).trim();
    if (heroItem) {
      const fromSpecs = parseSpecs(heroItem)["Garantía"];
      if (hasSpecValue(fromSpecs)) return String(fromSpecs).trim();
    }
    return "";
  }

  function fichaAssetUrl(fileName) {
    const scripts = document.querySelectorAll("script[src]");
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src || "";
      if (/(?:^|\/)script\.js(?:\?|$)/.test(src)) return new URL(fileName, src).href;
    }
    return new URL(fileName, window.location.href).href;
  }

  function loadScriptOnce(src, marker, ready) {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-ml-lib='" + marker + "']");
      const done = () => (ready() ? resolve() : reject(new Error(marker)));
      if (existing) {
        existing.addEventListener("load", done, { once: true });
        existing.addEventListener("error", () => reject(new Error(marker)), { once: true });
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.dataset.mlLib = marker;
      s.onload = done;
      s.onerror = () => reject(new Error(marker));
      document.head.appendChild(s);
    });
  }

  function loadPdfLib() {
    return Promise.all([
      loadScriptOnce(
        "https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js",
        "fontkit",
        () => window.fontkit
      ),
      loadScriptOnce(
        "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",
        "pdflib",
        () => window.PDFLib
      ),
    ]).then(() => window.PDFLib);
  }

  async function downloadWarrantySheet(preview) {
    const sku = (document.getElementById("ficha-sku")?.textContent || (heroItem && heroItem.getAttribute("data-sku")) || "").trim();
    const term = formatWarrantyTerm(currentWarrantyTerm());
    const plazoRest = term
      ? term + " a partir de la fecha de compra."
      : "según las condiciones de la ficha del producto.";
    const PDFLib = await loadPdfLib();
    const [template, fontBytes] = await Promise.all([
      fetch(fichaAssetUrl("garantia-base.pdf")).then((res) => {
        if (!res.ok) throw new Error("garantia-base");
        return res.arrayBuffer();
      }),
      fetch(fichaAssetUrl("OpenSans-Regular.ttf")).then((res) => {
        if (!res.ok) throw new Error("opensans");
        return res.arrayBuffer();
      }),
    ]);
    const pdfDoc = await PDFLib.PDFDocument.load(template);
    pdfDoc.registerFontkit(window.fontkit);
    const page = pdfDoc.getPages()[0];
    const font = await pdfDoc.embedFont(fontBytes);
    const white = PDFLib.rgb(1, 1, 1);
    const ink = PDFLib.rgb(0, 0, 0);
    page.drawRectangle({ x: 129.2, y: 680.2, width: 360, height: 12, color: white });
    page.drawText(pdfSafe(sku || "-"), { x: 130.15, y: 682.96, size: 10, font, color: ink });
    page.drawRectangle({ x: 128.6, y: 606.2, width: 400, height: 13, color: white });
    page.drawText(pdfSafe(plazoRest), { x: 129.5, y: 610.45, size: 9.5, font, color: ink });
    const fileName = pdfFileName(sku, "garantia");
    pdfDoc.setTitle(fileName.replace(/\.pdf$/i, ""));
    const bytes = await pdfDoc.save();
    deliverGeneratedPdf(new Blob([bytes], { type: "application/pdf" }), fileName, preview);
  }

  let pdfBusy = false;

  function setPdfTriggerBusy(trigger, busy) {
    if (!trigger) return;
    if (busy) {
      trigger.setAttribute("aria-busy", "true");
      if (trigger.id === "dl-ficha" || trigger.id === "dl-garantia") {
        const label = trigger.querySelector(".dl-card__btn");
        if (label) {
          label.dataset.prevLabel = label.textContent;
          label.textContent = "Generando…";
        }
      } else {
        setDownloadBtnLabel(trigger, "Generando…");
      }
      return;
    }
    trigger.removeAttribute("aria-busy");
    if (trigger.id === "dl-ficha" || trigger.id === "dl-garantia") {
      const label = trigger.querySelector(".dl-card__btn");
      if (label) label.textContent = "Descargar";
    } else if (trigger.dataset.generatePdf === "1") {
      setDownloadBtnLabel(trigger, "Descargar ficha técnica");
    }
  }

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("#btn-ficha[data-generate-pdf], #dl-ficha, #dl-garantia");
    if (!trigger || trigger.hidden) return;
    e.preventDefault();
    if (pdfBusy) return;
    pdfBusy = true;
    const preview = window.open("", "_blank");
    if (preview) {
      try {
        const openingWarranty = trigger.id === "dl-garantia";
        preview.document.write(
          "<!DOCTYPE html><title>" +
            (openingWarranty ? "Garantía" : "Ficha técnica") +
            "</title><p style=\"font-family:sans-serif;padding:24px;color:#141821\">Generando " +
            (openingWarranty ? "garantía" : "ficha") +
            "…</p>"
        );
        preview.document.close();
      } catch (err) {}
    }
    setPdfTriggerBusy(trigger, true);
    const job = trigger.id === "dl-garantia" ? downloadWarrantySheet(preview) : downloadTechnicalSheet(preview);
    job
      .catch((err) => {
        console.error("[ficha-pdf]", err);
        if (preview && !preview.closed) preview.close();
      })
      .finally(() => {
        pdfBusy = false;
        setPdfTriggerBusy(trigger, false);
      });
  });

  let heroItem = null;
  let siblings = [];
  let dimensionKeys = [];
  let dimensionLabels = {};
  /* Video "de familia": la mayoría de las variantes (color/tamaño) no cargan
     su propio campo Video en el CMS — solo el SKU elegido como hero lo tiene.
     Se guarda acá para no perder el video al cambiar de variante. */
  let sharedVideoSrc = [];
  let sharedVideoPoster = "";

  /**
   * Las hermanas salen de la Collection List atada a Variantes_Multireference:
   * todo lo que esa lista renderiza ES una variante del producto actual, así que
   * alcanza con marcarlas con data-variant-item. El campo de texto
   * data-variantes-sku queda solo como fallback para el mock local.
   */
  function collectSiblings(current) {
    const currentSku = (current.getAttribute("data-sku") || "").trim();
    const bySku = new Map();
    const push = (el) => {
      const sku = (el.getAttribute("data-sku") || "").trim();
      if (!sku || bySku.has(sku)) return;
      bySku.set(sku, el);
    };

    /* El héroe primero: si el multi-reference se incluye a sí mismo, gana el embed
       del héroe, que es el que trae la ficha completa. */
    const dbMode = current.getAttribute("data-source") === "typesense";
    const accept = (el) => !dbMode || el.getAttribute("data-source") === "typesense";

    push(current);
    document.querySelectorAll(".cms-product-item[data-variant-item]").forEach((el) => {
      if (accept(el)) push(el);
    });

    if (bySku.size <= 1) {
      const wanted = new Set(parseList(current.getAttribute("data-variantes-sku")));
      document.querySelectorAll(".cms-product-item").forEach((el) => {
        if (!accept(el)) return;
        const sku = (el.getAttribute("data-sku") || "").trim();
        if (wanted.has(sku) || parseList(el.getAttribute("data-variantes-sku")).indexOf(currentSku) !== -1) {
          push(el);
        }
      });
    }

    return Array.from(bySku.values());
  }

  function specValues(sibs, key) {
    const values = new Set();
    sibs.forEach((el) => {
      const value = (parseSpecs(el)[key] || "").trim();
      if (value) values.add(value);
    });
    return values;
  }

  function allSpecKeys(sibs) {
    const keys = new Set();
    sibs.forEach((el) => Object.keys(parseSpecs(el)).forEach((key) => keys.add(key)));
    return Array.from(keys);
  }

  /**
   * Devuelve la clave de spec que diferencia a las variantes, o [] si ninguna lo
   * hace (en ese caso los chips se etiquetan por nombre/SKU).
   */
  /* Resuelve un término declarado (ej. "temperatura", "Ángulo de apertura") a la
     clave de spec real que efectivamente difiere entre hermanas, o null si no matchea. */
  function resolveOneDeclared(term, sibs, differs) {
    const declared = normKey(term);
    if (!declared) return null;
    const candidates = (DIM_LABEL_CANDIDATES[declared] || []).concat(
      allSpecKeys(sibs).filter((key) => normKey(key) === declared)
    );
    return candidates.find(differs) || null;
  }

  function resolveDimensions(current, sibs) {
    const differs = (key) => !NON_DIM_KEYS.has(key) && specValues(sibs, key).size > 1;
    dimensionLabels = {};
    const seen = new Set();
    const auto = [];
    DIM_AUTODETECT_PRIORITY.forEach((key) => {
      if (!differs(key) || seen.has(normKey(key))) return;
      if (valueIsDeterminedBy(key, auto, sibs)) return;
      seen.add(normKey(key));
      auto.push(key);
    });
    return auto;
  }

  function valueIsDeterminedBy(key, priorKeys, sibs) {
    if (!priorKeys.length) return false;
    const groups = new Map();
    sibs.forEach((el) => {
      const specs = parseSpecs(el);
      const sig = priorKeys.map((k) => (specs[k] || "").trim()).join("\u0001");
      const value = (specs[key] || "").trim();
      if (!groups.has(sig)) groups.set(sig, new Set());
      groups.get(sig).add(value);
    });
    return [...groups.values()].every((set) => set.size <= 1);
  }

  const CHIP_LABELS = {
    "Color del cuerpo": "Color",
    "Temperatura del color": "Temperatura",
    "Ángulo de apertura": "Ángulo",
    "Protección IP": "IP",
  };

  function renderChipGroup(label, groupName, entries, activeValue, inputClass) {
    const radioClass = inputClass ? inputClass + " variant-chip-radio" : "variant-chip-radio";
    let html =
      `<div class="variant-group"><span class="variant-label">${escapeHtml(label)}</span>` +
      `<div class="variant-chips" role="radiogroup" aria-label="${escapeHtml(label)}">`;
    entries.forEach((entry) => {
      const isActive = entry.value === activeValue;
      const isUnavailable = !!entry.unavailable && !isActive;
      const inputId = groupName + "--" + slugify(entry.value);
      const swatch = entry.swatch
        ? `<span class="variant-swatch" style="background:${entry.swatch}" aria-hidden="true"></span>`
        : "";
      const chipClass =
        "variant-chip" + (isActive ? " active" : "") + (isUnavailable ? " is-unavailable" : "");
      html +=
        `<label for="${inputId}" class="${chipClass}"` +
        (isUnavailable
          ? ` title="${escapeHtml(entry.value)}: no disponible en esta combinación"`
          : "") +
        `>` +
        `<input type="radio" class="${radioClass}" id="${inputId}" name="${groupName}"` +
        ` data-dim="${escapeHtml(entry.dim || "")}" data-val="${escapeHtml(entry.value)}"` +
        (entry.sku ? ` data-sku="${escapeHtml(entry.sku)}"` : "") +
        (isActive ? " checked" : "") +
        `>` +
        swatch +
        escapeHtml(entry.value) +
        `</label>`;
    });
    return html + "</div></div>";
  }

  /* "PAR16-AL-6.5W-DIM-12D-WW" → "12D-WW": se recorta el tramo que comparten todos. */
  function stripCommonSkuPrefix(skus) {
    if (skus.length < 2) return skus.slice();
    const parts = skus.map((sku) => sku.split("-"));
    const min = Math.min(...parts.map((p) => p.length));
    let common = 0;
    while (common < min - 1 && parts.every((p) => p[common] === parts[0][common])) common += 1;
    const short = parts.map((p) => p.slice(common).join("-"));
    return new Set(short).size === skus.length ? short : skus.slice();
  }

  /* Sin spec que las distinga, se etiqueta por nombre; si los nombres se repiten, por SKU. */
  function fallbackChipEntries(sibs) {
    const skus = sibs.map((el) => (el.getAttribute("data-sku") || "").trim());
    const names = sibs.map((el) => (el.getAttribute("data-name") || "").trim());
    const useName = new Set(names.filter(Boolean)).size === sibs.length;
    const shortSkus = stripCommonSkuPrefix(skus);
    return sibs
      .map((el, i) => ({
        sku: skus[i],
        value: (useName ? names[i] : shortSkus[i]) || skus[i],
        swatch: "",
      }))
      .sort((a, b) => variantSort(a.value, b.value));
  }

  /**
   * Disponibilidad en cascada: Potencia va primera y no se tacha. Un valor de un
   * eje posterior (ángulo, color, temperatura) se tacha si ninguna hermana lo
   * combina con la potencia y los ejes anteriores ya elegidos. Ejemplo: en 200W
   * el ángulo 60° queda tachado porque esa potencia no lo tiene.
   */
  function isCombinationAvailable(currentSpecs, key, value) {
    const idx = dimensionKeys.indexOf(key);
    const priorKeys = idx > 0 ? dimensionKeys.slice(0, idx) : [];
    return siblings.some((el) => {
      const specs = parseSpecs(el);
      if ((specs[key] || "").trim() !== value) return false;
      return priorKeys.every((k) => (specs[k] || "").trim() === (currentSpecs[k] || "").trim());
    });
  }

  function buildChipsHtml() {
    if (!variantsTarget || !heroItem) return "";
    const currentSpecs = parseSpecs(heroItem);
    let html = "";

    const heroSku = heroItem ? (heroItem.getAttribute("data-sku") || "").trim() : "";
    const focusRack = isFocusRackSku(heroSku);

    if (dimensionKeys.length) {
      dimensionKeys.forEach((key) => {
        if (focusRack && normalizeSpecKey(key) === "Ángulo de apertura") return;
        /* "Temperatura del color" contiene "color", así que se chequea primero. */
        const isTempDim = TEMP_SPEC_KEYS.has(key);
        const isBodyColorDim = !isTempDim && normKey(key).indexOf("color") !== -1;
        const values = [...specValues(siblings, key)].sort(isTempDim ? tempSort : variantSort);
        if (values.length <= 1) return;
        const swatchFor = (value) => {
          if (isTempDim) return TEMP_SWATCH[tempCategory(value)] || "";
          if (isBodyColorDim) return COLOR_SWATCH[normKey(value)] || "";
          return "";
        };
        html += renderChipGroup(
          dimensionLabels[normKey(key)] || CHIP_LABELS[key] || key,
          "variant-" + slugify(key),
          values.map((value) => ({
            value,
            dim: key,
            swatch: swatchFor(value),
            unavailable:
              dimensionKeys.length > 1 && !isCombinationAvailable(currentSpecs, key, value),
          })),
          (currentSpecs[key] || "").trim()
        );
      });
    } else if (siblings.length > 1) {
      const declared = (heroItem.getAttribute("data-nombre-attr-variantes") || "").trim();
      const heroSku = (heroItem.getAttribute("data-sku") || "").trim();
      const entries = fallbackChipEntries(siblings);
      const active = entries.find((entry) => entry.sku === heroSku);
      html += renderChipGroup(
        declared || "Variante",
        "variant-fallback",
        entries,
        active ? active.value : ""
      );
    }

    if (focusRack) {
      html += renderChipGroup(
        "Ángulo",
        "focus-angulo",
        FOCUS_ANGLES.map((value) => ({ value: value })),
        focusAngleFor(heroSku),
        "focus-angle-radio"
      );
    }

    variantsTarget.hidden = !html;
    variantsTarget.style.display = html ? "flex" : "none";
    return html;
  }

  function findMatchForInput(input) {
    const sku = (input.getAttribute("data-sku") || "").trim();
    if (sku) {
      return siblings.find((el) => (el.getAttribute("data-sku") || "").trim() === sku) || null;
    }
    return findBestMatch(input.getAttribute("data-dim"), input.getAttribute("data-val"));
  }

  function findBestMatch(desiredKey, desiredVal) {
    const currentSpecs = parseSpecs(heroItem);
    const candidates = siblings.filter(
      (el) => (parseSpecs(el)[desiredKey] || "").trim() === desiredVal
    );
    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];

    let best = candidates[0];
    let bestScore = -1;
    candidates.forEach((el) => {
      const specs = parseSpecs(el);
      let score = 0;
      dimensionKeys.forEach((k) => {
        if (k !== desiredKey && (specs[k] || "").trim() === (currentSpecs[k] || "").trim()) score++;
      });
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    });
    return best;
  }

  /* El campo "Familia" del CMS (ej. "Galponeras Standard") es más fino que
     el facet "familia" que filtra /nuevo-productos (ej. "Galponeras") — son
     taxonomías distintas. Linkear con el valor del CMS deja el filtro sin
     resultados. Se resuelve el valor real contra Typesense por SKU. */
  const TS_HOST = "https://typesense.coresagroup.com";
  const TS_API_KEY = "wpbpJ1lMSHi0ZZlB9CHY1fktyn2LqzLJ";
  const TS_COLLECTION = "macroled";
  const familiaCache = Object.create(null);

  async function fetchLiveFamilia(sku) {
    if (!sku) return null;
    if (familiaCache[sku] !== undefined) return familiaCache[sku];
    try {
      const params = new URLSearchParams({
        q: "*",
        query_by: "sku",
        filter_by: `sku:=${JSON.stringify(sku)}`,
        include_fields: "familia,macrofamilia",
        per_page: "1",
      });
      const res = await fetch(
        `${TS_HOST}/collections/${encodeURIComponent(TS_COLLECTION)}/documents/search?${params}`,
        { headers: { "X-TYPESENSE-API-KEY": TS_API_KEY } }
      );
      if (!res.ok) throw new Error(`Typesense ${res.status}`);
      const data = await res.json();
      const doc = (data.hits || [])[0] && data.hits[0].document;
      const result = doc && doc.familia ? { familia: doc.familia, macrofamilia: doc.macrofamilia || "" } : null;
      familiaCache[sku] = result;
      return result;
    } catch (err) {
      console.warn("[crumb] no se pudo resolver la familia real desde Typesense", err);
      familiaCache[sku] = null;
      return null;
    }
  }

  function setCrumbFamilyLink(macro, family) {
    const familyLink = document.getElementById("crumb-family");
    if (!familyLink) return;
    const params = new URLSearchParams();
    if (macro) params.set("macrofamilia", macro);
    if (family) params.set("familia", family);
    if ([...params].length) {
      familyLink.setAttribute("href", "/productos?" + params.toString());
    } else {
      familyLink.removeAttribute("href");
    }
  }

  function applyCrumbFamily(sku, macro, family) {
    // Fallback inmediato con lo que ya tenemos del CMS, mientras se resuelve
    // el valor real (evita que el breadcrumb quede vacío mientras carga).
    setText("#crumb-family", family);
    setCrumbFamilyLink(macro, family);
    fetchLiveFamilia(sku).then((live) => {
      if (!live) return;
      setText("#crumb-family", live.familia);
      setCrumbFamilyLink(live.macrofamilia || macro, live.familia);
    });
  }

  function applyProduct(el, opts) {
    opts = opts || {};
    dbSpecRows = readDbSpecRows(el);
    const specs = parseSpecs(el);
    const sku = (el.getAttribute("data-sku") || "").trim();
    const name = (el.getAttribute("data-name") || "").trim();
    const link = (el.getAttribute("data-product-url") || el.getAttribute("data-link") || "").trim();
    const ean13 = (el.getAttribute("data-ean13") || "").trim();
    const multiimage = parseList(el.getAttribute("data-multiimage"));
    const image = (el.getAttribute("data-image") || "").trim();
    const videoRaw =
      el.getAttribute("data-video") ||
      el.getAttribute("data-videos") ||
      "";
    let videos = parseList(videoRaw);
    let videoPoster = resolveVideoPoster(el, videos, image);
    if (!videos.length && sharedVideoSrc.length) {
      videos = sharedVideoSrc.slice();
      videoPoster = sharedVideoPoster || videoPoster;
    }
    const description = (el.getAttribute("data-descripcion") || "").trim();
    const family = (el.getAttribute("data-family") || "").trim();
    const macro = (el.getAttribute("data-macrofamilia") || "").trim();
    const fichaUrl = (el.getAttribute("data-ficha") || "").trim();
    const garantiaUrl = (el.getAttribute("data-garantia") || "").trim();
    const catalogoUrl = (el.getAttribute("data-catalogo") || "").trim();
    const manualUrl = (el.getAttribute("data-manual") || "").trim();
    const iesUrl = (el.getAttribute("data-ies") || "").trim();

    setText("#ficha-name", name);
    setText(".info h1", name);
    setText("#crumb-name", name);
    setText("#ficha-sku", sku);
    setText("#ficha-ean", ean13);
    const eanEl = document.getElementById("ficha-ean");
    const eanWrap = eanEl && eanEl.closest("span");
    if (eanWrap) {
      eanWrap.hidden = !ean13;
      const dot = eanWrap.previousElementSibling;
      if (dot && dot.classList.contains("dot")) dot.hidden = !ean13;
    }
    setText("#ficha-lead", description);
    if (macro || family) {
      setText("#ficha-eyebrow", [macro, family].filter(Boolean).join(" · "));
    }
    applyCrumbFamily(sku, macro, family);
    setText("#aiProductName", name);
    setText("#aiProductMeta", `SKU ${sku}${macro ? " · " + macro : ""}`);

    document.title = `${name} — MACROLED`;

    const images = multiimage.length ? multiimage.slice() : image ? [image] : [];
    const media = [];
    images.forEach((u) => {
      if (u && !media.includes(u)) media.push(u);
    });
    videos.forEach((v) => {
      if (v && !media.includes(v)) media.push(v);
    });
    setGallery(media, name, { poster: videoPoster });
    if (videos.length && !GALLERY.some((g) => isVideoType(g.type))) {
      console.warn("[galeria] data-video presente pero no entró a la galería", videos);
    }

    const nuevoRaw = (el.getAttribute("data-nuevo") || "").trim().toLowerCase();
    const isNuevo = ["true", "1", "si", "sí", "yes"].includes(nuevoRaw);
    const stageBadge = document.getElementById("stage-badge");
    if (stageBadge) {
      stageBadge.textContent = "Nuevo";
      stageBadge.hidden = !isNuevo;
    }

    // Sincronizar smart-badge
    const smartBadgeEl = document.getElementById("smart-badge");
    if (smartBadgeEl) {
      smartBadgeEl.hidden = !isSmartProduct(el, specs);
    }

    syncActionDownloads(fichaUrl, catalogoUrl, manualUrl);
    syncFileCards({
      ficha: fichaUrl,
      garantia: garantiaUrl,
      manual: manualUrl,
      catalogo: catalogoUrl,
      ies: iesUrl,
    });

    if (isFocusRackSku(sku)) specs["Ángulo de apertura"] = focusAngleFor(sku);
    lastSpecExtra = {
      SKU: sku,
      EAN13: ean13,
      Familia: family,
      Macrofamilia: macro,
    };
    updateSpecVals(specs, lastSpecExtra);

    const ipVal = (specs["Protección IP"] || "").trim();
    const ikVal = (specs["Protección IK"] || "").trim();
    const trustIp = document.querySelector("[data-trust-ip]");
    const trustIk = document.querySelector("[data-trust-ik]");
    if (trustIp) {
      trustIp.textContent = ipVal;
      trustIp.hidden = !ipVal;
    }
    if (trustIk) {
      trustIk.textContent = ikVal;
      trustIk.hidden = !ikVal;
    }
    setTrustEligible("ip-ik", !!(ipVal || ikVal));

    const garVal = (specs["Garantía"] || "").trim();
    const trustGarEl = document.querySelector("[data-trust-garantia]");
    if (trustGarEl) trustGarEl.textContent = garVal;
    setTrustEligible("garantia", !!garVal);

    /* Sellos fijos de marca: certificado siempre; eficiencia solo si hay datos lumínicos */
    setTrustEligible("certificado", true);
    setTrustEligible("ahorro", hasLuminousSpecs(specs));

    const potVal = (specs["Potencia"] || "").trim();
    const tenVal = (specs["Tensión"] || "").trim();

    const criVal = (specs["CRI"] || "").trim();
    const trustCriEl = document.querySelector("[data-trust-cri]");
    if (trustCriEl) trustCriEl.textContent = criVal;
    setTrustEligible("cri", !!criVal);

    const dimVal = specs["Dimerizable"];
    setTrustEligible("dimerizable", isTruthyFlag(dimVal));

    const smartRaw =
      specs["Smart"] || specs["Tecnología"] || el.getAttribute("data-smart");
    setTrustEligible("smart", isTruthyFlag(smartRaw));

    const panelRaw = specs["Panel táctil"] || el.getAttribute("data-panel-tactil");
    setTrustEligible("panel-tactil", hasSpecValue(panelRaw) && !/^(no|false|0)$/i.test(String(panelRaw).trim()));

    const remoteRaw = specs["Control remoto"] || el.getAttribute("data-control-remoto");
    setTrustEligible(
      "control-remoto",
      hasSpecValue(remoteRaw) && !/^(no|false|0)$/i.test(String(remoteRaw).trim())
    );

    const angVal = (specs["Ángulo de apertura"] || "").trim();
    const trustAngEl = document.querySelector("[data-trust-angulo]");
    if (trustAngEl) trustAngEl.textContent = angVal;
    setTrustEligible("angulo", !!angVal);

    const matVal = (
      specs["Material del cuerpo"] ||
      specs["Material"] ||
      specs["Material de tapa"] ||
      ""
    ).trim();
    const trustMatEl = document.querySelector("[data-trust-material]");
    if (trustMatEl) trustMatEl.textContent = matVal;
    setTrustEligible("material", !!matVal);

    syncTrustPriority();
    syncSmartBanner(el, specs);

    const PRODUCT_CTX = window.__mlProductCtx || (window.__mlProductCtx = {});
    PRODUCT_CTX.name = name;
    PRODUCT_CTX.sku = sku;
    PRODUCT_CTX.power = potVal;
    PRODUCT_CTX.voltage = tenVal;
    PRODUCT_CTX.warranty = garVal;
    PRODUCT_CTX.ficha = fichaUrl;
    PRODUCT_CTX.manual = manualUrl || garantiaUrl;
    /* Contexto del producto activo para el asistente (SKU que se manda a n8n). */
    PRODUCT_CTX.specs = Object.assign({}, specs, {
      SKU: sku,
      EAN13: ean13,
      Familia: family,
      Macrofamilia: macro,
    });
    PRODUCT_CTX.ean13 = ean13;
    PRODUCT_CTX.family = family;
    PRODUCT_CTX.macro = macro;
    PRODUCT_CTX.description = description;
    PRODUCT_CTX.contactoUrl = CONTACTO_URL;

    if (typeof assistant !== "undefined" && assistant && typeof assistant.renderSuggestions === "function") {
      assistant.renderSuggestions();
    }

    heroItem = el;
    if (variantsTarget) variantsTarget.innerHTML = buildChipsHtml();
    refreshOpenAccordions();

    if (!opts.skipHistory && link && link !== "#") {
      const path = link.startsWith("/") ? link : "/" + link;
      if (window.location.pathname !== path) {
        /* replaceState (no pushState): cambiar de variante no debe apilar
           entradas de historial — si no, "atrás" recorre cada variante
           visitada en vez de volver directo a /productos. */
        window.history.replaceState({ sku }, "", path);
      }
    }

    window.dispatchEvent(new CustomEvent("ml-product-changed", { detail: { sku } }));
  }

  /**
   * El embed del héroe y los de la Collection List de variantes se montan en
   * cualquier orden, así que no alcanza con tomar el primero del DOM.
   */
  function pickHeroItem() {
    const fromDb = document.querySelectorAll(".cms-product-item[data-source='typesense']");
    const all = Array.prototype.slice.call(fromDb.length ? fromDb : document.querySelectorAll(".cms-product-item"));
    if (!all.length) return null;

    const explicit = all.find((el) => el.hasAttribute("data-hero"));
    if (explicit) return explicit;

    const nonVariant = all.filter((el) => !el.hasAttribute("data-variant-item"));
    if (nonVariant.length === 1) return nonVariant[0];

    const initialSku = (document.getElementById("ficha-sku")?.textContent || "").trim();
    const bySku = (list) => list.find((el) => (el.getAttribute("data-sku") || "").trim() === initialSku);
    return (initialSku && (bySku(nonVariant) || bySku(all))) || nonVariant[0] || all[0];
  }

  let variantsBound = false;
  let lastVariantSignature = "";
  let userPickedVariant = false;

  function initVariants() {
    if (!variantsTarget) return;

    heroItem = pickHeroItem();
    if (!heroItem) {
      variantsTarget.hidden = true;
      console.warn("[variantes] no hay ningún .cms-product-item en el DOM.");
      return;
    }

    siblings = collectSiblings(heroItem);
    const signature = siblings.map((el) => (el.getAttribute("data-sku") || "").trim()).join("|");
    if (lastVariantSignature && signature === lastVariantSignature) return;
    lastVariantSignature = signature;

    sharedVideoSrc = [];
    sharedVideoPoster = "";
    const videoOwner =
      [heroItem, ...siblings].find(
        (el) => parseList(el.getAttribute("data-video") || el.getAttribute("data-videos") || "").length
      ) || null;
    if (videoOwner) {
      sharedVideoSrc = parseList(videoOwner.getAttribute("data-video") || videoOwner.getAttribute("data-videos") || "");
      sharedVideoPoster = resolveVideoPoster(videoOwner, sharedVideoSrc, videoOwner.getAttribute("data-image") || "");
    }

    siblings.forEach((el) => {
      const videos = parseList(
        el.getAttribute("data-videos") || el.getAttribute("data-video")
      );
      const poster = resolveVideoPoster(
        el,
        videos,
        el.getAttribute("data-image") || ""
      );
      const media = [
        ...parseList(el.getAttribute("data-multiimage")),
        ...videos,
      ];
      media.forEach((src) => {
        if (!src || detectMediaType(src) !== "image") return;
        const img = new Image();
        img.src = src;
      });
      if (poster) {
        const img = new Image();
        img.src = poster;
      }
    });

    dimensionKeys = resolveDimensions(heroItem, siblings);

    if (!variantsBound) {
      variantsBound = true;
      variantsTarget.addEventListener("change", (e) => {
        const input = e.target;
        if (!input || !input.classList) return;
        if (input.classList.contains("focus-angle-radio")) {
          commitFocusAngle(input.getAttribute("data-val") || "");
          return;
        }
        if (!input.classList.contains("variant-chip-radio")) return;
        const match = findMatchForInput(input);
        if (!match) return;
        userPickedVariant = true;
        applyProduct(match);
      });

      window.addEventListener("popstate", () => {
        if (!siblings || siblings.length <= 1) return;
        const slug = (location.pathname || "").replace(/^\//, "");
        const match =
          siblings.find((el) => {
            const link = (el.getAttribute("data-link") || el.getAttribute("data-product-url") || "").replace(/^\//, "");
            return link === slug;
          }) ||
          siblings.find((el) => (el.getAttribute("data-sku") || "") === (history.state && history.state.sku));
        if (match) applyProduct(match, { skipHistory: true });
      });
    }

    if (siblings.length <= 1) {
      variantsTarget.hidden = true;
      console.warn(
        "[variantes] solo se encontró el producto actual. Falta la Collection List atada a " +
          "Variantes_Multireference: cada item tiene que imprimir un .cms-product-item con data-variant-item. " +
          "Ver variantes-embed.html."
      );
      applyProduct(heroItem, { skipHistory: true });
      return;
    }

    applyProduct(heroItem, { skipHistory: true });
  }

  function commitFocusAngle(angle) {
    if (!FOCUS_ANGLES.includes(angle) || !heroItem) return;
    const sku = (heroItem.getAttribute("data-sku") || "").trim();
    if (!isFocusRackSku(sku)) return;
    const key = focusSkuKey(sku);
    focusAngleBySku[key] = angle;
    try {
      sessionStorage.setItem("ml_focus_angle_" + key, angle);
    } catch (_) {}
    const specs = parseSpecs(heroItem);
    specs["Ángulo de apertura"] = angle;
    updateSpecVals(specs, Object.assign({ SKU: sku }, lastSpecExtra));
    const trustAngEl = document.querySelector("[data-trust-angulo]");
    if (trustAngEl) {
      trustAngEl.textContent = angle;
      trustAngEl.hidden = !angle;
    }
    setTrustEligible("angulo", !!angle);
    syncTrustPriority();
    const ctx = window.__mlProductCtx;
    if (ctx && ctx.specs) ctx.specs["Ángulo de apertura"] = angle;
    if (variantsTarget) variantsTarget.innerHTML = buildChipsHtml();
    window.dispatchEvent(new CustomEvent("ml-focus-angle-changed", { detail: { sku: sku, angulo: angle } }));
  }

  window.MacroledFocusAngle = {
    isFocusSku: isFocusRackSku,
    get: function (sku) {
      return isFocusRackSku(sku) ? focusAngleFor(sku) : "";
    },
  };

  /* —— AI assistant —— */
  const CONTACTO_URL = "https://macroled.com.ar/contacto";

  const PRODUCT_CTX = skipFichaBoot
    ? window.__mlProductCtx || {}
    : (window.__mlProductCtx = {
    name: "Space Blanca",
    sku: "SPACE-B",
    voltage: "DC 5V",
    power: "1.6W",
    warranty: "1 año",
    ficha: "https://s3.coresagroup.com/MACROLED/DS/SPACE-B.pdf",
    manual: "https://s3.coresagroup.com/MACROLED/Garantias/SPACE-B.pdf",
    specs: {},
    contactoUrl: CONTACTO_URL,
  });


  /**
   * Mensaje de fallback de la Capa 2 (se lo pasamos al motor genérico como
   * "fallbackHtml"). Se usa SOLO cuando la IA no pudo responder por un
   * problema técnico (timeout, red caída, webhook no disponible todavía) —
   * no es un "no sé la respuesta". Por eso invita a revisar la ficha técnica
   * en vez de mandar directo a contacto: ese salto a contacto queda
   * reservado para precio/stock, o para lo que el propio agente decida
   * cuando esté conectado de verdad.
   */
  function noDataFallbackMsg() {
    const ctx = window.__mlProductCtx || PRODUCT_CTX;
    if (ctx.ficha) {
      return `No pude encontrar información sobre esa característica para este producto. Te recomendamos revisar la <a href="${ctx.ficha}" target="_blank" rel="noopener">ficha técnica (PDF)</a>, donde puede estar especificada con mayor detalle.`;
    }
    return `No pude encontrar información sobre esa característica para este producto.`;
  }

  /* —— Motor del asistente ——
     Mismo webhook y parseo que productos. Todas las preguntas van a la IA;
     el payload incluye el SKU de la ficha que el usuario está viendo. */
  const N8N_WEBHOOK_URL = "https://n8n.coresagroup.com/webhook/macroled-ia";
  const AI_TIMEOUT_MS = 12000;

  function newSessionId() {
    return window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : `sid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  window.MacroledSessionId = window.MacroledSessionId || newSessionId();

  function defaultFallbackHtml() {
    return "No pude encontrar información sobre esa consulta en este momento.";
  }

  function initAssistant(options) {
    options = options || {};
    const getPayload = typeof options.getPayload === "function" ? options.getPayload : (q) => ({ pregunta: q });
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
    const openFromCta = document.getElementById("openAssistantFromCta"); // opcional, solo en ficha

    if (!aiPanel || !aiForm || !aiMessages) {
      console.warn("[asistente] Faltan elementos del widget en el DOM de esta página — no se inicializa.");
      return null;
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
      // Doble rAF para que el browser pinte el estado cerrado antes de animar
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
        // El "Respond to Webhook" de n8n a veces envuelve el resultado en
        // un array de 1 item ([{ respuesta: "..." }]) y a veces manda el
        // objeto suelto ({ respuesta: "..." }) — aceptamos las dos formas.
        const item = Array.isArray(data) ? data[0] : data;
        if (item && item.resetSession) window.MacroledSessionId = newSessionId();
        const texto = item && (item.respuesta || item.output || item.answer);
        if (!texto) throw new Error("Respuesta vacía del agente");

        // El \n del agente -> <br> para que se vea bien en el chat
        return String(texto).replace(/\n/g, "<br>");
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn("[asistente] error consultando IA:", err);
        return fallbackHtml();
      }
    }

    /**
     * Todas las preguntas van al agente. El SKU de la ficha viaja en el payload.
     */
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

      const respuesta = await askAI(q);

      aiTyping.classList.remove("is-on");
      addMsg("bot", respuesta);
      renderSuggestions();
      aiForm.querySelector(".ai-send").disabled = false;
      aiBusy = false;
    }

    if (aiLaunch) aiLaunch.addEventListener("click", (e) => openAssistant(e.currentTarget));
    if (openFromCta) openFromCta.addEventListener("click", (e) => openAssistant(e.currentTarget));
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

  /* Webflow pisa button/label con width:100% / display:block; forzamos acá
     el layout en runtime. En mobile (≤640px) comparar y preguntá van
     apilados uno arriba del otro; de ahí para arriba, en la misma fila. */
  function hardenCtaUtility() {
    const row = document.querySelector(".cta-utility");
    if (!row) return;
    const stacked = window.matchMedia("(max-width:640px)").matches;
    row.style.setProperty("display", stacked ? "flex" : "grid", "important");
    row.style.setProperty("flex-direction", stacked ? "column" : "row", "important");
    row.style.setProperty("grid-template-columns", stacked ? "none" : "minmax(0,1fr) auto", "important");
    row.style.setProperty("align-items", stacked ? "flex-start" : "center", "important");
    row.style.setProperty("width", "100%", "important");
    row.style.setProperty("column-gap", stacked ? "0" : "12px", "important");
    row.style.setProperty("row-gap", stacked ? "6px" : "0", "important");
    const compare = row.querySelector(".compare-row");
    const ask = row.querySelector(".btn-ai");
    if (compare) {
      compare.style.setProperty("display", "inline-flex", "important");
      compare.style.setProperty("width", "auto", "important");
      compare.style.setProperty("justify-self", "start", "important");
      compare.style.setProperty("float", "none", "important");
    }
    if (ask) {
      ask.style.setProperty("display", "inline-flex", "important");
      ask.style.setProperty("width", "auto", "important");
      ask.style.setProperty("justify-self", stacked ? "auto" : "end", "important");
      ask.style.setProperty("margin", stacked ? "0 0 0 -8px" : "0", "important");
      ask.style.setProperty("border", "none", "important");
      ask.style.setProperty("background", "transparent", "important");
      ask.style.setProperty("white-space", "nowrap", "important");
      ask.style.setProperty("float", "none", "important");
    }
  }
  hardenCtaUtility();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hardenCtaUtility);
  }
  window.addEventListener("load", hardenCtaUtility);
  window.addEventListener("resize", hardenCtaUtility);

  function getFichaPayload(question) {
    const ctx = window.__mlProductCtx || PRODUCT_CTX || {};
    const skuFromDom = (document.getElementById("ficha-sku") || {}).textContent || "";
    return {
      pregunta: question,
      contexto: "ficha",
      sku: String(ctx.sku || skuFromDom).trim(),
      nombre: String(ctx.name || "").trim(),
    };
  }

  let assistant = null;
  if (!skipFichaBoot) assistant = initAssistant({
    greeting: `Hola, soy el asistente de <b>productos Macroled</b>. Preguntame por un producto, SKU o característica y te ayudo a encontrarlo.`,
    getPayload: getFichaPayload,
    fallbackHtml: noDataFallbackMsg,
  });

  /* —— Share —— */
  const shareBtn = document.getElementById("shareBtn");
  const shareMenu = document.getElementById("shareMenu");
  const shareSheet = document.getElementById("shareSheet");
  const shareSheetBackdrop = document.getElementById("shareSheetBackdrop");
  const shareSheetClose = document.getElementById("shareSheetClose");
  const shareSheetNative = document.getElementById("shareSheetNative");
  const shareToast = document.getElementById("shareToast");
  const shareNativeOpt = document.getElementById("shareNativeOpt");
  const canNativeShare = typeof navigator.share === "function";
  const mqShareMobile = window.matchMedia("(max-width: 640px)");
  let shareOpen = false;

  function sharePayload() {
    const sku = (document.getElementById("ficha-sku") || {}).textContent || "SPACE-B";
    const title = document.querySelector(".info h1")?.textContent?.trim() || "Producto Macroled";
    const url = location.href.split("#")[0];
    const text = `${title} (${sku.trim()}) — Macroled`;
    return { title, text, url };
  }

  function setShareLinks() {
    const { title, text, url } = sharePayload();
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
    const li = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    const mail = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
    document.querySelectorAll('[data-share="whatsapp"]').forEach((el) => {
      if (el.tagName === "A") el.href = wa;
    });
    document.querySelectorAll('[data-share="linkedin"]').forEach((el) => {
      if (el.tagName === "A") el.href = li;
    });
    document.querySelectorAll('[data-share="email"]').forEach((el) => {
      if (el.tagName === "A") el.href = mail;
    });
  }

  function isShareSheetOpen() {
    return !!(shareSheet && shareSheet.classList.contains("is-open"));
  }

  function openShareSheet() {
    if (!shareSheet) return;
    setShareLinks();
    if (canNativeShare && shareSheetNative) shareSheetNative.hidden = false;
    shareSheet.hidden = false;
    document.body.classList.add("share-sheet-open");
    requestAnimationFrame(() => {
      shareSheet.classList.add("is-open");
    });
    shareOpen = true;
    if (shareBtn) shareBtn.setAttribute("aria-expanded", "true");
    if (mobileShareBtn) mobileShareBtn.setAttribute("aria-expanded", "true");
  }

  function closeShareSheet() {
    if (!shareSheet) return;
    shareSheet.classList.remove("is-open");
    document.body.classList.remove("share-sheet-open");
    const finish = () => {
      if (!shareSheet.classList.contains("is-open")) shareSheet.hidden = true;
    };
    shareSheet.addEventListener("transitionend", finish, { once: true });
    setTimeout(finish, 360);
    shareOpen = false;
    if (shareBtn) shareBtn.setAttribute("aria-expanded", "false");
    if (mobileShareBtn) mobileShareBtn.setAttribute("aria-expanded", "false");
  }

  function openShareMenu() {
    setShareLinks();
    if (mqShareMobile.matches) {
      openShareSheet();
      return;
    }
    if (canNativeShare && shareNativeOpt) shareNativeOpt.hidden = false;
    if (shareMenu) shareMenu.hidden = false;
    shareOpen = true;
    if (shareBtn) shareBtn.setAttribute("aria-expanded", "true");
  }

  function closeShareMenu() {
    if (mqShareMobile.matches || isShareSheetOpen()) {
      closeShareSheet();
      return;
    }
    if (shareMenu) shareMenu.hidden = true;
    shareOpen = false;
    if (shareBtn) shareBtn.setAttribute("aria-expanded", "false");
    if (mobileShareBtn) mobileShareBtn.setAttribute("aria-expanded", "false");
  }

  function toggleShareFromStage() {
    if (isShareSheetOpen() || (shareOpen && mqShareMobile.matches)) {
      closeShareMenu();
      return;
    }
    openShareMenu();
  }
  window.__mlToggleShareFromStage = toggleShareFromStage;

  function showShareToast(msg) {
    shareToast.textContent = msg;
    shareToast.classList.add("is-on");
    clearTimeout(showShareToast._t);
    showShareToast._t = setTimeout(() => shareToast.classList.remove("is-on"), 2200);
  }

  async function copyShareLink() {
    const { url } = sharePayload();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    showShareToast("Link copiado");
  }

  async function nativeShare() {
    const p = sharePayload();
    try {
      await navigator.share({ title: p.title, text: p.text, url: p.url });
    } catch (err) {
      if (err && err.name !== "AbortError") copyShareLink();
    }
  }

  async function handleShareAction(e) {
    const opt = e.target.closest("[data-share]");
    if (!opt) return;
    const type = opt.getAttribute("data-share");
    if (type === "copy") {
      e.preventDefault();
      await copyShareLink();
      closeShareMenu();
    } else if (type === "native") {
      e.preventDefault();
      closeShareMenu();
      await nativeShare();
    } else {
      /* links externos: cerrar después del tap */
      closeShareMenu();
    }
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (shareOpen || isShareSheetOpen() || (shareMenu && !shareMenu.hidden)) closeShareMenu();
      else openShareMenu();
    });
  }
  if (shareMenu) shareMenu.addEventListener("click", handleShareAction);
  if (shareSheet) shareSheet.addEventListener("click", handleShareAction);
  if (shareSheetBackdrop) {
    shareSheetBackdrop.addEventListener("click", (e) => {
      e.preventDefault();
      closeShareMenu();
    });
  }
  if (shareSheetClose) {
    shareSheetClose.addEventListener("click", (e) => {
      e.preventDefault();
      closeShareMenu();
    });
  }
  document.addEventListener("click", (e) => {
    if (mqShareMobile.matches) return;
    if (!shareMenu || shareMenu.hidden) return;
    if (e.target.closest(".share-wrap")) return;
    if (e.target.closest(".share-menu")) return;
    closeShareMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && (shareOpen || isShareSheetOpen() || (shareMenu && !shareMenu.hidden))) {
      closeShareMenu();
    }
  });
  mqShareMobile.addEventListener?.("change", () => {
    if (!mqShareMobile.matches && isShareSheetOpen()) closeShareSheet();
    if (mqShareMobile.matches && shareMenu && !shareMenu.hidden) {
      shareMenu.hidden = true;
      openShareSheet();
    }
  });

  /* Scroll / entrance reveals */
  function initReveals() {
    const nodes = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));
    if (!nodes.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((el) => el.classList.add("is-in"));
      return;
    }
    if (!("IntersectionObserver" in window)) {
      nodes.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    nodes.forEach((el) => io.observe(el));
  }

  /**
   * En Webflow el Custom Code a veces corre ANTES del Embed CMS.
   * Esperamos a que exista .cms-product-item (o al DOM listo) y reintentamos.
   */
  /**
   * La Collection List de variantes puede montarse después del embed del héroe,
   * así que seguimos mirando si aparecen más .cms-product-item.
   */
  function watchForLateVariants() {
    const itemCount = () => {
      const db = document.querySelectorAll(".cms-product-item[data-source='typesense']");
      return (db.length ? db : document.querySelectorAll(".cms-product-item")).length;
    };
    let lastCount = itemCount();
    let checks = 0;
    const tick = () => {
      if (userPickedVariant) return;
      const count = itemCount();
      if (count !== lastCount) {
        lastCount = count;
        initVariants();
      }
      checks += 1;
      if (checks < 50) setTimeout(tick, 200); /* ~10s */
    };
    setTimeout(tick, 200);
  }

  /**
   * Hasta acá el nombre/SKU/EAN/specs visibles eran el placeholder estático
   * del HTML. initVariants() ya corrió (sync) y aplicó el producto real si
   * lo encontró, así que revelar ahora no deja ver el placeholder viejo.
   * Si el embed CMS nunca aparece, esto también se ejecuta (bootFicha corre
   * igual tras el timeout de waitForCmsAndBoot) para no dejar la ficha oculta.
   */
  function revealFicha() {
    const wrap = document.querySelector(".wrap.is-hydrating");
    if (wrap) wrap.classList.remove("is-hydrating");
    if (window.MacroledPreload) window.MacroledPreload.done();
  }

  function bootFicha() {
    hardenCtaUtility();
    initVariants();
    watchForLateVariants();
    initReveals();
    revealFicha();
  }

  function readDbSpecRows(el) {
    if (!el) return [];
    try {
      const raw = el.getAttribute("data-spec-groups");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function showFichaError(message) {
    const err = document.getElementById("fichaError");
    if (err) {
      err.hidden = false;
      err.textContent = message;
    }
    revealFicha();
  }

  function readInitialSku() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = (params.get("sku") || "").trim();
    if (fromQuery) return fromQuery;
    /* Text Block oculto de la plantilla CMS. El id tiene que ser ml-cms-sku:
       #ficha-sku vive dentro del embed y el script lo pisa al pintar el producto. */
    const fromCms = (document.getElementById("ml-cms-sku")?.textContent || "").trim();
    if (fromCms && !/^sku$/i.test(fromCms)) return fromCms;
    const fromText = (document.getElementById("ficha-sku")?.textContent || "").trim();
    if (fromText && !/^sku$/i.test(fromText)) return fromText;
    const hero =
      document.querySelector(".cms-product-item[data-hero][data-sku]") ||
      document.querySelector(".cms-product-item[data-sku]");
    return (hero && hero.getAttribute("data-sku") || "").trim();
  }

  function listField(value) {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return parseList(value);
  }

  function joinList(values) {
    return values.filter(Boolean).join(" ; ");
  }

  function firstText(doc, names) {
    for (let i = 0; i < names.length; i++) {
      const value = doc[names[i]];
      if (value == null) continue;
      const text = Array.isArray(value) ? joinList(listField(value)) : String(value).trim();
      if (text) return text;
    }
    return "";
  }

  function docFileValue(doc, names) {
    const wanted = new Set(names.map((name) => name.toLowerCase().replace(/[\s-]+/g, "_")));
    for (const key of Object.keys(doc || {})) {
      if (!wanted.has(key.toLowerCase().replace(/[\s-]+/g, "_"))) continue;
      const text = firstText({ value: doc[key] }, ["value"]);
      if (text) return text;
    }
    return "";
  }

  function productPath(doc) {
    const raw = String(doc.link_ficha_web || "").trim();
    if (raw) {
      try {
        const url = new URL(raw, "https://www.macroled.com.ar");
        if (url.pathname && url.pathname !== "/") return url.pathname;
      } catch (e) {}
    }
    const slug = String(doc.slug || "").trim();
    const cat = String(doc.categoria_slug || "").trim();
    if (cat && slug) return "/" + cat + "/" + slug;
    if (slug) return "/" + slug;
    return "";
  }

  function galleryImages(doc) {
    const raw = doc.multimagen != null ? doc.multimagen : doc.multiimage;
    const urls = [];
    listField(raw).forEach((url) => {
      if (url && urls.indexOf(url) === -1) urls.push(url);
    });
    return urls;
  }

  function specPayload(doc) {
    const rows = Array.isArray(doc.especificaciones) ? doc.especificaciones : [];
    const flat = {};
    const groups = [];
    rows.forEach((row) => {
      const nombre = String((row && row.nombre) || "").trim();
      const valor = row && row.valor != null ? String(row.valor).trim() : "";
      if (!nombre || !hasSpecValue(valor)) return;
      const key = normalizeSpecKey(nombre);
      if (!hasSpecValue(flat[key])) flat[key] = valor;
      groups.push({
        grupo: String((row && row.grupo) || "Especificaciones").trim() || "Especificaciones",
        nombre: nombre,
        valor: valor,
      });
    });
    return { flat: flat, groups: groups };
  }

  function setAttr(el, name, value) {
    const text = value == null ? "" : String(value).trim();
    if (text) el.setAttribute(name, text);
  }

  function docToItem(doc, isHero) {
    const el = document.createElement("div");
    el.className = "cms-product-item";
    el.setAttribute("data-source", "typesense");
    if (isHero) el.setAttribute("data-hero", "");
    else el.setAttribute("data-variant-item", "");

    const specs = specPayload(doc);
    const images = galleryImages(doc);
    const path = productPath(doc);
    const variantSkus = listField(doc.variantes_sku);

    setAttr(el, "data-sku", doc.sku);
    setAttr(el, "data-name", doc.nombre || doc.nombre_typesense);
    setAttr(el, "data-image", images[0] || doc.imagen);
    setAttr(el, "data-multiimage", joinList(images));
    setAttr(el, "data-video", firstText(doc, ["video", "videos"]));
    setAttr(el, "data-family", doc.familia);
    setAttr(el, "data-macrofamilia", doc.macrofamilia);
    setAttr(el, "data-subfamilia", doc.subfamilia);
    setAttr(el, "data-linea", doc.linea);
    setAttr(el, "data-nuevo", doc.nuevo === true || /^(true|1|si|sí|yes)$/i.test(String(doc.nuevo || "")) ? "true" : "");
    setAttr(el, "data-link", path);
    setAttr(el, "data-product-url", path);
    setAttr(el, "data-descripcion", doc.descripcion);
    setAttr(el, "data-ean13", doc.ean13);
    setAttr(el, "data-smart", doc.smart);
    setAttr(el, "data-variantes-sku", joinList(variantSkus));
    setAttr(el, "data-nombre-attr-variantes", doc.nombre_attr_variantes);
    setAttr(el, "data-attr-variantes", firstText(doc, ["atributos_variantes", "atributos_de_variantes"]));
    setAttr(el, "data-catalogo", firstText(doc, ["catalogo_link", "catalogo"]));
    setAttr(el, "data-manual", firstText(doc, ["manual", "manuales", "manual_link"]));
    setAttr(el, "data-ies", firstText(doc, ["ies", "ies_link"]));
    setAttr(el, "data-ficha", firstText(doc, ["ficha_tecnica"]));
    setAttr(el, "data-ficha-anterior", docFileValue(doc, ["ficha_tecnica_anterior", "ficha tecnica_anterior"]));
    setAttr(el, "data-garantia", firstText(doc, ["garantia_link"]));
    setAttr(el, "data-relacionados-armados", firstText(doc, ["productos_relacionados_armados", "relacionados_armados", "armados"]));
    setAttr(el, "data-relacionados-despiece", firstText(doc, ["productos_relacionados_despiece", "relacionados_despiece", "despiece"]));
    setAttr(el, "data-compatibles", firstText(doc, ["productos_compatibles", "compatibles"]));
    if (Object.keys(specs.flat).length) el.setAttribute("data-specs", JSON.stringify(specs.flat));
    if (specs.groups.length) el.setAttribute("data-spec-groups", JSON.stringify(specs.groups));
    return el;
  }

  async function fetchDocsBySku(skus) {
    const unique = [];
    skus.forEach((sku) => {
      const value = String(sku || "").trim();
      if (!value || unique.some((item) => item.toUpperCase() === value.toUpperCase())) return;
      unique.push(value);
    });
    if (!unique.length) return [];
    const inList = unique.map((sku) => `"${sku.replace(/"/g, '\\"')}"`).join(",");
    const params = new URLSearchParams({
      q: "*",
      query_by: "sku",
      filter_by: `sku:=[${inList}]`,
      per_page: String(Math.min(unique.length, 250)),
    });
    const res = await fetch(
      `${TS_HOST}/collections/${encodeURIComponent(TS_COLLECTION)}/documents/search?${params}`,
      { headers: { "X-TYPESENSE-API-KEY": TS_API_KEY } }
    );
    if (!res.ok) throw new Error("Typesense " + res.status);
    const data = await res.json();
    const docs = (data.hits || []).map((hit) => hit.document).filter(Boolean);
    docs.sort((a, b) => {
      const ai = unique.findIndex((sku) => sku.toUpperCase() === String(a.sku || "").toUpperCase());
      const bi = unique.findIndex((sku) => sku.toUpperCase() === String(b.sku || "").toUpperCase());
      return ai - bi;
    });
    return docs;
  }

  async function fetchDocsReferencingSku(sku) {
    const value = String(sku || "").trim();
    if (!value) return [];
    const params = new URLSearchParams({
      q: "*",
      query_by: "sku",
      filter_by: `variantes_sku:=${JSON.stringify(value)}`,
      per_page: "250",
    });
    const res = await fetch(
      `${TS_HOST}/collections/${encodeURIComponent(TS_COLLECTION)}/documents/search?${params}`,
      { headers: { "X-TYPESENSE-API-KEY": TS_API_KEY } }
    );
    if (!res.ok) throw new Error("Typesense " + res.status);
    const data = await res.json();
    return (data.hits || []).map((hit) => hit.document).filter(Boolean);
  }

  function mountProductItems(hero, variants) {
    document.querySelectorAll(".cms-product-item").forEach((el) => el.remove());
    let root = document.getElementById("cmsProductSource");
    if (!root) {
      root = document.createElement("div");
      root.id = "cmsProductSource";
      root.className = "cms-product-source";
      root.setAttribute("aria-hidden", "true");
      document.body.appendChild(root);
    }
    root.appendChild(docToItem(hero, true));
    variants.forEach((doc) => {
      if (!doc || !doc.sku) return;
      if (String(doc.sku).toUpperCase() === String(hero.sku).toUpperCase()) return;
      root.appendChild(docToItem(doc, false));
    });
  }

  async function loadFichaFromDb() {
    const sku = readInitialSku();
    if (!sku) {
      showFichaError("Esta ficha no tiene SKU.");
      return;
    }
    try {
      let docs = await fetchDocsBySku([sku]);
      if (!docs.length && sku !== sku.toUpperCase()) docs = await fetchDocsBySku([sku.toUpperCase()]);
      const hero = docs[0];
      if (!hero) {
        showFichaError("No encontramos el producto " + sku + ".");
        return;
      }
      const variantSkus = listField(hero.variantes_sku).filter(
        (item) => item.toUpperCase() !== String(hero.sku || "").toUpperCase()
      );
      const [listed, referring] = await Promise.all([
        variantSkus.length ? fetchDocsBySku(variantSkus) : Promise.resolve([]),
        fetchDocsReferencingSku(hero.sku),
      ]);
      const seen = new Set([String(hero.sku || "").toUpperCase()]);
      const variants = [];
      listed.concat(referring).forEach((doc) => {
        const skuKey = String(doc && doc.sku || "").toUpperCase();
        if (!skuKey || seen.has(skuKey)) return;
        seen.add(skuKey);
        variants.push(doc);
      });
      mountProductItems(hero, variants);
      lastVariantSignature = "";
      userPickedVariant = false;
      bootFicha();
    } catch (err) {
      console.error("[ficha] no se pudo leer la base", err);
      showFichaError("No pudimos cargar el producto. Reintentá en unos segundos.");
    }
  }

  function waitForCmsAndBoot() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", loadFichaFromDb);
    } else {
      loadFichaFromDb();
    }
  }

  (function initSkuCopyBtn() {
    const btn = document.getElementById("sku-copy-btn");
    if (!btn) return;
    const msg = document.getElementById("sku-copy-msg");
    let resetTimer = null;
    btn.addEventListener("click", () => {
      const sku = (document.getElementById("ficha-sku")?.textContent || "").trim();
      if (!sku) return;
      const markCopied = () => {
        btn.classList.add("copied");
        btn.setAttribute("aria-label", "SKU copiado");
        msg?.classList.add("show");
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          btn.classList.remove("copied");
          btn.setAttribute("aria-label", "Copiar SKU");
          msg?.classList.remove("show");
        }, 1500);
      };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(sku).then(markCopied).catch(() => {});
      } else {
        const ta = document.createElement("textarea");
        ta.value = sku;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); markCopied(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  })();

  function absoluteProductUrl(doc) {
    const raw = String((doc && doc.link_ficha_web) || "").trim();
    if (/^https?:\/\//i.test(raw)) return raw.split("#")[0];
    const path = productPath(doc || {});
    if (!path) return "https://www.macroled.com.ar/";
    if (/^https?:\/\//i.test(path)) return path;
    return "https://www.macroled.com.ar/" + path.replace(/^\//, "");
  }

  function ensureSheetSandbox() {
    if (document.getElementById("specGroups")) return;
    const host = document.createElement("div");
    host.id = "ml-sheet-sandbox";
    host.hidden = true;
    host.setAttribute("aria-hidden", "true");
    host.innerHTML = [
      '<h1 id="ficha-name"></h1>',
      '<span id="ficha-sku"></span>',
      '<span id="ficha-ean"></span>',
      '<p id="ficha-lead"></p>',
      '<p id="ficha-eyebrow"></p>',
      '<div class="quick-specs">',
      '<div class="qspec" data-spec-key="Potencia"><span class="label">Potencia</span><span class="val" data-spec-val></span></div>',
      '<div class="qspec" data-spec-key="Temperatura del color" hidden><span class="label">Luz</span><span class="val" data-spec-val></span></div>',
      '<div class="qspec" data-spec-key="Flujo luminoso"><span class="label">Lúmenes</span><span class="val" data-spec-val></span></div>',
      "</div>",
      '<div id="specGroups"></div>',
      '<div id="panel-commercial"><div id="commercialGroup"><div id="commercialTable">',
      '<div class="spec-row" data-spec-key="Familia"><span class="k"><span class="spec-tip__label">Familia</span></span><span class="v" data-spec-val></span></div>',
      '<div class="spec-row" data-spec-key="Macrofamilia"><span class="k"><span class="spec-tip__label">Macrofamilia</span></span><span class="v" data-spec-val></span></div>',
      '<div class="spec-row" data-spec-key="SKU"><span class="k"><span class="spec-tip__label">SKU</span></span><span class="v" data-spec-val></span></div>',
      '<div class="spec-row" data-spec-key="EAN13"><span class="k"><span class="spec-tip__label">EAN-13</span></span><span class="v" data-spec-val></span></div>',
      '<div class="spec-row" data-spec-key="Garantía"><span class="k"><span class="spec-tip__label">Garantía</span></span><span class="v" data-spec-val></span></div>',
      "</div></div></div>",
    ].join("");
    document.body.appendChild(host);
  }

  function setSheetText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "";
  }

  function prepareSheetFromDoc(doc) {
    ensureSheetSandbox();
    heroItem = docToItem(doc, true);
    const specs = parseSpecs(heroItem);
    const sku = (heroItem.getAttribute("data-sku") || "").trim();
    const name = (heroItem.getAttribute("data-name") || "").trim();
    const ean13 = (heroItem.getAttribute("data-ean13") || "").trim();
    const family = (heroItem.getAttribute("data-family") || "").trim();
    const macro = (heroItem.getAttribute("data-macrofamilia") || "").trim();
    const description = (heroItem.getAttribute("data-descripcion") || "").trim();
    setSheetText("ficha-name", name);
    setSheetText("ficha-sku", sku);
    setSheetText("ficha-ean", ean13);
    setSheetText("ficha-lead", description);
    setSheetText("ficha-eyebrow", [macro, family].filter(Boolean).join(" · "));
    forcedSheetUrl = absoluteProductUrl(doc);
    if (isFocusRackSku(sku)) specs["Ángulo de apertura"] = focusAngleFor(sku);
    updateSpecVals(specs, {
      SKU: sku,
      EAN13: ean13,
      Familia: family,
      Macrofamilia: macro,
    });
  }

  async function downloadGeneratedSheet(sku, kind) {
    const wanted = String(sku || "").trim();
    if (!wanted) throw new Error("sin sku");
    let docs = await fetchDocsBySku([wanted]);
    if (!docs.length && wanted !== wanted.toUpperCase()) docs = await fetchDocsBySku([wanted.toUpperCase()]);
    const doc = docs[0];
    if (!doc) throw new Error("sin producto");
    prepareSheetFromDoc(doc);
    if (kind === "garantia") await downloadWarrantySheet(null);
    else await downloadTechnicalSheet(null);
  }

  window.MacroledSheet = { download: downloadGeneratedSheet };

  if (!skipFichaBoot) waitForCmsAndBoot();
})();
