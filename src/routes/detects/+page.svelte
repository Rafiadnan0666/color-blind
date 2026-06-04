<script>
  import { onMount, tick } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { getColor } from '$lib/detection/objectDetection';
  import { loadTFModel, detectTF, getTFColor } from '$lib/detection/tfDetection';
  import { loadMobileNetModel, loadAllMobileNetModels, detectMobileNet, getMobileNetColor, getMobileNetModelKeys } from '$lib/detection/mobilenetDetection';
  import { sampleRegionColor, extractPalette, detectContour } from '$lib/detection/colorDetection';
  import { classifyScene, getSceneDescription } from '$lib/detection/sceneClassifier';
  import ModeSheet from '$lib/components/ModeSheet.svelte';
  import { scanHistory, favorites, savedColors, savedObjects, objectAnalytics, userSettings } from '$lib/supabase/db';
  import { session, user } from '$lib/stores/auth';
  import { notifyScanComplete, notifyColorSaved, notifyFavoriteSaved } from '$lib/supabase/notifications';

  // Reactive state
  let video = $state(null);
  let overlay = $state(null);
  let status = $state('');
  let useCamera = $state(true);
  let imageSrc = $state(null);
  let detections = $state([]);
  let focusColor = $state(null);
  let focusObj = $state(null);
  let sceneInfo = $state(null);

  // Internal state
  let prevDets = [];
  let animId = null;
  let detectTimer = null;
  let srcCanvas = $state(null);
  let skip = 0;
  let currentStream = null;
  let frameCount = 0;
  let modelLoadErrors = $state([]);
  let detecting = false;

  let mobilenetRotationIndex = 0;
  let fusionRotationIndex = 0;
  const allModels = ['fusion', 'coco', 'ssdlens', 'medicine'];
  const mobilenetModels = ['medicine'];
  const fusionModels = ['coco', ...mobilenetModels];
  let cachedFrameCanvas = null;
  let cachedDetectFrameCanvas = null;
  let scenePalette = $state([]);
  let uploadPalette = $state([]);
  let highlightPaletteHex = $state(null);
  let highlightOverlay = $state(null);

  let objColors = $state([]);
  let objPalettes = $state({});
  let objContours = $state({});
  let selectedObj = $state(null);
  let engineMode = $state('coco');
  let expandedSummary = $state(false);
  let showSimulation = $state(false);

  let showModeSheet = $state(false);
  let savedToHistory = $state(false);
  let saving = $state(false);
  let savedIds = $state(new Set());
  let showStatusToast = $state(false);
  let statusToastMsg = $state('');
  let statusToastType = $state('success');
  let loadProgress = $state(0);
  let loadStage = $state('');
  let wasDetecting = $state(false);
  let skipFrameCounter = 0;
  let tabHidden = false;

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      tabHidden = document.hidden;
      if (tabHidden) {
        wasDetecting = detecting;
        stopLoop();
      } else if (useCamera) {
        init();
      }
    });
  }

  const LOAD_STAGES = ['Initializing camera...', 'Loading MobileNetV2...', 'Loading models...', 'Warming up...', 'Ready'];

  // Effects
  $effect(() => {
    if (status === 'Start') { loadProgress = 15; loadStage = LOAD_STAGES[0]; }
    else if (status === 'Load') { loadProgress = 40; loadStage = LOAD_STAGES[1]; }
    else if (status === 'Detect') { loadProgress = 60; loadStage = LOAD_STAGES[2]; }
    else if (!status && loadProgress > 0 && loadProgress < 100) {
      loadProgress = 100; loadStage = LOAD_STAGES[4];
      setTimeout(() => { loadProgress = 0; loadStage = ''; }, 600);
    }
  });

  // Helper functions
  function getEngineLabel(mode) {
    const labels = { fusion: 'Fusion', coco: 'AI Vision', ssdlens: 'AI Vision', medicine: 'Medicine' };
    return labels[mode] || mode;
  }
  function getEngineIcon(mode) {
    const icons = { fusion: 'fa-compress-alt', coco: 'fa-brain', ssdlens: 'fa-brain', medicine: 'fa-pills' };
    return icons[mode] || 'fa-cube';
  }
  function getEngineColor(mode) {
    const colors = { fusion: '#ff3366', coco: '#00e5ff', ssdlens: '#00e5ff', medicine: '#ff6b35' };
    return colors[mode] || '#ffd700';
  }

  function getMobileNetModelKey(mode) {
    return mobilenetModels.includes(mode) ? mode : null;
  }
  let showObjPalette = $state(false);
  let objPalette = $state([]);
  let analyzingObj = $state(false);

  function positionOverlay() {
    if (!video || !overlay) return;
    const vr = video.getBoundingClientRect();
    if (vr.width === 0 || vr.height === 0) return;
    const par = overlay.width / overlay.height;
    const containerRatio = vr.width / vr.height;
    let w, h;
    if (par > containerRatio) {
      w = vr.width; h = vr.width / par;
    } else {
      h = vr.height; w = vr.height * par;
    }
    overlay.style.width = Math.round(w) + 'px';
    overlay.style.height = Math.round(h) + 'px';
    overlay.style.left = Math.round((vr.width - w) / 2) + 'px';
    overlay.style.top = Math.round((vr.height - h) / 2) + 'px';
  }

  // Lifecycle
  onMount(() => {
    srcCanvas = document.createElement('canvas');
    if (useCamera) init();
    window.addEventListener('resize', positionOverlay);
    return () => {
      window.removeEventListener('resize', positionOverlay);
      if (animId) cancelAnimationFrame(animId);
      if (detectTimer) { clearInterval(detectTimer); detectTimer = null; }
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
        currentStream = null;
      }
    };
  });

  function stopLoop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (detectTimer) { clearInterval(detectTimer); detectTimer = null; }
  }

  function toast(msg, type = 'success') {
    statusToastMsg = msg;
    statusToastType = type;
    showStatusToast = true;
    setTimeout(() => { showStatusToast = false; }, 2500);
  }

  async function saveCurrentScan() {
    if (saving || savedToHistory || objColors.length === 0) return;
    saving = true;
    try {
      const top = objColors[0];
      await scanHistory.create({
        mode: engineMode,
        objectName: top.label,
        objectColor: top.color.hex,
        confidence: top.score,
      });
      savedToHistory = true;
      for (const d of objColors) {
        try { await objectAnalytics.increment(d.label, d.score); } catch (_) {}
      }
      try { await notifyScanComplete(objColors.length, engineMode); } catch (_) {}
      toast('Scan saved to history!', 'success');
    } catch (e) {
      console.warn('Could not save scan history:', e);
      toast('Could not save scan', 'error');
    }
    saving = false;
  }

  async function saveAsFavorite(detection) {
    const id = `${detection.label}-${detection.color.hex}`;
    if (savedIds.has(id)) return;
    savedIds = new Set([...savedIds, id]);
    const pal = objPalettes[detection.label] || [];
    const paletteStr = pal.length > 0 ? pal.map(p => `${p.name}(${p.hex})`).join(', ') : '';
    try {
      await favorites.create({
        type: detection.label,
        value: detection.color.hex,
        notes: `Color: ${detection.color.name}${paletteStr ? ' | Palette: ' + paletteStr : ''} | Mode: ${engineMode} | Conf: ${(detection.score * 100).toFixed(0)}%`,
      });
      try { await notifyFavoriteSaved(detection.label); } catch (_) {}
      toast(`"${detection.label}" saved!`, 'success');
    } catch (e) {
      console.warn('Could not save favorite:', e);
      savedIds = new Set([...savedIds].filter(x => x !== id));
      toast('Could not save favorite', 'error');
    }
  }

  async function saveColor(color) {
    try {
      await savedColors.create({
        colorName: color.name,
        hexCode: color.hex,
        rgbValue: `${color.r},${color.g},${color.b}`,
      });
      try { await notifyColorSaved(color.name, color.hex); } catch (_) {}
      toast(`"${color.name}" saved!`, 'success');
    } catch (e) {
      console.warn('Could not save color:', e);
      toast('Could not save color', 'error');
    }
  }

  async function init() {
    try {
      status = 'Start';
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
        currentStream = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      currentStream = stream;
      if (!video) return;
      video.srcObject = stream; await video.play();
      await new Promise(r => { if (video.videoWidth > 0) r(); else video.addEventListener('loadeddata', () => r(), { once: true }); });
      await tick();
      if (overlay && video) {
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        requestAnimationFrame(() => positionOverlay());
      }
      status = 'Load';
      modelLoadErrors = [];
      const modelsToLoad = [];
      const modelNames = [];
      const mk = getMobileNetModelKey(engineMode);
      if (engineMode === 'coco' || engineMode === 'fusion' || engineMode === 'ssdlens') {
        modelsToLoad.push(loadTFModel());
        modelNames.push('COCO-SSD');
      }
      if (mk) {
        modelsToLoad.push(loadMobileNetModel(mk));
        modelNames.push(`MobileNetV2 ${getEngineLabel(engineMode)}`);
      }
      if (modelsToLoad.length === 0) {
        modelsToLoad.push(loadTFModel());
        modelNames.push('COCO-SSD');
      }
      const loadResults = await Promise.allSettled(modelsToLoad);
      for (let i = 0; i < loadResults.length; i++) {
        if (loadResults[i].status === 'rejected') {
          const err = `⚠ ${modelNames[i]} failed to load`;
          modelLoadErrors.push(err);
          toast(err, 'error');
        } else {
          console.log('✓ ' + modelNames[i] + ' loaded successfully');
        }
      }
      classifyScene(video).then(s => { sceneInfo = s; }).catch(() => {});
      status = '';
      const detInterval = 800;
      detectTimer = setInterval(() => runDetectionFrame(true), detInterval);
      animId = requestAnimationFrame(drawLoop);
    } catch (e) {
      status = e?.message || (e.name === 'NotAllowedError' ? 'Camera permission denied — enable in browser settings' : 'Error');
      if (e.name === 'NotAllowedError') {
        setTimeout(() => { if (status === 'Camera permission denied — enable in browser settings') status = ''; }, 4000);
      }
      console.error(e);
    }
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function simulateCVD(hex, type) {
    const r = parseInt(hex.slice(1,3), 16) / 255;
    const g = parseInt(hex.slice(3,5), 16) / 255;
    const b = parseInt(hex.slice(5,7), 16) / 255;
    let mr, mg, mb;
    if (type === 'protan') {
      mr = r * 0.567 + g * 0.433; mg = r * 0.558 + g * 0.442; mb = 0;
    } else if (type === 'deutan') {
      mr = r * 0.625 + g * 0.375; mg = r * 0.7 + g * 0.3; mb = 0;
    } else {
      mr = r * 0.95 + g * 0.05; mg = g * 0.433 + b * 0.567; mb = 0;
    }
    const clamp = v => Math.min(255, Math.max(0, Math.round(v * 255)));
    return `#${clamp(mr).toString(16).padStart(2,'0')}${clamp(mg).toString(16).padStart(2,'0')}${clamp(mb).toString(16).padStart(2,'0')}`;
  }

  function formatHSL(r, g, b) {
    const rr = r / 255, gg = g / 255, bb = b / 255;
    const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
      else if (max === gg) h = ((bb - rr) / d + 2) / 6;
      else h = ((rr - gg) / d + 4) / 6;
    }
    return `${(h * 360).toFixed(0)}° ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%`;
  }

  $effect(() => {
    if (focusColor) {
      const types = ['protan', 'deutan', 'tritan'];
      const labels = ['Protanopia', 'Deuteranopia', 'Tritanopia'];
      focusColor.simulated = types.map((t, i) => ({ label: labels[i], hex: simulateCVD(focusColor.hex, t) }));
    }
  });

  $effect(() => {
    if ($user) {
      userSettings.get().then(s => {
        if (s?.enginemode && s.enginemode !== engineMode) engineMode = s.enginemode;
      }).catch(() => {});
    }
  });

  $effect(() => {
    const mode = engineMode;
    if (mode && $user) {
      userSettings.upsert({ enginemode: mode }).catch(() => {});
    }
  });

  function getColorFor(d) {
    if (d.model === 'mobilenetv2' || d.model === 'coco-ssd') return getTFColor(d.label);
    if (d.model === 'mobilenet') return getMobileNetColor(d.label);
    return getColor(d.label);
  }

  async function sampleObjColors(source, dets) {
    const colored = await Promise.all(dets.map(async (d) => {
      const col = sampleRegionColor(source, d.x1, d.y1, d.width, d.height);
      return { ...d, color: col };
    }));
    extractPalettesAndContours(source, dets);
    return colored;
  }

  let extractQueue = 0;
  function extractPalettesAndContours(source, dets) {
    extractQueue++;
    const id = extractQueue;
    setTimeout(async () => {
      if (extractQueue !== id) return;
      const newPalettes = {};
      const newContours = {};
      for (const d of dets) {
        try {
          const pal = extractPalette(source, 6, d.x1, d.y1, d.width, d.height);
          if (pal.length > 0) newPalettes[d.label] = pal;
          const contour = detectContour(source, d.x1, d.y1, d.width, d.height);
          if (contour.length > 10) newContours[d.label] = contour;
        } catch (_) {}
      }
      objPalettes = newPalettes;
      objContours = newContours;
    }, 50);
  }

  async function analyzeObjPalette(source, det) {
    if (analyzingObj) return;
    analyzingObj = true;
    try {
      const cvs = document.createElement('canvas');
      let ctx;
      if (source instanceof HTMLVideoElement) {
        cvs.width = source.videoWidth;
        cvs.height = source.videoHeight;
        ctx = cvs.getContext('2d');
        ctx.drawImage(source, 0, 0);
      } else if (source instanceof HTMLImageElement) {
        cvs.width = source.naturalWidth;
        cvs.height = source.naturalHeight;
        ctx = cvs.getContext('2d');
        ctx.drawImage(source, 0, 0);
      }
      if (!ctx) return;
      const cropped = ctx.getImageData(det.x1, det.y1, det.width, det.height);
      const tmp = document.createElement('canvas');
      tmp.width = cropped.width;
      tmp.height = cropped.height;
      tmp.getContext('2d').putImageData(cropped, 0, 0);
      const pal = extractPalette(tmp, 8);
      objPalette = pal;
      showObjPalette = true;
    } catch (e) { console.error(e); }
    finally { analyzingObj = false; }
  }

  function captureFrame(source) {
    if (!cachedFrameCanvas) cachedFrameCanvas = document.createElement('canvas');
    const cvs = cachedFrameCanvas;
    if (source instanceof HTMLVideoElement) {
      cvs.width = source.videoWidth;
      cvs.height = source.videoHeight;
      cvs.getContext('2d').drawImage(source, 0, 0);
    } else if (source instanceof HTMLCanvasElement) {
      cvs.width = source.width;
      cvs.height = source.height;
      cvs.getContext('2d').drawImage(source, 0, 0);
    } else if (source instanceof HTMLImageElement) {
      cvs.width = source.naturalWidth;
      cvs.height = source.naturalHeight;
      cvs.getContext('2d').drawImage(source, 0, 0);
    } else { return source; }
    return cvs;
  }

  async function runDetectionFrame(skipCheck) {
    if (!video || !useCamera || !overlay || detecting || tabHidden) { return; }
    if (!skipCheck) {
      skipFrameCounter++;
      if (skipFrameCounter % 3 !== 0) return;
    }
    detecting = true;
    frameCount++;
    try {
      const frame = captureFrame(video);
      let results = [];
      const mk = getMobileNetModelKey(engineMode);

      if (engineMode === 'fusion') {
        const modelId = fusionModels[fusionRotationIndex % fusionModels.length];
        fusionRotationIndex++;
        if (modelId === 'coco' || modelId === 'ssdlens') results = await detectTF(frame).catch(() => []);
        else results = await detectMobileNet(frame, modelId).catch(() => []);
      } else if (mk) {
        results = await detectMobileNet(frame, mk).catch(() => []);
      } else if (engineMode === 'ssdlens') {
        results = await detectTF(frame).catch(() => []);
      } else {
        results = await detectTF(frame).catch(() => []);
      }
      results = results.filter(d => d.score >= 0.15);
      results.sort((a, b) => b.score - a.score);
      const raw = results.slice(0, 15);
      const cw = overlay.width, ch = overlay.height;
      if (!prevDets.length) prevDets = raw;
      const sm = raw.map((d, i) => {
        if (i >= prevDets.length) return d;
        const p = prevDets[i];
        return { ...d, x1: lerp(p.x1, d.x1, 0.3), y1: lerp(p.y1, d.y1, 0.3), x2: lerp(p.x2, d.x2, 0.3), y2: lerp(p.y2, d.y2, 0.3), width: lerp(p.width, d.width, 0.3), height: lerp(p.height, d.height, 0.3) };
      });
      prevDets = raw;
      detections = sm;

      const colored = await sampleObjColors(video, sm);
      objColors = colored;

      const best = pickNearestCenter(sm, cw, ch);
      if (best) { focusObj = best.label; focusColor = sampleRegionColor(video, best.x1, best.y1, best.width, best.height); }
      else { focusObj = null; focusColor = sampleRegionColor(video, cw * 0.3, ch * 0.3, cw * 0.4, ch * 0.4); }

      if (frameCount % 3 === 0) {
        const fullPalette = extractPalette(video, 8);
        scenePalette = fullPalette;
      }
    } catch (e) { console.error('detection error:', e); }
    detecting = false;
  }

  let drawLoopCtx = null;
  let detectionsDirty = $state(true);

  $effect(() => {
    const _ = detections; const _2 = objColors; const _3 = selectedObj; const _4 = focusObj;
    if (drawLoopCtx) detectionsDirty = true;
  });

  function drawLoop(time) {
    if (!overlay) { animId = requestAnimationFrame(drawLoop); return; }
    if (!drawLoopCtx) drawLoopCtx = overlay.getContext('2d');
    if (detectionsDirty) {
      const cw = overlay.width, ch = overlay.height;
      if (cw > 0 && ch > 0) {
        drawFrame(detections, focusObj ? detections.find(d => d.label === focusObj) : null, cw, ch, objColors, drawLoopCtx);
      }
      detectionsDirty = false;
    }
    animId = requestAnimationFrame(drawLoop);
  }

  function drawPaletteDots() {}

  function pickNearestCenter(dets, cw, ch) {
    if (!dets || !dets.length) return null;
    const cx = cw / 2, cy = ch / 2;
    let best = null;
    let bestScore = 0;
    for (const d of dets) {
      const dcx = d.x1 + d.width / 2, dcy = d.y1 + d.height / 2;
      const dist = Math.sqrt((dcx - cx) ** 2 + (dcy - cy) ** 2);
      const s = d.score / (1 + dist / Math.max(cw, ch)) * Math.min((d.width * d.height) / (cw * ch * 0.5), 1);
      if (s > bestScore) { bestScore = s; best = d; }
    }
    return best;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  let frameTick = 0;

  function drawFrame(preds, focus, cw, ch, colors = [], ctx) {
    try {
      if (!ctx) ctx = overlay.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, cw, ch);
      frameTick++;

      const colorMap = {};
      for (const c of colors) { colorMap[c.label] = c.color; }

      for (const d of preds) {
        const isSel = selectedObj?.label === d.label;
        const col = getColorFor(d);
        const objColor = colorMap[d.label];
        const x1 = d.x1, y1 = d.y1, w = d.width, h = d.height;

        ctx.save();

        ctx.strokeStyle = isSel ? '#ffd700' : col;
        ctx.lineWidth = isSel ? 3 : 2;
        ctx.strokeRect(x1, y1, w, h);
        ctx.fillStyle = col + '12';
        ctx.fillRect(x1, y1, w, h);

        if (isSel) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(x1 - 4, y1 - 4, w + 8, h + 8);
          ctx.setLineDash([]);
        }

        const label = `${d.label} ${(d.score * 100).toFixed(0)}%`;
        ctx.font = `bold 12px 'Space Grotesk', system-ui, sans-serif`;
        const tw = ctx.measureText(label).width;
        const bx = Math.max(3, x1);
        const by = Math.max(3, y1 - 26);

        ctx.fillStyle = isSel ? '#ffd700' : col;
        roundRect(ctx, bx - 2, by, tw + 10, 22, 4);
        ctx.fill();

        ctx.fillStyle = '#0a0a0a';
        ctx.fillText(label, bx + 4, by + 16);

        if (objColor) {
          ctx.fillStyle = objColor.hex;
          ctx.fillRect(bx + tw + 8, by + 3, 14, 16);
          ctx.strokeStyle = 'rgba(10,10,10,0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx + tw + 8, by + 3, 14, 16);
        }

        ctx.restore();
      }

      const cx = cw / 2, cy = ch / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy); ctx.lineTo(cx + 24, cy);
      ctx.moveTo(cx, cy - 24); ctx.lineTo(cx, cy + 24);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    } catch (e) { console.error('drawFrame error:', e); }
  }

  function handleUpload(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const maxSize = 20 * 1024 * 1024;
    if (f.size > maxSize) { toast('Image too large — max 20MB', 'error'); return; }
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
    if (!validTypes.includes(f.type)) { toast('Unsupported file type. Use JPEG, PNG, or WebP.', 'error'); return; }
    detections = []; objColors = []; selectedObj = null; showObjPalette = false; focusColor = null; focusObj = null; savedToHistory = false;
    const r = new FileReader();
    r.onload = async (ev) => { imageSrc = ev.target?.result; await tick(); runDetect(); };
    r.readAsDataURL(f);
  }

  async function runDetect() {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = async () => {
      try {
        status = 'Detect';
        const modelsToLoad = [];
        if (engineMode === 'fusion' || engineMode === 'ssdlens' || engineMode === 'coco') modelsToLoad.push(loadTFModel());
        if (engineMode === 'fusion') modelsToLoad.push(loadAllMobileNetModels());
        else if (mobilenetModels.includes(engineMode)) modelsToLoad.push(loadMobileNetModel(engineMode));
        await Promise.allSettled(modelsToLoad);
        if (srcCanvas) { srcCanvas.width = img.naturalWidth; srcCanvas.height = img.naturalHeight; srcCanvas.getContext('2d').drawImage(img, 0, 0); }
        if (overlay) { overlay.width = img.naturalWidth; overlay.height = img.naturalHeight; }
        if (highlightOverlay) { highlightOverlay.width = img.naturalWidth; highlightOverlay.height = img.naturalHeight; }
        const frame = captureFrame(img);
        const mk = getMobileNetModelKey(engineMode);
        let ssdResults = [], tfResults = [], mobilenetCombined = [];
        if (engineMode === 'fusion') {
          tfResults = await detectTF(frame).catch(() => []);
          mobilenetCombined = await detectMobileNet(frame, mobilenetModels[frameCount % mobilenetModels.length]).catch(() => []);
        } else if (engineMode === 'ssdlens' || engineMode === 'coco') {
          tfResults = await detectTF(frame).catch(() => []);
        } else if (mk) {
          mobilenetCombined = await detectMobileNet(frame, mk).catch(() => []);
        }
        let results = [...tfResults, ...mobilenetCombined].filter(d => d.score >= 0.15);
        results.sort((a, b) => b.score - a.score);
        detections = results;

        const colored = await sampleObjColors(img, results);
        objColors = colored;

        classifyScene(img).then(s => { sceneInfo = s; }).catch(() => {});
        const pal = extractPalette(img, 10);
        uploadPalette = pal;

        if (overlay) {
          try {
            const ctx = overlay.getContext('2d');
            ctx.drawImage(img, 0, 0);
            for (const d of results) {
              const col = getColorFor(d);
              const objColor = colored.find(c => c.label === d.label)?.color;
              const contour = objContours[d.label] || [];

              ctx.save();

              if (contour.length > 10) {
                ctx.shadowBlur = 6; ctx.shadowColor = col + '99';
                ctx.strokeStyle = col; ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(contour[0].x, contour[0].y);
                for (let i = 1; i < contour.length; i++) ctx.lineTo(contour[i].x, contour[i].y);
                ctx.closePath(); ctx.stroke();
                ctx.shadowBlur = 0; ctx.fillStyle = col + '08'; ctx.fill();
              } else {
                ctx.shadowBlur = 6; ctx.shadowColor = col + '99';
                ctx.strokeStyle = col; ctx.lineWidth = 2;
                ctx.strokeRect(d.x1, d.y1, d.width, d.height);
                ctx.shadowBlur = 0; ctx.fillStyle = col + '06';
                ctx.fillRect(d.x1, d.y1, d.width, d.height);
              }

              const cl = Math.min(14, Math.min(d.width, d.height) * 0.2);
              ctx.lineWidth = 2.5; ctx.shadowBlur = 5; ctx.shadowColor = col + '66';
              ctx.strokeStyle = col;
              ctx.beginPath();
              ctx.moveTo(d.x1, d.y1 + cl); ctx.lineTo(d.x1, d.y1); ctx.lineTo(d.x1 + cl, d.y1);
              ctx.moveTo(d.x1 + d.width - cl, d.y1); ctx.lineTo(d.x1 + d.width, d.y1); ctx.lineTo(d.x1 + d.width, d.y1 + cl);
              ctx.moveTo(d.x1 + d.width, d.y1 + d.height - cl); ctx.lineTo(d.x1 + d.width, d.y1 + d.height); ctx.lineTo(d.x1 + d.width - cl, d.y1 + d.height);
              ctx.moveTo(d.x1 + cl, d.y1 + d.height); ctx.lineTo(d.x1, d.y1 + d.height); ctx.lineTo(d.x1, d.y1 + d.height - cl);
              ctx.stroke(); ctx.shadowBlur = 0;

              const pal = objPalettes[d.label];
              if (pal && pal.length > 0) {
                for (const pc of pal) {
                  if (!pc.positions || !pc.positions[0]) continue;
                  const pos = pc.positions[0];
                  ctx.beginPath();
                  ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
                  ctx.fillStyle = pc.hex;
                  ctx.shadowBlur = 3;
                  ctx.shadowColor = 'rgba(0,0,0,0.5)';
                  ctx.fill();
                  ctx.strokeStyle = '#fff';
                  ctx.lineWidth = 0.8;
                  ctx.shadowBlur = 0;
                  ctx.stroke();
                }
              }

              ctx.font = `700 13px 'Space Grotesk', system-ui, sans-serif`;
              const label = `${d.label} ${(d.score * 100).toFixed(0)}%`;
              const tw = ctx.measureText(label).width;
              const pillW = tw + 12 + (objColor ? 16 : 0);
              ctx.fillStyle = col; ctx.globalAlpha = 0.9;
              ctx.shadowBlur = 3; ctx.shadowColor = 'rgba(0,0,0,0.3)';
              roundRect(ctx, d.x1, d.y1 - 22, pillW, 22, 4);
              ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
              ctx.fillStyle = '#0a0a0a';
              ctx.fillText(label, d.x1 + 5, d.y1 - 6);
              if (objColor) {
                ctx.fillStyle = objColor.hex;
                ctx.fillRect(d.x1 + tw + 14, d.y1 - 19, 14, 16);
                ctx.strokeStyle = 'rgba(10,10,10,0.25)'; ctx.lineWidth = 1;
                ctx.strokeRect(d.x1 + tw + 14, d.y1 - 19, 14, 16);
              }
              ctx.restore();
            }
          } catch (e) { console.error('upload draw error:', e); }
        }
        status = '';
      } catch (e) { status = e?.message || 'Error'; console.error(e); }
    };
    img.src = imageSrc;
  }

  function toggleHighlight(pc) {
    if (highlightPaletteHex === pc.hex) {
      highlightPaletteHex = null;
      if (highlightOverlay) { highlightOverlay.getContext('2d')?.clearRect(0, 0, highlightOverlay.width, highlightOverlay.height); }
      return;
    }
    highlightPaletteHex = pc.hex;
    drawPaletteHighlight(pc);
  }

  function drawPaletteHighlight(pc) {
    if (!highlightOverlay || !pc.positions || pc.positions.length === 0) return;
    const ctx = highlightOverlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, highlightOverlay.width, highlightOverlay.height);

    for (const pos of pc.positions) {
      const rad = 4;
      const grad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, rad);
      grad.addColorStop(0, pc.hex + 'cc');
      grad.addColorStop(1, pc.hex + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = pc.hex + '44';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rad * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function selectObject(d) {
    selectedObj = selectedObj?.label === d.label ? null : d;
    const source = useCamera ? video : srcCanvas;
    if (selectedObj && source) analyzeObjPalette(source, selectedObj);
    else { showObjPalette = false; objPalette = []; }
  }

  async function toggleCam() {
    useCamera = !useCamera;
    imageSrc = null; detections = []; objColors = []; focusColor = null; focusObj = null;
    selectedObj = null; showObjPalette = false; savedToHistory = false;
    stopLoop();
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
    }
    if (video) video.srcObject = null;
    if (overlay) { const ctx = overlay.getContext('2d'); if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height); }
    if (useCamera) { await tick(); init(); }
    else {
      const toLoad = [];
      if (engineMode === 'fusion' || engineMode === 'ssdlens' || engineMode === 'coco') toLoad.push(loadTFModel());
      if (engineMode === 'fusion') toLoad.push(loadAllMobileNetModels());
      else if (mobilenetModels.includes(engineMode)) toLoad.push(loadMobileNetModel(engineMode));
      await Promise.allSettled(toLoad);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) {
      const maxSize = 20 * 1024 * 1024;
      if (f.size > maxSize) { toast('Image too large — max 20MB', 'error'); return; }
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
      if (!validTypes.includes(f.type)) { toast('Unsupported file type', 'error'); return; }
      detections = []; objColors = []; selectedObj = null; showObjPalette = false; focusColor = null; focusObj = null; savedToHistory = false;
      const r = new FileReader();
      r.onload = async (ev) => { imageSrc = ev.target?.result; await tick(); runDetect(); };
      r.readAsDataURL(f);
    }
  }
</script>

<div class="detect-page" class:camera-mode={useCamera} role="region" aria-label="Detection view" ondragover={(e) => e.preventDefault()} ondrop={handleDrop}>
  {#if status || loadProgress > 0}
    <div class="loading-overlay">
      <div class="loading-card">
        {#if loadStage}
          <div class="font-brut text-brut-sm uppercase mb-3">{loadStage}</div>
        {:else}
          <div class="font-brut text-brut-sm uppercase mb-3">{status || 'Loading...'}</div>
        {/if}
        <div class="progress-track">
          <div class="progress-fill" style="width: {loadProgress}%"></div>
        </div>
        <div class="font-brut text-brut-xs text-neo-darkgray mt-2">{loadProgress}%</div>
      </div>
    </div>
  {/if}

  {#if useCamera}
    <div class="cam-ui">
      <!-- Desktop top bar -->
      <div class="cam-controls-desktop">
        <div class="desk-toolbar-row">
          <a href="/dashboard" class="tool-btn" aria-label="Back to dashboard">
            <i class="fas fa-arrow-left"></i>
          </a>
          <button class="tool-btn" class:active={useCamera} onclick={toggleCam} aria-label="Use camera">
            <i class="fas fa-camera"></i>
          </button>
          <button class="tool-btn" onclick={toggleCam} aria-label="Upload image">
            <i class="fas fa-upload"></i>
          </button>
          <button class="mode-selector desk-mode" style="--mode-color: {getEngineColor(engineMode)}" onclick={() => showModeSheet = true}>
            <i class="fas {getEngineIcon(engineMode)}"></i>
            <span>{getEngineLabel(engineMode)}</span>
            <i class="fas fa-chevron-up" style="font-size:0.6rem"></i>
          </button>
          <button class="tool-btn" onclick={() => showModeSheet = true} aria-label="More modes">
            <i class="fas fa-grid-2"></i>
          </button>
        </div>
      </div>

      <ModeSheet show={showModeSheet} current={engineMode} onSelect={(m) => { engineMode = m; savedToHistory = false; }} onClose={() => showModeSheet = false} />

      <div class="cam-main">
        <!-- Mobile top bar -->
        <div class="cam-toolbar-mobile">
          <a href="/dashboard" class="cam-btn" aria-label="Back">
            <i class="fas fa-chevron-left"></i>
          </a>
          <button class="cam-btn" class:active={useCamera} onclick={toggleCam} aria-label="Use camera">
            <i class="fas fa-camera"></i>
          </button>
          <button class="cam-btn" onclick={toggleCam} aria-label="Upload image">
            <i class="fas fa-upload"></i>
          </button>
          <button class="cam-btn mode" style="--mc: {getEngineColor(engineMode)}" onclick={() => showModeSheet = true}>
            <i class="fas {getEngineIcon(engineMode)}"></i>
            <span class="text-brut-xs">{getEngineLabel(engineMode)}</span>
          </button>
          <button class="cam-btn" onclick={() => showModeSheet = true} aria-label="More modes">
            <i class="fas fa-grid-2"></i>
          </button>
        </div>

        <div class="cam-view" class:show={!status}>
          <div class="cam-viewfinder" id="cam-vf">
            <video bind:this={video} autoplay playsinline muted></video>
            <canvas bind:this={overlay}></canvas>
          </div>
        </div>

      </div>

      <!-- Desktop info panel - outside camera panel -->
    

      <div class="cam-overlays">
          {#if sceneInfo}
            <div class="cam-badge">
              <span class="text-brut-xs font-bold uppercase">{sceneInfo.scene.replace(/_/g, ' ')}</span>
              <span class="text-brut-xs opacity-60">{(sceneInfo.confidence * 100).toFixed(0)}%</span>
            </div>
          {/if}
          {#if focusColor}
            <div class="cam-color-card" style="border-color: {focusColor.hex}" transition:fly={{ y: 8, duration: 200 }}>
              <div class="flex items-center gap-2 w-full">
                <div class="swatch" style="background: {focusColor.hex}"></div>
                <div class="flex-1 min-w-0">
                  <div class="font-brut text-brut-sm capitalize">{focusColor.name}</div>
                  <div class="text-brut-xs text-neo-darkgray">{focusColor.hex} {#if focusColor.r !== undefined}({focusColor.r},{focusColor.g},{focusColor.b}){/if}</div>
                  {#if focusObj}<div class="text-brut-xs text-neo-darkgray capitalize">{focusObj}</div>{/if}
                </div>
                <div class="flex items-center gap-1">
                  {#if focusColor.confusion?.length}
                    <span class="cam-icon-btn text-red-500" title={focusColor.confusion[0].label}><i class="fas fa-eye"></i></span>
                  {/if}
                  <button class="cam-icon-btn" onclick={() => saveColor(focusColor)} aria-label="Save color"><i class="fas fa-floppy-disk"></i></button>
                  <button class="cam-icon-btn" onclick={() => showSimulation = !showSimulation} aria-label="Toggle CVD sim"><i class="fas {showSimulation ? 'fa-eye-slash' : 'fa-low-vision'}"></i></button>
                </div>
              </div>
              {#if showSimulation && focusColor.simulated}
                <div class="sim-row">
                  {#each focusColor.simulated as sim}
                    <div class="sim-chip" title={sim.label}>
                      <div class="sim-swatch" style="background: {sim.hex}"></div>
                      <span class="sim-label">{sim.label.slice(0,5)}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}

          {#if objColors.length > 0}
            <div class="cam-detections">
              <div class="cam-dets-header">
                <span class="font-brut text-brut-xs uppercase">{objColors.length} Objects</span>
                <div class="flex items-center gap-1">
                  <button class="cam-dets-save" class:saved={savedToHistory} onclick={saveCurrentScan} disabled={saving} aria-label="Save scan">
                    <i class="fas {saving ? 'fa-spinner fa-spin' : savedToHistory ? 'fa-check' : 'fa-floppy-disk'}"></i>
                    {savedToHistory ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
              <div class="cam-dets-list">
                {#each objColors as d, i (d.label + d.score + i)}
                  <div role="button" tabindex="0" class="cam-det-item" class:selected={selectedObj?.label === d.label} onclick={() => selectObject(d)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectObject(d); }}>
                    <span class="color-swatch-mini" style="background: {d.color.hex}"></span>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1">
                        <span class="font-brut text-brut-xs truncate capitalize">{d.label}</span>
                        <span class="model-pill">{d.model === 'mobilenetv2' ? 'MN2' : d.model === 'coco-ssd' ? 'AI' : 'MNet'}</span>
                      </div>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="conf-dot" style="width:{(d.score*100).toFixed(0)}%;background:{getColorFor(d)}"></span>
                        <span class="text-brut-xs text-neo-darkgray">{(d.score*100).toFixed(0)}%</span>
                        <span class="text-brut-xs text-neo-darkgray capitalize">{d.color.name}</span>
                        <span class="text-brut-xs text-neo-darkgray">{d.color.hex}</span>
                      </div>
                      {#if d.color.r !== undefined}
                        <div class="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                          <span class="text-brut-2xs text-neo-darkgray font-mono">RGB({d.color.r},{d.color.g},{d.color.b})</span>
                          <span class="text-brut-2xs text-neo-darkgray font-mono">HSL({d.color.hsl.h}°{d.color.hsl.s}%{d.color.hsl.l}%)</span>
                        </div>
                      {/if}
                      {#if d.color.confusion?.length}
                        <div class="flex gap-1 mt-0.5 flex-wrap">
                          {#each d.color.confusion as cvd}
                            <span class="cvd-chip" title={cvd.label}>{cvd.type.slice(0,5)}</span>
                          {/each}
                        </div>
                      {/if}
                      {#if objPalettes[d.label] && objPalettes[d.label].length > 0}
                        <div class="flex gap-0.5 mt-0.5">
                          {#each objPalettes[d.label].slice(0, 4) as pc}
                            <span class="pal-mini" style="background:{pc.hex}" title="{pc.name}: {pc.percentage.toFixed(0)}%"></span>
                          {/each}
                        </div>
                      {/if}
                    </div>
                    <button class="cam-fav-btn" class:saved={savedIds.has(`${d.label}-${d.color.hex}`)} onclick={(e) => { e.stopPropagation(); saveAsFavorite(d); }} aria-label="Favorite">
                      <i class="fas fa-heart"></i>
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        {#if showObjPalette && objPalette.length > 0 && selectedObj}
          <div class="cam-palette" transition:fly={{ y: 20, duration: 250 }}>
            <div class="flex items-center justify-between mb-1">
              <span class="font-brut text-brut-xs uppercase">{selectedObj.label} Colors</span>
              <button class="cam-icon-btn" onclick={() => { showObjPalette = false; selectedObj = null; }} aria-label="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="grid grid-cols-4 gap-1">
              {#each objPalette as c}
                <div class="pal-chip">
                  <div class="pal-swatch" style="background:{c.hex}"></div>
                  <span class="text-brut-xs truncate">{c.name}</span>
                  <span class="text-brut-2xs opacity-60">{c.percentage.toFixed(0)}%</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
  {:else}
    <div class="upload-ui">
      <div class="toolbar">
        <div class="toolbar-row">
          <button class="tool-btn" onclick={toggleCam} aria-label="Use camera"><i class="fas fa-camera"></i></button>
          <button class="tool-btn active" aria-label="Upload image"><i class="fas fa-upload"></i></button>
          <button class="mode-selector" style="--mode-color: {getEngineColor(engineMode)}" onclick={() => showModeSheet = true}>
            <i class="fas {getEngineIcon(engineMode)}"></i>
            <span>{getEngineLabel(engineMode)}</span>
            <i class="fas fa-chevron-up" style="font-size:0.6rem"></i>
          </button>
        </div>
      </div>

      <ModeSheet show={showModeSheet} current={engineMode} onSelect={(m) => { engineMode = m; savedToHistory = false; }} onClose={() => showModeSheet = false} />

      <div class="view" class:show={!status}>
        {#if imageSrc}
          <div class="viewfinder">
            <img src={imageSrc} alt="" class="img">
            <canvas bind:this={overlay}></canvas>
            <canvas bind:this={highlightOverlay} class="highlight-canvas"></canvas>
          </div>
          {#each modelLoadErrors as err}
            <div class="model-err-banner">{err}</div>
          {/each}
        {:else}
          <div class="upload-zone" role="button" tabindex="0" onclick={() => document.getElementById('file-input').click()} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('file-input').click(); }}>
            <div class="text-center">
              <div class="text-5xl opacity-30 mb-3"><i class="fas fa-image"></i></div>
              <div class="font-brut text-brut-lg uppercase">Drop an image</div>
              <div class="text-brut-xs text-neo-darkgray">or click to browse</div>
              <label class="brut-btn-primary mt-4 inline-block cursor-pointer">
                <i class="fas fa-folder-open mr-2"></i> Select Image
                <input id="file-input" type="file" accept="image/*" onchange={handleUpload} hidden>
              </label>
            </div>
          </div>
        {/if}
      </div>

      {#if objColors.length > 0}
        <div class="summary-bar brut-card" transition:fly={{ y: 8, duration: 200 }}>
          <div class="summary-row">
            <div class="summary-stat"><span class="font-brut text-brut-xs uppercase">Objects</span><span class="font-brut text-brut-lg">{objColors.length}</span></div>
            <div class="summary-stat"><span class="font-brut text-brut-xs uppercase">Avg Conf</span><span class="font-brut text-brut-lg">{(objColors.reduce((a, d) => a + d.score, 0) / objColors.length * 100).toFixed(0)}%</span></div>
            <div class="summary-stat"><span class="font-brut text-brut-xs uppercase">Mode</span><span class="font-brut text-brut-xs">{getEngineLabel(engineMode)}</span></div>
            {#if sceneInfo}<div class="summary-stat"><span class="font-brut text-brut-xs uppercase">Scene</span><span class="font-brut text-brut-xs truncate">{sceneInfo.scene.replace(/_/g, ' ')}</span></div>{/if}
          </div>
        </div>
        <div class="detections-panel brut-card">
          <div class="panel-head">
            <span class="font-brut text-brut-sm uppercase"><i class="fas fa-crosshairs mr-2 text-neo-pink"></i>Detected Objects <span class="text-neo-darkgray text-brut-xs ml-2">({objColors.length})</span></span>
            <button class="save-btn" class:saved={savedToHistory} onclick={saveCurrentScan} disabled={saving}>
              <i class="fas {saving ? 'fa-spinner fa-spin' : savedToHistory ? 'fa-check' : 'fa-floppy-disk'}"></i>
              {savedToHistory ? 'Saved' : 'Save'}
            </button>
          </div>
          <div class="detections-list">
            {#each objColors as d, i (d.label + d.score + i)}
              <div role="button" tabindex="0" class="detection-item" class:selected={selectedObj?.label === d.label} onclick={() => selectObject(d)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectObject(d); }}>
                <span class="color-swatch-mini" style="background:{d.color.hex}"></span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="font-brut text-brut-sm truncate capitalize">{d.label}</span>
                    <span class="model-badge">{d.model === 'mobilenetv2' ? 'MN2' : d.model === 'coco-ssd' ? 'AI' : 'MNet'}</span>
                  </div>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-brut-xs text-neo-darkgray">{d.color.name}</span>
                    <span class="text-brut-xs text-neo-darkgray">{d.color.hex}</span>
                  </div>
                  {#if d.color.r !== undefined}
                    <div class="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                      <span class="text-brut-2xs text-neo-darkgray font-mono">RGB({d.color.r},{d.color.g},{d.color.b})</span>
                      <span class="text-brut-2xs text-neo-darkgray font-mono">HSL({d.color.hsl.h}°{d.color.hsl.s}%{d.color.hsl.l}%)</span>
                    </div>
                  {/if}
                  {#if d.color.confusion?.length}
                    <div class="flex gap-1 mt-0.5 flex-wrap">
                      {#each d.color.confusion as cvd}
                        <span class="cvd-chip" title={cvd.label}>{cvd.type.slice(0,5)}</span>
                      {/each}
                    </div>
                  {/if}
                  {#if objPalettes[d.label] && objPalettes[d.label].length > 0}
                    <div class="flex gap-1 mt-0.5 flex-wrap">
                      {#each objPalettes[d.label].slice(0, 5) as pc}
                        <div class="flex flex-col items-center gap-0.5">
                          <span class="pal-mini-upload" style="background:{pc.hex};" title="{pc.name}: {pc.percentage.toFixed(0)}%"></span>
                          <div class="text-brut-xs text-neo-darkgray text-center">
                            <div>{pc.name}</div>
                            <div class="font-mono">{pc.hex}</div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
                <div class="flex items-center gap-2">
                  <div class="conf-bar"><div class="conf-fill" style="width:{d.score*100}%;background:{getColorFor(d)}"></div></div>
                  <span class="font-brut text-brut-xs tabular-nums">{(d.score*100).toFixed(0)}%</span>
                </div>
                <button class="fav-btn" class:saved={savedIds.has(`${d.label}-${d.color.hex}`)} onclick={(e) => { e.stopPropagation(); saveAsFavorite(d); }} aria-label="Favorite">
                  <i class="fas fa-heart"></i>
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if showObjPalette && objPalette.length > 0 && selectedObj}
        <div class="palette-panel brut-card" transition:fly={{ y: 20, duration: 250 }}>
          <div class="flex items-center justify-between mb-2">
            <span class="font-brut text-brut-sm uppercase"><i class="fas fa-palette mr-2 text-neo-pink"></i>{selectedObj.label} Colors</span>
            <button class="brut-btn text-brut-xs px-2 py-1" onclick={() => { showObjPalette = false; selectedObj = null; }} aria-label="Close"><i class="fas fa-times"></i></button>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {#each objPalette as c}
              <div class="color-chip">
                <div class="color-swatch" style="background:{c.hex}"></div>
                <div class="flex flex-col min-w-0">
                  <span class="font-brut text-brut-xs capitalize truncate">{c.name}</span>
                  <span class="text-brut-xs text-neo-darkgray">{c.hex}</span>
                  <span class="text-brut-xs text-neo-darkgray">{c.percentage.toFixed(0)}%</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if uploadPalette.length > 0}
        <div class="scene-palette-panel brut-card">
          <div class="panel-head">
            <span class="font-brut text-brut-xs uppercase"><i class="fas fa-palette mr-2 text-neo-green"></i>Scene Colors</span>
            <span class="text-brut-xs text-neo-darkgray">{uploadPalette.length} colors</span>
          </div>
          <div class="scene-palette-grid">
            {#each uploadPalette as pc}
              <button class="scene-chip" class:active={highlightPaletteHex === pc.hex} onclick={() => toggleHighlight(pc)} aria-label="Highlight {pc.name}">
                <div class="scene-swatch" style="background:{pc.hex}"></div>
                <div class="scene-chip-info">
                  <span class="font-brut text-brut-xs capitalize truncate">{pc.name}</span>
                  <span class="text-brut-xs text-neo-darkgray">{pc.hex} {pc.percentage.toFixed(0)}%</span>
                </div>
                <i class="fas fa-crosshairs text-brut-xs {highlightPaletteHex === pc.hex ? 'text-neo-green' : 'text-neo-darkgray'}"></i>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      {#if objColors.length > 0}
        <div class="tags-panel brut-card">
          <div class="flex items-center gap-2 mb-2">
            <span class="font-brut text-brut-xs uppercase"><i class="fas fa-tags mr-1"></i> Tags</span>
            <span class="text-brut-xs text-neo-darkgray">{objColors.length} found</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            {#each objColors as d}
              <span class="tag" style="--c:{getColorFor(d)}">{d.label} <span class="opacity-60 ml-1">{(d.score*100).toFixed(0)}</span></span>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
  <div class="cam-info-panel-desktop">
        {#if sceneInfo}
          <div class="desk-scene-badge">
            <span class="font-brut text-brut-xs uppercase">{sceneInfo.scene.replace(/_/g, ' ')}</span>
            <span class="text-brut-xs opacity-60">{(sceneInfo.confidence * 100).toFixed(0)}%</span>
          </div>
        {/if}
        <div class="cam-color-bar-desktop">
          {#if focusColor}
            <div class="desk-color-card" style="border-color: {focusColor.hex}">
              <div class="desk-color-header">
                <div class="swatch" style="background: {focusColor.hex}"></div>
                <div class="flex-1 min-w-0">
                  <div class="font-brut text-brut-sm capitalize">{focusColor.name}</div>
                  <div class="text-brut-xs text-neo-darkgray">{focusColor.hex} {#if focusColor.r !== undefined}({focusColor.r},{focusColor.g},{focusColor.b}){/if}</div>
                  {#if focusObj}<div class="text-brut-xs text-neo-darkgray capitalize">{focusObj}</div>{/if}
                </div>
                <div class="flex items-center gap-1">
                  {#if focusColor.confusion?.length}
                    <span class="cam-icon-btn text-red-500" title={focusColor.confusion[0].label}><i class="fas fa-eye"></i></span>
                  {/if}
                  <button class="cam-icon-btn" onclick={() => saveColor(focusColor)} aria-label="Save color"><i class="fas fa-floppy-disk"></i></button>
                  <button class="cam-icon-btn" onclick={() => showSimulation = !showSimulation} aria-label="Toggle CVD sim"><i class="fas {showSimulation ? 'fa-eye-slash' : 'fa-low-vision'}"></i></button>
                </div>
              </div>
              {#if showSimulation && focusColor.simulated}
                <div class="sim-row">
                  {#each focusColor.simulated as sim}
                    <div class="sim-chip" title={sim.label}>
                      <div class="sim-swatch" style="background: {sim.hex}"></div>
                      <span class="sim-label">{sim.label.slice(0,5)}</span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
          {#if scenePalette.length > 0}
            <div class="desk-palette-bar">
              <span class="font-brut text-brut-2xs uppercase text-neo-darkgray mr-1">Scene</span>
              {#each scenePalette.slice(0, 6) as pc}
                <span class="pal-dot" style="background:{pc.hex}" title="{pc.name} {pc.percentage.toFixed(0)}%"></span>
              {/each}
            </div>
          {/if}
        </div>
        {#if objColors.length > 0}
          <div class="desk-detections">
            <div class="desk-dets-header">
              <span class="font-brut text-brut-xs uppercase">{objColors.length} Objects</span>
              <button class="cam-dets-save" class:saved={savedToHistory} onclick={saveCurrentScan} disabled={saving} aria-label="Save scan">
                <i class="fas {saving ? 'fa-spinner fa-spin' : savedToHistory ? 'fa-check' : 'fa-floppy-disk'}"></i>
                {savedToHistory ? 'Saved' : 'Save'}
              </button>
            </div>
            <div class="desk-dets-list">
              {#each objColors as d, i (d.label + d.score + i)}
                <div role="button" tabindex="0" class="desk-det-item" class:selected={selectedObj?.label === d.label} onclick={() => selectObject(d)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectObject(d); }}>
                  <span class="color-swatch-mini" style="background: {d.color.hex}"></span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1">
                      <span class="font-brut text-brut-xs truncate capitalize">{d.label}</span>
                      <span class="model-pill">{d.model === 'mobilenetv2' ? 'MN2' : d.model === 'coco-ssd' ? 'AI' : 'MNet'}</span>
                    </div>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <span class="conf-dot" style="width:{(d.score*100).toFixed(0)}%;background:{getColorFor(d)}"></span>
                      <span class="text-brut-xs text-neo-darkgray">{(d.score*100).toFixed(0)}%</span>
                      <span class="text-brut-xs text-neo-darkgray capitalize">{d.color.name}</span>
                      <span class="text-brut-xs text-neo-darkgray">{d.color.hex}</span>
                    </div>
                    {#if d.color.r !== undefined}
                      <div class="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                        <span class="text-brut-2xs text-neo-darkgray font-mono">RGB({d.color.r},{d.color.g},{d.color.b})</span>
                        <span class="text-brut-2xs text-neo-darkgray font-mono">HSL({d.color.hsl.h}°{d.color.hsl.s}%{d.color.hsl.l}%)</span>
                      </div>
                    {/if}
                    {#if d.color.confusion?.length}
                      <div class="flex gap-1 mt-0.5 flex-wrap">
                        {#each d.color.confusion as cvd}
                          <span class="cvd-chip" title={cvd.label}>{cvd.type.slice(0,5)}</span>
                        {/each}
                      </div>
                    {/if}
                    {#if objPalettes[d.label] && objPalettes[d.label].length > 0}
                      <div class="flex gap-0.5 mt-0.5">
                        {#each objPalettes[d.label].slice(0, 4) as pc}
                          <span class="pal-mini" style="background:{pc.hex}" title="{pc.name}: {pc.percentage.toFixed(0)}%"></span>
                        {/each}
                      </div>
                    {/if}
                  </div>
                  <button class="cam-fav-btn" class:saved={savedIds.has(`${d.label}-${d.color.hex}`)} onclick={(e) => { e.stopPropagation(); saveAsFavorite(d); }} aria-label="Favorite">
                    <i class="fas fa-heart"></i>
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
{#if showStatusToast}
  <div class="toast" class:toast-error={statusToastType === 'error'} transition:fly={{ y: -20, duration: 200 }}>
    <i class="fas {statusToastType === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
    {statusToastMsg}
  </div>
{/if}

<style>
  .detect-page { margin: 0 auto; }
  .detect-page.camera-mode { position: fixed; inset: 0; z-index: 200; background: #0a0a0a; padding-bottom: 64px; }

  .cam-ui { display: flex; flex-direction: column; height: 100%; position: relative; }
  .cam-toolbar-mobile {
    position: absolute; top: 0; left: 0; right: 0; z-index: 20;
    display: flex; gap: 0.4rem; padding: 0.5rem;
    background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%);
  }
  .cam-controls-desktop { display: none; }
  .cam-main { flex: 1; display: flex; flex-direction: column; position: relative; overflow: hidden; }

  @media (min-width: 768px) {
    .detect-page.camera-mode { position: relative; inset: auto; z-index: auto; background: transparent; max-width: 900px; margin: 0 auto; padding: 0.5rem 0.75rem 5rem; }
    .detect-page.camera-mode .cam-ui { height: auto; min-height: 70vh; }
    .cam-toolbar-mobile { display: none; }
    .cam-controls-desktop { display: block; padding: 0 0 0.5rem; }
    .desk-toolbar-row { display: flex; gap: 0.4rem; align-items: center; }
    .desk-toolbar-row .tool-btn {
      width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
      border: 3px solid #0a0a0a; background: #fefefe; cursor: pointer; font-size: 1rem;
      transition: all 0.15s; box-shadow: 3px 3px 0 #0a0a0a;
    }
    .desk-toolbar-row .tool-btn:active { transform: scale(0.92); }
    .desk-mode { flex: 1; }
    .cam-main { border: 4px solid #0a0a0a; box-shadow: 6px 6px 0 #0a0a0a; flex: 1; }
    .cam-view { min-height: 320px; }
  }
  .cam-btn {
    width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
    border: 2px solid rgba(255,255,255,0.8); background: rgba(0,0,0,0.4);
    color: #fff; cursor: pointer; font-size: 1rem; transition: all 0.15s;
  }
  .cam-btn.mode { flex: 1; gap: 0.35rem; font-size: 0.85rem; border-color: var(--mc); }
  .cam-btn:active { transform: scale(0.92); }
  .cam-view { flex: 1; position: relative; opacity: 0; transition: opacity 0.3s; }
  .cam-view.show { opacity: 1; }
  .cam-viewfinder { position: absolute; inset: 0; overflow: hidden; background: #000; display: flex; align-items: center; justify-content: center; }
  .cam-viewfinder video { width: 100%; height: 100%; object-fit: contain; }
  .cam-viewfinder canvas { position: absolute; pointer-events: none; }
  .cam-badge {
    position: absolute; top: 56px; left: 8px; z-index: 15;
    padding: 0.25rem 0.5rem; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.3);
    color: #fff; backdrop-filter: blur(4px);
  }
  .cam-overlays {
    position: absolute; bottom: 0; left: 0; right: 0; z-index: 15;
    display: flex; flex-direction: column; gap: 0.4rem; padding: 0.5rem 0.5rem max(0.5rem,env(safe-area-inset-bottom,0.5rem));
    pointer-events: none;
  }
  .cam-overlays > * { pointer-events: auto; }
  .cam-info-panel-desktop { display: none; }
  @media (min-width: 768px) {
    .cam-overlays { display: none; }
    .cam-info-panel-desktop { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.5rem 0; max-width: 900px; margin: 0 auto; }
    .cam-color-bar-desktop { display: flex; align-items: center; gap: 0.5rem; }
    .desk-scene-badge { padding: 0.25rem 0.5rem; background: #fefefe; border: 2px solid #0a0a0a; box-shadow: 2px 2px 0 #0a0a0a; display: inline-flex; align-items: center; gap: 0.4rem; align-self: flex-start; }
    .desk-color-card {
      flex: 1; padding: 0.5rem 0.6rem; background: rgba(254,254,254,0.95); border: 3px solid;
      box-shadow: 4px 4px 0 #0a0a0a;
    }
    .desk-color-header { display: flex; align-items: center; gap: 0.5rem; width: 100%; }
    .desk-palette-bar { display: flex; align-items: center; gap: 0.25rem; flex-shrink: 0; }
    .pal-dot { width: 16px; height: 16px; border: 2px solid #0a0a0a; border-radius: 2px; flex-shrink: 0; }
    .desk-palette-bar .pal-dot:first-of-type { margin-left: 0.25rem; }
    .desk-detections { border: 3px solid #0a0a0a; background: #fefefe; box-shadow: 4px 4px 0 #0a0a0a; }
    .desk-dets-header { display: flex; align-items: center; justify-content: space-between; padding: 0.4rem 0.5rem; border-bottom: 2px solid #0a0a0a; }
    .desk-dets-list { max-height: 200px; overflow-y: auto; }
    .desk-det-item { display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.5rem; cursor: pointer; transition: background 0.1s; border-bottom: 1px solid rgba(10,10,10,0.08); }
    .desk-det-item:hover { background: #39ff1422; }
    .desk-det-item.selected { background: #39ff1433; }
    .desk-det-item:last-child { border-bottom: none; }
  }
  .cam-color-card {
    padding: 0.5rem 0.6rem; background: rgba(254,254,254,0.95); border: 3px solid;
    box-shadow: 4px 4px 0 #0a0a0a; backdrop-filter: blur(8px);
  }
  .cam-icon-btn {
    width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
    border: 2px solid #0a0a0a; background: #fefefe; cursor: pointer; font-size: 0.7rem; flex-shrink: 0; transition: all 0.15s;
  }
  .cam-icon-btn:hover { background: #ffd700; transform: scale(1.1); }
  .sim-row { display: flex; gap: 0.35rem; padding-top: 0.3rem; border-top: 2px solid rgba(10,10,10,0.1); margin-top: 0.3rem; }
  .sim-chip { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
  .sim-swatch { width: 100%; height: 14px; border: 2px solid #0a0a0a; }
  .sim-label { font: 700 0.5rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.03em; color: #666; }

  .cam-detections { background: rgba(254,254,254,0.95); border: 3px solid #0a0a0a; box-shadow: 4px 4px 0 #0a0a0a, 0 0 20px rgba(0,0,0,0.05); backdrop-filter: blur(12px); max-height: 40vh; display: flex; flex-direction: column; transition: max-height 0.3s ease; }
  .cam-dets-header { display: flex; align-items: center; justify-content: space-between; padding: 0.45rem 0.6rem; border-bottom: 3px solid #0a0a0a; background: linear-gradient(90deg, transparent, rgba(255,215,0,0.03)); }
  .cam-dets-save { padding: 0.3rem 0.6rem; border: 2px solid #0a0a0a; background: #fefefe; font: 700 0.6rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; cursor: pointer; transition: all 0.15s; box-shadow: 2px 2px 0 #0a0a0a; }
  .cam-dets-save:hover { background: #ffd700; transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #0a0a0a; }
  .cam-dets-save.saved { background: #39ff14; box-shadow: 1px 1px 0 #0a0a0a; transform: translate(1px,1px); }
  .cam-dets-save:disabled { opacity: 0.5; }
  .cam-dets-list { overflow-y: auto; flex: 1; scrollbar-width: thin; }
  .cam-det-item {
    display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.5rem;
    border-bottom: 1px solid rgba(10,10,10,0.06); cursor: pointer; transition: all 0.12s ease;
    position: relative;
  }
  .cam-det-item:hover { background: rgba(255,215,0,0.06); }
  .cam-det-item:active { background: rgba(255,215,0,0.15); transform: scale(0.98); }
  .cam-det-item.selected { background: linear-gradient(90deg, rgba(255,215,0,0.12), transparent); border-left: 3px solid #ffd700; box-shadow: inset 2px 0 0 #ffd700; }
  .model-pill { font-size: 0.5rem; font-weight: 700; text-transform: uppercase; padding: 0.08rem 0.3rem; border: 1px solid #0a0a0a; line-height: 1; background: #fefefe; }
  .conf-dot { height: 4px; border: 1px solid #0a0a0a; background: #e0e0e0; border-radius: 2px; transition: width 0.3s ease; }
  .cam-fav-btn { border: none; background: none; cursor: pointer; font-size: 0.75rem; color: #ddd; padding: 4px; transition: all 0.15s; }
  .cam-fav-btn:hover { color: #ff0033; transform: scale(1.25); text-shadow: 0 0 8px rgba(255,0,51,0.3); }
  .cam-fav-btn.saved { color: #ff0033; text-shadow: 0 0 6px rgba(255,0,51,0.3); }
  .pal-mini { width: 12px; height: 8px; border: 1px solid rgba(10,10,10,0.25); flex-shrink: 0; border-radius: 1px; }
  .pal-mini-upload { width: 14px; height: 10px; border: 1px solid rgba(10,10,10,0.25); flex-shrink: 0; border-radius: 1px; }
  .retrain-link { font-size: 0.55rem; font-weight: 700; text-transform: uppercase; color: #ff6b35; text-decoration: underline wavy; cursor: pointer; letter-spacing: 0.03em; transition: color 0.15s; }
  .retrain-link:hover { color: #ff0033; }
  .cvd-chip { font-size: 0.55rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.05rem 0.3rem; border: 1px solid #0a0a0a; background: rgba(255,0,51,0.08); color: #0a0a0a; line-height: 1.2; }
  .text-brut-2xs { font-size: 0.55rem; }

  .cam-palette { position: absolute; bottom: 0; left: 0; right: 0; z-index: 25; padding: 0.75rem; background: rgba(254,254,254,0.97); border-top: 4px solid #0a0a0a; box-shadow: 0 -4px 0 #0a0a0a; backdrop-filter: blur(8px); }
  .pal-chip { display: flex; flex-direction: column; align-items: center; gap: 1px; text-align: center; padding: 0.25rem; }
  .pal-swatch { width: 100%; height: 24px; border: 2px solid #0a0a0a; }

  .upload-ui { max-width: 900px; margin: 0 auto; padding: 0.5rem 0.75rem 5rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .toolbar { position: sticky; top: 0; z-index: 10; background: #fefefe; padding: 0.25rem 0; }
  .toolbar-row { display: flex; gap: 0.4rem; align-items: center; }
  .tool-btn {
    width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
    border: 3px solid #0a0a0a; background: #fefefe; cursor: pointer; font-size: 1rem;
    transition: all 0.15s; box-shadow: 3px 3px 0 #0a0a0a;
  }
  .tool-btn.active { background: #ffd700; box-shadow: 1px 1px 0 #0a0a0a; transform: translate(2px,2px); }
  .tool-btn:active { transform: scale(0.92); }
  .mode-selector {
    flex: 1; display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.75rem;
    border: 3px solid #0a0a0a; background: #fefefe; cursor: pointer;
    font: 700 0.75rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.04em;
    transition: all 0.15s; box-shadow: 3px 3px 0 #0a0a0a;
  }
  .mode-selector:active { transform: scale(0.97); }

  .view { position: relative; width: 100%; opacity: 0; transition: opacity 0.3s; }
  .view.show { opacity: 1; }
  .viewfinder { position: relative; width: 100%; border: 4px solid #0a0a0a; box-shadow: 6px 6px 0 #0a0a0a; overflow: hidden; background: #0a0a0a; }
  video, .img { width: 100%; display: block; }
  .viewfinder canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
  .highlight-canvas { z-index: 3; pointer-events: none !important; }
  .upload-zone {
    display: flex; align-items: center; justify-content: center; min-height: 280px;
    border: 4px dashed #0a0a0a; box-shadow: 6px 6px 0 #0a0a0a; padding: 2rem; cursor: pointer; transition: all 0.2s;
  }
  .upload-zone:hover { background: #ffd70008; transform: translateY(-2px); box-shadow: 8px 8px 0 #0a0a0a; }

  .swatch { width: 36px; height: 36px; border: 2px solid rgba(10,10,10,0.15); flex-shrink: 0; }

  .summary-bar { padding: 0.5rem 0.75rem; }
  .summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
  .summary-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; min-width: 0; }
  @media (max-width: 400px) { .summary-row { grid-template-columns: repeat(2, 1fr); } }

  .detections-panel { padding: 0.75rem; }
  .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
  .save-btn {
    display: flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.6rem;
    border: 2px solid #0a0a0a; background: #fefefe;
    font: 700 0.65rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase;
    cursor: pointer; transition: all 0.15s; box-shadow: 2px 2px 0 #0a0a0a;
  }
  .save-btn:hover { background: #ffd700; transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #0a0a0a; }
  .save-btn:disabled { opacity: 0.5; cursor: default; }
  .save-btn.saved { background: #39ff14; box-shadow: 1px 1px 0 #0a0a0a; transform: translate(1px,1px); }
  .detections-list { display: flex; flex-direction: column; gap: 0.25rem; max-height: 320px; overflow-y: auto; scrollbar-width: thin; }
  .detection-item {
    display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.5rem;
    border: 2px solid transparent; cursor: pointer; transition: all 0.15s ease;
    position: relative;
  }
  .detection-item:hover { border-color: #0a0a0a; background: rgba(255,215,0,0.05); transform: translateX(2px); }
  .detection-item.selected { border-color: #ffd700; background: linear-gradient(90deg, rgba(255,215,0,0.1), transparent); box-shadow: 3px 3px 0 #0a0a0a; }
  .color-swatch-mini { width: 22px; height: 22px; flex-shrink: 0; border: 2px solid #0a0a0a; border-radius: 2px; }
  .model-badge { font-size: 0.6rem; line-height: 1; padding: 0.1rem 0.35rem; border: 1px solid #0a0a0a; background: #fefefe; }
  .conf-bar { width: 48px; height: 7px; border: 2px solid #0a0a0a; background: #e0e0e0; overflow: hidden; border-radius: 2px; }
  .conf-fill { height: 100%; transition: width 0.3s ease; }
  .fav-btn { border: none; background: none; cursor: pointer; font-size: 0.85rem; color: #999; padding: 4px; transition: all 0.15s; }
  .fav-btn:hover { color: #ff0033; transform: scale(1.25); text-shadow: 0 0 8px rgba(255,0,51,0.3); }
  .fav-btn.saved { color: #ff0033; text-shadow: 0 0 6px rgba(255,0,51,0.3); }
  .palette-panel { padding: 0.75rem; }
  .color-chip { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem; border: 2px solid transparent; transition: all 0.15s; }
  .color-chip:hover { border-color: #0a0a0a; background: rgba(255,215,0,0.05); transform: translateX(2px); }
  .color-swatch { width: 28px; height: 28px; border: 2px solid rgba(10,10,10,0.15); flex-shrink: 0; border-radius: 2px; }
  .tags-panel { padding: 0.75rem; }
  .tag {
    display: inline-flex; align-items: center; padding: 0.2rem 0.6rem;
    font: 700 0.7rem/1 'Space Grotesk', system-ui, sans-serif; color: var(--c);
    border: 2px solid var(--c); background: rgba(10,10,10,0.04);
    text-transform: uppercase; letter-spacing: 0.03em; transition: all 0.15s;
    border-radius: 2px;
  }
  .tag:hover { background: rgba(10,10,10,0.12); transform: translateY(-2px); box-shadow: 3px 3px 0 #0a0a0a; }

  .loading-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(254,254,254,0.95); display: flex; align-items: center; justify-content: center; }
  .loading-card { background: #fefefe; border: 4px solid #0a0a0a; box-shadow: 8px 8px 0 #0a0a0a; padding: 2rem; text-align: center; min-width: 260px; max-width: 320px; }
  .progress-track { width: 100%; height: 12px; border: 3px solid #0a0a0a; background: #e0e0e0; overflow: hidden; }
  .progress-fill { height: 100%; background: #ffd700; transition: width 0.4s ease; }

  .model-err-banner {
    background: #ff0033; color: #fff; border: 2px solid #0a0a0a; padding: 0.3rem 0.6rem;
    font: 700 0.65rem/1.2 'Space Grotesk', system-ui, sans-serif; margin: 0.25rem 0.5rem;
  }

  .toast {
    position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 300;
    background: #39ff14; color: #0a0a0a; border: 3px solid #0a0a0a; box-shadow: 4px 4px 0 #0a0a0a;
    padding: 0.6rem 1.2rem; font: 700 0.75rem/1 'Space Grotesk', system-ui, sans-serif;
    display: flex; align-items: center; gap: 0.5rem; white-space: nowrap;
  }
  .toast.toast-error { background: #ff0033; color: #fff; }

  .scene-palette-panel { margin-top: 0.6rem; }
  .scene-palette-grid { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem; }
  .scene-chip {
    display: flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.5rem;
    background: #fefefe; border: 2px solid #0a0a0a; box-shadow: 2px 2px 0 #0a0a0a;
    cursor: pointer; transition: all 0.15s; width: calc(50% - 0.18rem);
  }
  .scene-chip:hover { transform: translate(-1px, -1px); box-shadow: 3px 3px 0 #0a0a0a; }
  .scene-chip.active { background: #39ff14; }
  .scene-swatch { width: 22px; height: 22px; border: 2px solid #0a0a0a; flex-shrink: 0; }
  .scene-chip-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
</style>