<script>
  import { onMount, tick } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import { loadModel, detectObjects, getColor } from '$lib/detection/objectDetection';
  import { loadTFModel, detectTF, getTFColor } from '$lib/detection/tfDetection';
  import { loadMobileNetModel, loadAllMobileNetModels, detectMobileNet, getMobileNetColor, getMobileNetModelKeys } from '$lib/detection/mobilenetDetection';
  import { sampleRegionColor, extractPalette, detectContour } from '$lib/detection/colorDetection';
  import { classifyScene, getSceneDescription } from '$lib/detection/sceneClassifier';
  import ModeSheet from '$lib/components/ModeSheet.svelte';
  import TourGuide from '$lib/components/TourGuide.svelte';
  import { scanHistory, favorites, savedColors, savedObjects, objectAnalytics, userSettings } from '$lib/supabase/db';
  import { session, user } from '$lib/stores/auth';
  import { notifyScanComplete, notifyColorSaved, notifyFavoriteSaved } from '$lib/supabase/notifications';
  import { speakColor, speakObject, speakMeatResult, speakMushroomResult } from '$lib/utils/voice';
  import { analyzeMeat, analyzeMushroom } from '$lib/detection/foodSafety';
  import { perfMode, objectDetectionEnabled, colorDetectionEnabled, realtimeDetection } from '$lib/stores/settings';

  let video = $state(null);
  let overlay = $state(null);
  let status = $state('');
  let useCamera = $state(true);
  let imageSrc = $state(null);
  let detections = $state([]);
  let focusColor = $state(null);
  let focusObj = $state(null);
  let sceneInfo = $state(null);

  let prevDets = [];
  let animId = null;
  let detectTimer = null;
  let srcCanvas = $state(null);
  let skip = 0;
  let currentStream = null;
  let frameCount = 0;
  let modelLoadErrors = $state([]);
  let detecting = false;
  let modeSwitchId = 0;

  let fusionRotationIndex = 0;
  let allFusionResults = [];
  const allModels = ['fusion', 'coco', 'drug', 'currency', 'accessibility', 'traffic_light'];
  const mobilenetModels = ['accessibility', 'currency', 'drug', 'traffic_light', 'meat', 'mushroom'];
  const tfModels = ['coco'];
  const fusionModels = ['coco', ...mobilenetModels];
  let cachedFrameCanvas = null;
  let scenePalette = $state([]);

  let objColors = $state([]);
  let objPalettes = $state({});
  let objContours = $state({});
  let selectedObj = $state(null);
  let engineMode = $state('coco');
  let expandedSummary = $state(false);
  let showSimulation = $state(false);
  let cvdCompare = $state(false);

  let showModeSheet = $state(false);
  let highlightActive = $state(false);
  let savedToHistory = $state(false);
  let saving = $state(false);
  let savedIds = $state(new Set());
  let savedObjIds = $state(new Set());
  let showStatusToast = $state(false);
  let statusToastMsg = $state('');
  let statusToastType = $state('success');
  let loadProgress = $state(0);

  let uploadedImages = $state([]);
  let currentImageIdx = $state(-1);
  let imageResults = new Map();
  let batchProcessing = $state(false);
  let batchTotal = $state(0);
  let batchCurrent = $state(0);
  let batchFileName = $state('');
  let batchCancelled = false;
  let loadStage = $state('');
  let showTour = $state(false);
  let wasDetecting = $state(false);
  let regionSel = $state(null);
  let regionDrag = $state(null);
  let _bufCanvas = null;
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

  const LOAD_STAGES = ['Initializing camera...', 'Loading detection models...', 'Loading MobileNetV2 model...', 'Warming up...', 'Ready'];

  function clearLoadTimeout() {
    if (loadTimeoutId) { clearTimeout(loadTimeoutId); loadTimeoutId = null; }
    if (loadForceReadyId) { clearTimeout(loadForceReadyId); loadForceReadyId = null; }
  }

  $effect(() => {
    if (status === 'Start') { loadProgress = 15; loadStage = LOAD_STAGES[0]; clearLoadTimeout(); }
    else if (status === 'Load') {
      loadProgress = 40; loadStage = LOAD_STAGES[1]; clearLoadTimeout();
      loadTimeoutId = setTimeout(() => {
        if (loadProgress === 40 && status === 'Load') {
          loadProgress = 80;
          loadStage = 'Still loading...';
        }
      }, 8000);
      loadForceReadyId = setTimeout(() => {
        if (loadProgress < 100 && (status === 'Load' || status === 'Detect')) {
          loadProgress = 100; loadStage = LOAD_STAGES[4];
          if (status === 'Load') status = '';
          setTimeout(() => { loadProgress = 0; loadStage = ''; }, 600);
        }
      }, 20000);
    }
    else if (status === 'Detect') { loadProgress = 60; loadStage = LOAD_STAGES[2]; clearLoadTimeout(); }
    else if (!status && loadProgress > 0 && loadProgress < 100) {
      loadProgress = 100; loadStage = LOAD_STAGES[4]; clearLoadTimeout();
      setTimeout(() => { loadProgress = 0; loadStage = ''; }, 600);
    }
    else if (status && status.includes('Error') || status?.includes('denied') || status?.includes('fail')) {
      clearLoadTimeout();
      loadProgress = 0; loadStage = '';
    }
  });

  function getEngineLabel(mode) {
    const labels = { fusion: 'Fusion', coco: 'COCO', drug: 'Medicine', currency: 'Currency', accessibility: 'Access', traffic_light: 'Traffic', meat: 'Meat', mushroom: 'Mushroom' };
    return labels[mode] || mode;
  }
  function getEngineIcon(mode) {
    const icons = { fusion: 'fa-compress-alt', coco: 'fa-globe', drug: 'fa-tablets', currency: 'fa-money-bill-wave', accessibility: 'fa-universal-access', traffic_light: 'fa-traffic-light', meat: 'fa-drumstick-bite', mushroom: 'fa-seedling' };
    return icons[mode] || 'fa-cube';
  }
  function getEngineColor(mode) {
    const colors = { fusion: '#ff3366', coco: '#00e5ff', drug: '#ff6b35', currency: '#ffd700', accessibility: '#00e5ff', traffic_light: '#ff0033', meat: '#ff6b6b', mushroom: '#9b59b6' };
    return colors[mode] || '#ffd700';
  }

  function getMobileNetModelKey(mode) {
    return mobilenetModels.includes(mode) ? mode : null;
  }

  async function switchMode(m) {
    if (m === engineMode) return;
    if (batchProcessing) { toast('Wait for current batch to finish', 'error'); return; }
    const swId = ++modeSwitchId;
    detecting = false;
    saveCurrentResultsToMap();
    engineMode = m;
    savedToHistory = false;
    detections = [];
    objColors = [];
    objPalettes = {};
    objContours = {};
    selectedObj = null;
    showObjPalette = false;
    focusColor = null;
    focusObj = null;
    prevDets = [];
    allFusionResults = [];
    fusionRotationIndex = 0;
    scenePalette = [];
    colorPickerPos = null;
    stopLoop();
    if (overlay) {
      const octx = overlay.getContext('2d');
      if (octx) octx.clearRect(0, 0, overlay.width, overlay.height);
    }
    clearLoadTimeout();
    try {
      await reloadModels();
    } catch (e) {
      console.warn('Model reload error:', e);
      toast('Some models failed to load', 'error');
    }
    if (swId !== modeSwitchId) return;
    status = '';
    if (useCamera && video) {
      const detInterval = $perfMode === 'performance' ? 1200 : $perfMode === 'quality' ? 400 : 800;
      detectTimer = setInterval(() => runDetectionFrame(true), detInterval);
      animId = requestAnimationFrame(drawLoop);
    } else if (imageSrc && currentImageIdx >= 0) {
      detectId++;
      runDetect(detectId, currentImageIdx);
    }
  }

  async function reloadModels() {
    status = 'Load';
    const modelsToLoad = [];
    if (engineMode === 'fusion') {
      modelsToLoad.push(loadTFModel());
      modelsToLoad.push(loadAllMobileNetModels());
    } else if (tfModels.includes(engineMode)) {
      modelsToLoad.push(loadTFModel());
    } else if (mobilenetModels.includes(engineMode)) {
      modelsToLoad.push(loadMobileNetModel(engineMode));
    } else {
      modelsToLoad.push(loadTFModel());
    }
    await Promise.allSettled(modelsToLoad);
  }
  let showObjPalette = $state(false);
  let objPalette = $state([]);
  let analyzingObj = $state(false);
  let colorPickerActive = $state(false);
  let colorPickerPos = $state(null);
  let colorPreviewPos = $state(null);
  let colorPreviewHex = $state(null);
  let colorPreviewName = $state(null);
  let crosshairPos = $state(null);
  let colorPickerResult = $state(null);
  let showColorPickerModal = $state(false);
  let loadTimeoutId = null;
  let loadForceReadyId = null;
  let toastTimeoutId = null;

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

  onMount(() => {
    srcCanvas = document.createElement('canvas');
    if (useCamera) init();
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('clrblind_tour_completed')) {
      setTimeout(() => { showTour = true; }, 1000);
    }
    window.addEventListener('resize', positionOverlay);
    return () => {
      window.removeEventListener('resize', positionOverlay);
      if (animId) cancelAnimationFrame(animId);
      if (detectTimer) { clearInterval(detectTimer); detectTimer = null; }
      if (toastTimeoutId) { clearTimeout(toastTimeoutId); toastTimeoutId = null; }
      if (loadTimeoutId) { clearTimeout(loadTimeoutId); loadTimeoutId = null; }
      if (loadForceReadyId) { clearTimeout(loadForceReadyId); loadForceReadyId = null; }
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
        currentStream = null;
      }
    };
  });

  function stopLoop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (detectTimer) { clearInterval(detectTimer); detectTimer = null; }
    detecting = false;
    if (detectTimeoutId) { clearTimeout(detectTimeoutId); detectTimeoutId = null; }
    allFusionResults = [];
  }

  function toast(msg, type = 'success') {
    statusToastMsg = msg;
    statusToastType = type;
    showStatusToast = true;
    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    toastTimeoutId = setTimeout(() => { showStatusToast = false; toastTimeoutId = null; }, 3000);
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
        if (!savedObjIds.has(d.label)) {
          try {
            await savedObjects.create({ objectName: d.label, notes: `Color: ${d.color.name} ${d.color.hex} | Mode: ${engineMode} | Conf: ${(d.score * 100).toFixed(0)}%` });
            savedObjIds = new Set([...savedObjIds, d.label]);
          } catch (_) {}
        }
      }
      try { await notifyScanComplete(objColors.length, engineMode); } catch (_) {}
      saveCurrentResultsToMap();
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
      saveCurrentResultsToMap();
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
      saveCurrentResultsToMap();
      toast(`"${color.name}" saved!`, 'success');
    } catch (e) {
      console.warn('Could not save color:', e);
      toast('Could not save color', 'error');
    }
  }

  async function saveObject(d) {
    const id = d.label;
    if (savedObjIds.has(id)) return;
    savedObjIds = new Set([...savedObjIds, id]);
    try {
      const notes = `Color: ${d.color.name} ${d.color.hex} | Mode: ${engineMode} | Conf: ${(d.score * 100).toFixed(0)}%`;
      await savedObjects.create({ objectName: d.label, notes });
      saveCurrentResultsToMap();
      toast(`"${d.label}" object saved!`, 'success');
    } catch (e) {
      console.warn('Could not save object:', e);
      savedObjIds = new Set([...savedObjIds].filter(x => x !== id));
      toast('Could not save object', 'error');
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
      if (!video) { status = ''; return; }
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
      if (engineMode === 'fusion') {
        modelsToLoad.push(loadTFModel());
        modelNames.push('COCO-SSD');
        modelsToLoad.push(loadAllMobileNetModels());
        modelNames.push('MobileNetV2 All');
      } else if (tfModels.includes(engineMode)) {
        modelsToLoad.push(loadTFModel());
        modelNames.push('COCO-SSD');
      } else if (mk) {
        modelsToLoad.push(loadMobileNetModel(mk));
        modelNames.push(`MobileNetV2 ${getEngineLabel(engineMode)}`);
      } else {
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
      const detInterval = $perfMode === 'performance' ? 1200 : $perfMode === 'quality' ? 400 : 800;
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
    if (d.model === 'coco-ssd') return getTFColor(d.label);
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

  function extractPalettesAndContours(source, dets) {
    setTimeout(async () => {
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
    saveCurrentResultsToMap();
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

  async function detectFrameOnly(skipCheck) {
    if (!$colorDetectionEnabled || !video || !overlay) { if (detecting) detecting = false; return; }
    const cw = overlay.width, ch = overlay.height;
    if (cw < 1 || ch < 1) { if (detecting) detecting = false; return; }
    const swId = modeSwitchId;
    const fc = sampleRegionColor(video, cw * 0.3, ch * 0.3, cw * 0.4, ch * 0.4);
    if (swId !== modeSwitchId) { detecting = false; return; }
    focusColor = fc;
    if (detecting) detecting = false;
  }

  let detectTimeoutId = null;

  async function runDetectionFrame(skipCheck) {
    if (!video || !useCamera || !overlay || tabHidden) { return; }
    if (detecting) {
      if (detectTimeoutId) clearTimeout(detectTimeoutId);
      detectTimeoutId = setTimeout(() => { detecting = false; }, 3000);
      return;
    }
    if (!$objectDetectionEnabled) { detectFrameOnly(skipCheck); return; }
    if (!skipCheck) {
      skipFrameCounter++;
      if (skipFrameCounter % 3 !== 0) return;
    }
    detecting = true;
    if (detectTimeoutId) clearTimeout(detectTimeoutId);
    detectTimeoutId = setTimeout(() => { detecting = false; }, 5000);
    const swId = modeSwitchId;
    frameCount++;
    try {
      const frame = captureFrame(video);
      let results = [];
      const mk = getMobileNetModelKey(engineMode);

      if (engineMode === 'fusion') {
        const now = Date.now();
        allFusionResults = allFusionResults.filter(r => now - r.ts < 5000);
        const batchSize = $perfMode === 'performance' ? 2 : $perfMode === 'quality' ? 5 : 3;
        for (let b = 0; b < batchSize; b++) {
          const modelId = fusionModels[fusionRotationIndex % fusionModels.length];
          fusionRotationIndex++;
          let batchResults;
          if (modelId === 'coco') batchResults = await detectTF(frame).catch(() => []);
          else batchResults = await detectMobileNet(frame, modelId).catch(() => []);
          for (const r of batchResults) { r._fusionModel = modelId; r.ts = now; allFusionResults.push(r); }
        }
        results = dedupDetections(allFusionResults);
      } else if (mk) {
        results = await detectMobileNet(frame, mk).catch(() => []);
      } else {
        results = await detectTF(frame).catch(() => []);
      }
      if (swId !== modeSwitchId) { detecting = false; if (detectTimeoutId) clearTimeout(detectTimeoutId); detectTimeoutId = null; return; }

      const minScore = $perfMode === 'quality' ? 0.4 : $perfMode === 'performance' ? 0.2 : 0.3;
      results = results.filter(d => d.score >= minScore);
      results.sort((a, b) => b.score - a.score);
      if (engineMode === 'meat') results = results.map(d => ({ ...d, analysis: analyzeMeat(d.label, d.score) }));
      else if (engineMode === 'mushroom') results = results.map(d => ({ ...d, analysis: analyzeMushroom(d.label, d.score) }));
      const raw = results.slice(0, 15);
      const cw = overlay.width, ch = overlay.height;
      if (!prevDets.length) prevDets = raw;
      const sm = raw.map((d, i) => {
        if (i >= prevDets.length) return d;
        const p = prevDets[i];
        return { ...d, x1: lerp(p.x1, d.x1, 0.3), y1: lerp(p.y1, d.y1, 0.3), x2: lerp(p.x2, d.x2, 0.3), y2: lerp(p.y2, d.y2, 0.3), width: lerp(p.width, d.width, 0.3), height: lerp(p.height, d.height, 0.3) };
      });
      prevDets = raw;
      if (swId !== modeSwitchId) { detecting = false; return; }
      detections = sm;

      const colored = await sampleObjColors(video, sm);
      if (swId !== modeSwitchId) { detecting = false; return; }
      objColors = colored;

      const best = pickNearestCenter(sm, cw, ch);
      if (best) {
        const fc = sampleRegionColor(video, best.x1, best.y1, best.width, best.height);
        if (swId !== modeSwitchId) { detecting = false; return; }
        if (focusObj !== best.label) {
          if (engineMode === 'meat') speakMeatResult(best.label, best.score);
          else if (engineMode === 'mushroom') speakMushroomResult(best.label, best.score);
          else speakObject(best.label, best.score);
        }
        focusObj = best.label;
        focusColor = fc;
      } else {
        const fc = sampleRegionColor(video, cw * 0.3, ch * 0.3, cw * 0.4, ch * 0.4);
        if (swId !== modeSwitchId) { detecting = false; return; }
        focusObj = null;
        focusColor = fc;
      }

      if (frameCount % 3 === 0) {
        const fullPalette = extractPalette(video, 8);
        if (swId !== modeSwitchId) { detecting = false; return; }
        scenePalette = fullPalette;
      }
    } catch (e) { console.error('detection error:', e); }
    detecting = false;
    if (detectTimeoutId) { clearTimeout(detectTimeoutId); detectTimeoutId = null; }
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
        drawFrame(detections, focusObj ? detections.find(d => d.label === focusObj) : null, cw, ch, objColors, drawLoopCtx, focusColor);
      }
      detectionsDirty = false;
    }
    animId = requestAnimationFrame(drawLoop);
  }

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

  function drawMagnifier(ctx, pos, radius = 60, zoom = 3) {
    const src = useCamera ? video : srcCanvas;
    if (!src || !pos) return;
    const srcR = radius / zoom;
    const sx = Math.max(0, pos.x - srcR);
    const sy = Math.max(0, pos.y - srcR);
    const srcW = src.videoWidth || src.width || 0;
    const srcH = src.videoHeight || src.height || 0;
    const sw = Math.min(srcW - sx, srcR * 2);
    const sh = Math.min(srcH - sy, srcR * 2);
    if (sw < 1 || sh < 1) return;

    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = 'rgba(255,215,0,0.45)';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0a';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius - 1, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(src, sx, sy, sw, sh, pos.x - radius, pos.y - radius, radius * 2, radius * 2);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      const gx = pos.x - radius + (radius * 2 / 4) * i;
      ctx.beginPath(); ctx.moveTo(gx, pos.y - radius); ctx.lineTo(gx, pos.y + radius); ctx.stroke();
      const gy = pos.y - radius + (radius * 2 / 4) * i;
      ctx.beginPath(); ctx.moveTo(pos.x - radius, gy); ctx.lineTo(pos.x + radius, gy); ctx.stroke();
    }

    ctx.strokeStyle = '#ff0033';
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(255,0,51,0.6)';
    ctx.beginPath();
    ctx.moveTo(pos.x - 10, pos.y); ctx.lineTo(pos.x + 10, pos.y);
    ctx.moveTo(pos.x, pos.y - 10); ctx.lineTo(pos.x, pos.y + 10);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
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

  function dedupDetections(dets) {
    const iou = (a, b) => {
      const x1 = Math.max(a.x1, b.x1), y1 = Math.max(a.y1, b.y1);
      const x2 = Math.min(a.x2, b.x2), y2 = Math.min(a.y2, b.y2);
      const i = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
      const u = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - i;
      return u > 0 ? i / u : 0;
    };
    const kept = [];
    for (const d of dets) {
      if (!kept.some(k => k.label === d.label && iou(k, d) > 0.5)) {
        kept.push(d);
      }
    }
    return kept;
  }

  function drawFrame(preds, focus, cw, ch, colors = [], ctx, _focusColor = null) {
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
        ctx.lineWidth = isSel ? 4 : 2.5;
        ctx.strokeRect(x1, y1, w, h);
        ctx.fillStyle = col + '15';
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
          const swatchX = bx + tw + 12;
          const swatchY = by + 2;
          const swatchSize = 18;
          ctx.shadowBlur = 6;
          ctx.shadowColor = objColor.hex + '88';
          ctx.beginPath();
          ctx.arc(swatchX + swatchSize / 2, swatchY + swatchSize / 2, swatchSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = objColor.hex;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#0a0a0a';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        if (objColor && objColor.samplePos) {
          const sp = objColor.samplePos;
          ctx.save();
          ctx.shadowBlur = 6;
          ctx.shadowColor = objColor.hex + 'aa';
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = objColor.hex;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.strokeStyle = '#0a0a0a';
          ctx.lineWidth = 0.8;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(sp.x - 8, sp.y); ctx.lineTo(sp.x + 8, sp.y);
          ctx.moveTo(sp.x, sp.y - 8); ctx.lineTo(sp.x, sp.y + 8);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
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

      if (_focusColor && _focusColor.samplePos) {
        const sp = _focusColor.samplePos;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(sp.x - 30, sp.y - 30, 60, 60);
        ctx.setLineDash([]);
        ctx.shadowBlur = 12;
        ctx.shadowColor = _focusColor.hex + 'aa';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = _focusColor.hex;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = '#0a0a0a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sp.x - 14, sp.y); ctx.lineTo(sp.x + 14, sp.y);
        ctx.moveTo(sp.x, sp.y - 14); ctx.lineTo(sp.x, sp.y + 14);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = `700 11px 'Space Grotesk', system-ui, sans-serif`;
        const ft = `Focus: ${_focusColor.name} ${_focusColor.hex}`;
        const ftw = ctx.measureText(ft).width;
        const ftx = Math.max(4, Math.min(sp.x - ftw / 2 - 6, cw - ftw - 10));
        const fty = Math.max(24, sp.y - 38);
        ctx.fillStyle = 'rgba(10,10,10,0.8)';
        ctx.shadowBlur = 0;
        roundRect(ctx, ftx, fty, ftw + 12, 22, 4);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.fillText(ft, ftx + 6, fty + 15);
        ctx.restore();
      }
      if (scenePalette.length > 0) {
        for (const pc of scenePalette) {
          if (!pc.positions || !pc.positions[0]) continue;
          const pos = pc.positions[0];
          ctx.save();
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = pc.hex;
          ctx.shadowBlur = 6;
          ctx.shadowColor = pc.hex + '88';
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
      }
      if (cvdCompare && frameTick % 3 === 0) {
        try {
          const srcEl = document.querySelector('.cam-viewfinder video') || document.querySelector('.viewfinder img');
          if (srcEl) {
            const off = document.createElement('canvas');
            off.width = cw; off.height = ch;
            const offCtx = off.getContext('2d');
            offCtx.drawImage(/** @type {CanvasImageSource} */ (srcEl), 0, 0, cw, ch);
            const hw = Math.floor(cw / 2);
            const imgData = offCtx.getImageData(hw, 0, cw - hw, ch);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
              const r = d[i], g = d[i + 1], b = d[i + 2];
              d[i] = Math.min(255, 0.567 * r + 0.433 * g);
              d[i + 1] = Math.min(255, 0.558 * r + 0.442 * g);
              d[i + 2] = Math.min(255, 0.242 * g + 0.758 * b);
            }
            ctx.putImageData(imgData, hw, 0);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.beginPath(); ctx.moveTo(hw, 0); ctx.lineTo(hw, ch); ctx.stroke();
            ctx.setLineDash([]);
            ctx.font = `700 11px 'Space Grotesk', system-ui, sans-serif`;
            ctx.fillStyle = 'rgba(10,10,10,0.7)';
            ctx.shadowBlur = 0;
            ctx.fillText('Normal', 8, 20);
            ctx.fillText('Protanopia Sim', hw + 8, 20);
          }
        } catch (_) {}
      }
      if (crosshairPos && colorPickerActive) {
        const { x, y } = crosshairPos;
        const len = 12, gap = 4;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - len, y); ctx.lineTo(x - gap, y);
        ctx.moveTo(x + gap, y); ctx.lineTo(x + len, y);
        ctx.moveTo(x, y - len); ctx.lineTo(x, y - gap);
        ctx.moveTo(x, y + gap); ctx.lineTo(x, y + len);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, len + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (highlightActive && _focusColor?.samplePos) {
        drawMagnifier(ctx, _focusColor.samplePos);
      }
    } catch (e) { console.error('drawFrame error:', e); }
  }

  let detectId = 0;

  function handleUpload(e) {
    const files = Array.from(e.target.files || []);
    processFiles(files).catch(e => { console.error('Upload error:', e); toast('Error processing files', 'error'); });
    e.target.value = '';
  }

  async function processFiles(files) {
    if (!files.length) return;
    const maxSize = 20 * 1024 * 1024;
    const maxTotal = 50;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
    let remaining = maxTotal - uploadedImages.length;
    if (remaining <= 0) { toast(`Max ${maxTotal} images reached`, 'error'); return; }
    const valid = files.filter(f => {
      if (f.size > maxSize) { toast(`"${f.name}" too large — max 20MB`, 'error'); return false; }
      if (!validTypes.includes(f.type)) { toast(`"${f.name}" unsupported type`, 'error'); return false; }
      return true;
    }).slice(0, remaining);
    if (!valid.length) return;
    if (valid.length < files.length) { toast(`Processing ${valid.length} of ${files.length} (max ${maxTotal})`, 'info'); }
    saveCurrentResultsToMap();
    batchProcessing = true;
    batchCancelled = false;
    batchTotal = valid.length;
    batchCurrent = 0;
    const total = valid.length;
    status = `Processing ${total} image${total > 1 ? 's' : ''}...`;
    for (let fi = 0; fi < total; fi++) {
      if (batchCancelled) { toast('Batch cancelled', 'info'); break; }
      batchCurrent = fi + 1;
      const f = valid[fi];
      batchFileName = f.name;
      const imgId = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + fi;
      const src = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = (ev) => resolve(ev.target?.result);
        r.onerror = () => resolve(null);
        r.readAsDataURL(f);
      });
      if (!src) { toast(`Failed to read "${f.name}"`, 'error'); continue; }
      const entry = { id: imgId, src, name: f.name, size: f.size };
      const newIdx = uploadedImages.length;
      imageResults.set(imgId, { src, detections: [], objColors: [], focusColor: null, focusObj: null, sceneInfo: null, scenePalette: [], objPalettes: {}, objContours: {}, selectedObj: null, showObjPalette: false, objPalette: [], savedToHistory: false, savedIds: new Set(), savedObjIds: new Set(), modelLoadErrors: [] });
      uploadedImages = [...uploadedImages, entry];
      switchToImage(newIdx);
      await runDetectForImage(newIdx);
    }
    batchProcessing = false;
    status = '';
    if (!batchCancelled) toast(`Processed ${total} image${total > 1 ? 's' : ''}`, 'success');
  }

  async function runDetectForImage(idx) {
    if (idx < 0 || idx >= uploadedImages.length) return;
    const entry = uploadedImages[idx];
    if (!entry?.src) return;
    saveCurrentResultsToMap();
    currentImageIdx = idx;
    imageSrc = entry.src;
    detections = []; objColors = []; selectedObj = null; showObjPalette = false;
    focusColor = null; focusObj = null; savedToHistory = false; scenePalette = [];
    sceneInfo = null; objPalettes = {}; objContours = {};
    await tick();
    detectId++;
    const myId = detectId;
    await runDetect(myId, idx);
  }

  async function runDetect(myId, imageIdx) {
    if (!imageSrc) return;
    const img = new Image();
    return new Promise((resolve) => {
    img.onerror = () => { toast('Failed to load image', 'error'); status = ''; resolve(); };
    img.onload = async () => {
      if (myId !== undefined && myId !== detectId) return;
      try {
        status = 'Detect';
        const modelsToLoad = [];
        if (engineMode === 'fusion') {
          modelsToLoad.push(loadTFModel());
          modelsToLoad.push(loadAllMobileNetModels());
        } else if (tfModels.includes(engineMode)) {
          modelsToLoad.push(loadTFModel());
        } else if (mobilenetModels.includes(engineMode)) {
          modelsToLoad.push(loadMobileNetModel(engineMode));
        } else {
          modelsToLoad.push(loadTFModel());
        }
        await Promise.allSettled(modelsToLoad);
        if (myId !== undefined && myId !== detectId) return;
        if (srcCanvas) { srcCanvas.width = img.naturalWidth; srcCanvas.height = img.naturalHeight; srcCanvas.getContext('2d').drawImage(img, 0, 0); }
        if (overlay) { overlay.width = img.naturalWidth; overlay.height = img.naturalHeight; }
        const frame = captureFrame(img);
        const mk = getMobileNetModelKey(engineMode);
        let allResults = [];
        if (engineMode === 'fusion') {
          const [tfR, ...mobileR] = await Promise.all([
            detectTF(frame).catch(() => []),
            ...mobilenetModels.map(mk2 => detectMobileNet(frame, mk2).catch(() => []))
          ]);
          allResults = [].concat(tfR, ...mobileR);
        } else if (tfModels.includes(engineMode)) {
          allResults = await detectTF(frame).catch(() => []);
        } else if (mk) {
          allResults = await detectMobileNet(frame, mk).catch(() => []);
        }
        if (myId !== undefined && myId !== detectId) return;
        let results = allResults.filter(d => d.score >= ($perfMode === 'quality' ? 0.4 : $perfMode === 'performance' ? 0.2 : 0.3));
        results.sort((a, b) => b.score - a.score);
        if (engineMode === 'meat') results = results.map(d => ({ ...d, analysis: analyzeMeat(d.label, d.score) }));
        else if (engineMode === 'mushroom') results = results.map(d => ({ ...d, analysis: analyzeMushroom(d.label, d.score) }));
        detections = results;

        const colored = await sampleObjColors(img, results);
        objColors = colored;

        if (myId !== undefined && myId !== detectId) return;
        if (results.length > 0) {
          const cw = overlay?.width || img.naturalWidth;
          const ch = overlay?.height || img.naturalHeight;
          const best = pickNearestCenter(results, cw, ch);
          if (best) {
            const col = colored.find(c => c.label === best.label)?.color || null;
            if (myId !== undefined && myId !== detectId) return;
        if (focusObj !== best.label) {
          if (engineMode === 'meat') speakMeatResult(best.label, best.score);
          else if (engineMode === 'mushroom') speakMushroomResult(best.label, best.score);
          else speakObject(best.label, best.score);
        }
            focusObj = best.label;
            focusColor = col;
          }
        }
        if (!focusColor) {
          const fc = sampleRegionColor(img, 0, 0, img.naturalWidth, img.naturalHeight);
          if (myId !== undefined && myId !== detectId) return;
          focusObj = null;
          focusColor = fc;
        }

        classifyScene(img).then(s => { sceneInfo = s; }).catch(() => {});
        scenePalette = extractPalette(img, 10);

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
                ctx.shadowBlur = 0;
              }

              if (objColor) {
                ctx.fillStyle = objColor.hex + '25';
                ctx.fillRect(d.x1, d.y1, d.width, d.height);
                ctx.fillStyle = objColor.hex + '40';
                ctx.fillRect(d.x1 + d.width * 0.1, d.y1 + d.height * 0.1, d.width * 0.8, d.height * 0.8);

                if (objColor.samplePos) {
                  const sp = objColor.samplePos;
                  ctx.save();
                  ctx.shadowBlur = 8;
                  ctx.shadowColor = objColor.hex + 'cc';
                  ctx.beginPath();
                  ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
                  ctx.fillStyle = objColor.hex;
                  ctx.fill();
                  ctx.shadowBlur = 0;
                  ctx.strokeStyle = '#fff';
                  ctx.lineWidth = 2.5;
                  ctx.stroke();
                  ctx.strokeStyle = '#0a0a0a';
                  ctx.lineWidth = 1;
                  ctx.setLineDash([2, 2]);
                  ctx.beginPath();
                  ctx.moveTo(sp.x - 10, sp.y); ctx.lineTo(sp.x + 10, sp.y);
                  ctx.moveTo(sp.x, sp.y - 10); ctx.lineTo(sp.x, sp.y + 10);
                  ctx.stroke();
                  ctx.setLineDash([]);
                  ctx.restore();
                }
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
              const swatchW = objColor ? 20 : 0;
              const pillW = tw + 16 + swatchW;
              ctx.fillStyle = col; ctx.globalAlpha = 0.9;
              ctx.shadowBlur = 3; ctx.shadowColor = 'rgba(0,0,0,0.3)';
              roundRect(ctx, d.x1, d.y1 - 22, pillW, 22, 4);
              ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
              ctx.fillStyle = '#0a0a0a';
              ctx.fillText(label, d.x1 + 5, d.y1 - 6);
              if (objColor) {
                const cx = d.x1 + tw + 12;
                const cy = d.y1 - 12;
                ctx.shadowBlur = 8;
                ctx.shadowColor = objColor.hex + '99';
                ctx.beginPath();
                ctx.arc(cx + 8, cy, 8, 0, Math.PI * 2);
                ctx.fillStyle = objColor.hex;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#0a0a0a';
                ctx.lineWidth = 2;
                ctx.stroke();
              }
              ctx.restore();
            }

            if (focusColor && focusColor.samplePos) {
              const sp = focusColor.samplePos;
              ctx.save();
              ctx.strokeStyle = 'rgba(255,255,255,0.9)';
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 4]);
              ctx.strokeRect(sp.x - 30, sp.y - 30, 60, 60);
              ctx.setLineDash([]);
              ctx.shadowBlur = 12;
              ctx.shadowColor = focusColor.hex + 'aa';
              ctx.beginPath();
              ctx.arc(sp.x, sp.y, 8, 0, Math.PI * 2);
              ctx.fillStyle = focusColor.hex;
              ctx.fill();
              ctx.shadowBlur = 0;
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 3;
              ctx.stroke();
              ctx.strokeStyle = '#0a0a0a';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(sp.x - 14, sp.y); ctx.lineTo(sp.x + 14, sp.y);
              ctx.moveTo(sp.x, sp.y - 14); ctx.lineTo(sp.x, sp.y + 14);
              ctx.stroke();
              ctx.restore();

              ctx.save();
              ctx.font = `700 11px 'Space Grotesk', system-ui, sans-serif`;
              const ft = `Focus: ${focusColor.name} ${focusColor.hex}`;
              const ftw = ctx.measureText(ft).width;
              const ftx = Math.max(4, Math.min(sp.x - ftw / 2 - 6, overlay.width - ftw - 10));
              const fty = Math.max(24, sp.y - 38);
              ctx.fillStyle = 'rgba(10,10,10,0.8)';
              ctx.shadowBlur = 0;
              roundRect(ctx, ftx, fty, ftw + 12, 22, 4);
              ctx.fill();
              ctx.fillStyle = '#fff';
              ctx.fillText(ft, ftx + 6, fty + 16);
              ctx.restore();
            }
            if (scenePalette.length > 0) {
              for (const pc of scenePalette) {
                if (!pc.positions || !pc.positions[0]) continue;
                const pos = pc.positions[0];
                ctx.save();
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = pc.hex;
                ctx.shadowBlur = 8;
                ctx.shadowColor = pc.hex + 'aa';
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
              }
            }
            if (highlightActive && focusColor?.samplePos) {
              drawMagnifier(ctx, focusColor.samplePos);
            }
          } catch (e) { console.error('upload draw error:', e); }
          if (!_bufCanvas) _bufCanvas = document.createElement('canvas');
          _bufCanvas.width = overlay.width; _bufCanvas.height = overlay.height;
          _bufCanvas.getContext('2d').drawImage(overlay, 0, 0);
        }
        status = '';
        if (imageIdx !== undefined && imageIdx >= 0 && imageIdx < uploadedImages.length) {
          const imgId = uploadedImages[imageIdx].id;
          imageResults.set(imgId, {
            src: imageSrc, detections: [...detections], objColors: [...objColors],
            focusColor, focusObj, sceneInfo, scenePalette: [...scenePalette],
            objPalettes: { ...objPalettes }, objContours: { ...objContours },
            selectedObj, showObjPalette, objPalette: [...objPalette],
            savedToHistory, savedIds: new Set(savedIds), savedObjIds: new Set(savedObjIds),
            modelLoadErrors: [...modelLoadErrors],
          });
        }
        resolve();
      } catch (e) { status = e?.message || 'Error'; console.error(e); resolve(); }
    };
    img.src = imageSrc;
    });
  }

  function saveCurrentResultsToMap() {
    if (currentImageIdx < 0 || currentImageIdx >= uploadedImages.length) return;
    const id = uploadedImages[currentImageIdx].id;
    imageResults.set(id, {
      src: imageSrc, detections, objColors, focusColor, focusObj,
      sceneInfo, scenePalette, objPalettes: { ...objPalettes },
      objContours: { ...objContours },
      selectedObj, showObjPalette, objPalette: [...objPalette],
      savedToHistory, savedIds: new Set(savedIds), savedObjIds: new Set(savedObjIds),
      modelLoadErrors: [...modelLoadErrors],
    });
  }

  function loadResultsFromMap(idx) {
    if (idx < 0 || idx >= uploadedImages.length) return;
    const id = uploadedImages[idx].id;
    const r = imageResults.get(id);
    if (!r) return;
    imageSrc = r.src; detections = r.detections; objColors = r.objColors;
    focusColor = r.focusColor; focusObj = r.focusObj; sceneInfo = r.sceneInfo;
    scenePalette = r.scenePalette; objPalettes = r.objPalettes;
    objContours = r.objContours; selectedObj = r.selectedObj;
    showObjPalette = r.showObjPalette; objPalette = r.objPalette;
    savedToHistory = r.savedToHistory;
    savedIds = new Set(r.savedIds); savedObjIds = new Set(r.savedObjIds);
    modelLoadErrors = [...(r.modelLoadErrors || [])];
  }

  function switchToImage(idx) {
    if (idx === currentImageIdx) return;
    if (idx < 0 || idx >= uploadedImages.length) return;
    saveCurrentResultsToMap();
    currentImageIdx = idx;
    loadResultsFromMap(idx);
    if (overlay) {
      const octx = overlay.getContext('2d');
      if (octx) octx.clearRect(0, 0, overlay.width, overlay.height);
    }
    if (uploadedImages[idx]?.src) {
      const img = new Image();
      img.onload = () => {
        if (overlay) { overlay.width = img.naturalWidth; overlay.height = img.naturalHeight; }
        if (srcCanvas) { srcCanvas.width = img.naturalWidth; srcCanvas.height = img.naturalHeight; }
      };
      img.onerror = () => { toast('Failed to load image', 'error'); };
      img.src = uploadedImages[idx].src;
    }
  }

  function removeImage(idx) {
    if (idx < 0 || idx >= uploadedImages.length) return;
    const id = uploadedImages[idx].id;
    imageResults.delete(id);
    uploadedImages = uploadedImages.filter((_, i) => i !== idx);
    if (uploadedImages.length === 0) {
      currentImageIdx = -1;
      imageSrc = null; detections = []; objColors = []; focusColor = null; focusObj = null;
      sceneInfo = null; scenePalette = []; objPalettes = {}; objContours = {};
      selectedObj = null; showObjPalette = false; objPalette = [];
      savedToHistory = false; savedIds = new Set(); savedObjIds = new Set();
      modelLoadErrors = [];
      if (overlay) { const octx = overlay.getContext('2d'); if (octx) octx.clearRect(0, 0, overlay.width, overlay.height); }
    } else {
      const newIdx = Math.min(idx, uploadedImages.length - 1);
      switchToImage(newIdx);
    }
  }

  function selectObject(d) {
    selectedObj = selectedObj?.label === d.label ? null : d;
    const source = useCamera ? video : srcCanvas;
    if (selectedObj && source) analyzeObjPalette(source, selectedObj);
    else { showObjPalette = false; objPalette = []; }
  }

  function redrawOverlay() {
    if (!overlay || !imageSrc) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    if (_bufCanvas) {
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.drawImage(_bufCanvas, 0, 0);
    }
    if (regionSel) {
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(regionSel.x1, regionSel.y1, regionSel.x2 - regionSel.x1, regionSel.y2 - regionSel.y1);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(regionSel.x1, regionSel.y1, regionSel.x2 - regionSel.x1, regionSel.y2 - regionSel.y1);
      ctx.setLineDash([]);
      const cx = (regionSel.x1 + regionSel.x2) / 2, cy = (regionSel.y1 + regionSel.y2) / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8); ctx.stroke();
      ctx.restore();
    }
  }

  async function toggleCam() {
    if (batchProcessing) { toast('Wait for current batch to finish', 'error'); return; }
    const swId = ++modeSwitchId;
    detecting = false;
    saveCurrentResultsToMap();
    stopLoop();
    useCamera = !useCamera;
    imageSrc = null; detections = []; objColors = []; focusColor = null; focusObj = null;
    selectedObj = null; showObjPalette = false; savedToHistory = false;
    colorPickerActive = false; colorPickerPos = null;
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
    }
    if (video) video.srcObject = null;
    if (overlay) { const ctx = overlay.getContext('2d'); if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height); }
    if (useCamera) {
      await tick();
      init();
    } else {
      if (uploadedImages.length > 0) {
        switchToImage(uploadedImages.length - 1);
      }
      const toLoad = [];
      if (engineMode === 'fusion') {
        toLoad.push(loadTFModel());
        toLoad.push(loadAllMobileNetModels());
      } else if (tfModels.includes(engineMode)) {
        toLoad.push(loadTFModel());
      } else if (mobilenetModels.includes(engineMode)) {
        toLoad.push(loadMobileNetModel(engineMode));
      } else {
        toLoad.push(loadTFModel());
      }
      await Promise.allSettled(toLoad);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    processFiles(files).catch(e => { console.error('Drop error:', e); toast('Error processing dropped files', 'error'); });
  }
</script>

<div class="detect-page" class:camera-mode={useCamera} role="region" aria-label="Detection view" ondragover={(e) => e.preventDefault()} ondrop={handleDrop}>
  {#if status && (status.includes('Error') || status.includes('denied') || status.includes('permission'))}
    <div class="loading-overlay">
      <div class="loading-card">
        <div class="text-3xl mb-3 opacity-50"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="font-brut text-brut-sm uppercase mb-2">{status}</div>
        <button class="brut-btn-primary mt-3 text-brut-xs px-4 py-2" onclick={() => { status = ''; init(); }}>
          <i class="fas fa-rotate mr-1"></i> Retry Camera
        </button>
        <button class="brut-btn mt-2 text-brut-xs px-4 py-2" onclick={() => { status = ''; toggleCam(); }}>
          <i class="fas fa-upload mr-1"></i> Upload Instead
        </button>
      </div>
    </div>
  {:else if status || loadProgress > 0 || batchProcessing}
    <div class="loading-overlay">
      <div class="loading-card">
        {#if batchProcessing}
          <div class="font-brut text-brut-sm uppercase mb-3">Processing {batchCurrent} of {batchTotal}</div>
          {#if batchFileName}
            <div class="text-brut-xs text-neo-darkgray truncate max-w-full mb-2" title={batchFileName}>{batchFileName}</div>
          {/if}
          <div class="progress-track">
            <div class="progress-fill" style="width: {(batchCurrent / batchTotal) * 100}%"></div>
          </div>
          <div class="font-brut text-brut-xs text-neo-darkgray mt-2">{((batchCurrent / batchTotal) * 100).toFixed(0)}%</div>
          <button class="brut-btn-danger mt-3 text-brut-xs" onclick={() => { batchCancelled = true; }} aria-label="Cancel batch">
            <i class="fas fa-times mr-1"></i> Cancel
          </button>
        {:else if loadStage}
          <div class="font-brut text-brut-sm uppercase mb-3">{loadStage}</div>
          <div class="progress-track">
            <div class="progress-fill" style="width: {loadProgress}%"></div>
          </div>
          <div class="font-brut text-brut-xs text-neo-darkgray mt-2">{loadProgress}%</div>
        {:else}
          <div class="font-brut text-brut-sm uppercase mb-3">{status || 'Loading...'}</div>
          <div class="progress-track">
            <div class="progress-fill" style="width: {loadProgress}%"></div>
          </div>
          <div class="font-brut text-brut-xs text-neo-darkgray mt-2">{loadProgress}%</div>
        {/if}
      </div>
    </div>
  {/if}

  {#if useCamera}
    <div class="cam-ui">
      
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
          <button class="tool-btn" class:active={colorPickerActive} onclick={() => { colorPickerActive = !colorPickerActive; toast(colorPickerActive ? 'Click on image to pick color' : 'Color picker off', colorPickerActive ? 'info' : 'success'); }} aria-label="Color picker" title="Color picker">
            <i class="fas fa-eyedropper"></i>
          </button>
          <button class="tool-btn" class:active={cvdCompare} onclick={() => { cvdCompare = !cvdCompare; toast(cvdCompare ? 'CVD comparison active' : 'CVD comparison off', 'info'); }} aria-label="CVD compare" title="CVD simulation">
            <i class="fas fa-low-vision"></i>
          </button>
          <button class="tool-btn" onclick={() => showTour = true} aria-label="Help" title="Tour">
            <i class="fas fa-circle-question"></i>
          </button>
        </div>
      </div>

      <ModeSheet show={showModeSheet} current={engineMode} onSelect={(m) => { switchMode(m); }} onClose={() => showModeSheet = false} />

      <div class="cam-main">
        
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
          <button class="cam-btn" class:active={colorPickerActive} onclick={() => { colorPickerActive = !colorPickerActive; toast(colorPickerActive ? 'Tap image to pick color' : 'Color picker off', 'success'); }} aria-label="Color picker">
            <i class="fas fa-eyedropper"></i>
          </button>
          <button class="cam-btn" class:active={cvdCompare} onclick={() => { cvdCompare = !cvdCompare; toast(cvdCompare ? 'CVD comparison' : 'CVD off', 'info'); }} aria-label="CVD compare">
            <i class="fas fa-low-vision"></i>
          </button>
          <button class="cam-btn" onclick={() => showModeSheet = true} aria-label="More modes">
            <i class="fas fa-grid-2"></i>
          </button>
        </div>

        <div class="cam-view" class:show={!status}>
          <div class="cam-viewfinder" id="cam-vf">
            <video bind:this={video} autoplay playsinline muted></video>
            <canvas bind:this={overlay}
              class="cam-overlay-canvas"
              class:color-picking={colorPickerActive}
              onmousemove={(e) => {
                if (!colorPickerActive || !video || !overlay) { colorPreviewPos = null; crosshairPos = null; return; }
                const r = overlay.getBoundingClientRect();
                const x = (e.clientX - r.left) * (overlay.width / r.width);
                const y = (e.clientY - r.top) * (overlay.height / r.height);
                crosshairPos = { x, y };
                const preview = sampleRegionColor(video, Math.max(0,x-4), Math.max(0,y-4), 8, 8);
                if (preview) {
                  colorPreviewPos = { x: e.clientX, y: e.clientY };
                  colorPreviewHex = preview.hex;
                  colorPreviewName = preview.name;
                }
              }}
              onmouseleave={() => { if (colorPickerActive) { colorPreviewPos = null; crosshairPos = null; } }}
              onclick={(e) => {
                if (!colorPickerActive || !video) return;
                const r = overlay.getBoundingClientRect();
                const x = (e.clientX - r.left) * (overlay.width / r.width);
                const y = (e.clientY - r.top) * (overlay.height / r.height);
                const fc = sampleRegionColor(video, Math.max(0,x-30), Math.max(0,y-30), 60, 60);
                if (fc) {
                  fc.samplePos = { x, y };
                  colorPickerResult = fc;
                  showColorPickerModal = true;
                  colorPickerActive = false;
                  colorPreviewPos = null;
                  crosshairPos = null;
                }
              }}
            ></canvas>
          </div>
        </div>

      </div>

      
    

      <div class="cam-overlays">
          {#if sceneInfo}
            <div class="cam-badge">
              <span class="text-brut-xs font-bold uppercase">{sceneInfo.scene.replace(/_/g, ' ')}</span>
              <span class="text-brut-xs opacity-60">{(sceneInfo.confidence * 100).toFixed(0)}%</span>
            </div>
          {/if}
          {#if focusColor}
            <div class="cam-color-section" transition:fly={{ y: 8, duration: 200 }}>
              <div class="cam-color-tag">
                <i class="fas fa-palette mr-1"></i> Color Indicator
              </div>
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="cam-color-card" style="border-color: {focusColor.hex}" onmouseenter={() => highlightActive = true} onmouseleave={() => highlightActive = false} onclick={() => { if (focusColor?.samplePos) highlightActive = !highlightActive; }}>
                <div class="flex items-center gap-2 w-full">
                  <div class="swatch-lg" style="background: {focusColor.hex}; box-shadow: 0 0 12px {focusColor.hex}66" onmouseenter={() => highlightActive = true} onmouseleave={() => highlightActive = false} onclick={() => { if (focusColor?.samplePos) highlightActive = !highlightActive; }}></div>
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
            </div>
          {/if}

          <div class="cam-section-divider"></div>

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
                  <div role="button" tabindex="0" class="cam-det-item" class:selected={selectedObj?.label === d.label} style="border-left-color: {d.color.hex}" onclick={() => selectObject(d)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectObject(d); }}>
                    <div class="cam-det-color" style="background: {d.color.hex}; --swatch-glow: {d.color.hex}66">
                      <span class="cam-det-hex">{d.color.hex}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1">
                        <span class="font-brut text-brut-xs truncate capitalize">{d.label}</span>
                        <span class="model-pill">{d.model === 'coco-ssd' ? 'AI' : 'MNet'}</span>
                      </div>
                      {#if d.analysis}
                        <div class="flex items-center gap-1.5 mt-0.5">
                          <i class="fas {d.analysis.icon}" style="color:{d.analysis.color};font-size:0.65rem"></i>
                          <span class="text-brut-xs" style="color:{d.analysis.color}">{d.analysis.safety || d.analysis.toxicity}</span>
                        </div>
                      {/if}
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="conf-dot" style="width:{(d.score*100).toFixed(0)}%;background:{getColorFor(d)}"></span>
                        <span class="text-brut-xs text-neo-darkgray">{(d.score*100).toFixed(0)}%</span>
                        <span class="text-brut-xs font-bold capitalize">{d.color.name}</span>
                      </div>
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
                    <button class="cam-fav-btn" class:saved={savedObjIds.has(d.label)} onclick={(e) => { e.stopPropagation(); saveObject(d); }} aria-label="Save object">
                      <i class="fas fa-cube"></i>
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
            {#if uploadedImages.length > 0}
              <button class="tool-btn" onclick={() => document.getElementById('file-input').click()} aria-label="Add more images"><i class="fas fa-plus"></i></button>
            {/if}
            <button class="tool-btn" class:active={colorPickerActive} onclick={() => { colorPickerActive = !colorPickerActive; toast(colorPickerActive ? 'Click image to pick color' : 'Color picker off', 'success'); }} aria-label="Color picker">
              <i class="fas fa-eyedropper"></i>
            </button>
            <button class="tool-btn" class:active={cvdCompare} onclick={() => { cvdCompare = !cvdCompare; toast(cvdCompare ? 'CVD comparison active' : 'CVD comparison off', 'info'); }} aria-label="CVD compare">
              <i class="fas fa-low-vision"></i>
            </button>
          <button class="mode-selector" style="--mode-color: {getEngineColor(engineMode)}" onclick={() => showModeSheet = true}>
            <i class="fas {getEngineIcon(engineMode)}"></i>
            <span>{getEngineLabel(engineMode)}</span>
            <i class="fas fa-chevron-up" style="font-size:0.6rem"></i>
          </button>
        </div>
      </div>

      <ModeSheet show={showModeSheet} current={engineMode} onSelect={(m) => { switchMode(m); }} onClose={() => showModeSheet = false} />

      <div class="view" class:show={!status}>
        {#if imageSrc}
          <div class="viewfinder">
            <img src={imageSrc} alt="" class="img">
            <canvas bind:this={overlay}
              class:color-picking={colorPickerActive}
              onmousedown={(e) => { if (!imageSrc) return; const r = overlay.getBoundingClientRect(); const x = (e.clientX - r.left) * (overlay.width / r.width); const y = (e.clientY - r.top) * (overlay.height / r.height); if (colorPickerActive) return; regionSel = null; regionDrag = { x, y }; }}
              onmousemove={(e) => { const r = overlay.getBoundingClientRect(); const x = (e.clientX - r.left) * (overlay.width / r.width); const y = (e.clientY - r.top) * (overlay.height / r.height); if (colorPickerActive && imageSrc) { crosshairPos = { x, y }; const src = srcCanvas || document.querySelector('.viewfinder img'); if (src) { const preview = sampleRegionColor(src, Math.max(0,x-4), Math.max(0,y-4), 8, 8); if (preview) { colorPreviewPos = { x: e.clientX, y: e.clientY }; colorPreviewHex = preview.hex; colorPreviewName = preview.name; } } return; } if (!regionDrag) return; regionSel = { x1: Math.min(regionDrag.x, x), y1: Math.min(regionDrag.y, y), x2: Math.max(regionDrag.x, x), y2: Math.max(regionDrag.y, y) }; redrawOverlay(); }}
              onmouseup={(e) => { if (!regionDrag) return; if (colorPickerActive) return; const r = overlay.getBoundingClientRect(); const x = (e.clientX - r.left) * (overlay.width / r.width); const y = (e.clientY - r.top) * (overlay.height / r.height); const sx1 = Math.min(regionDrag.x, x), sy1 = Math.min(regionDrag.y, y), sx2 = Math.max(regionDrag.x, x), sy2 = Math.max(regionDrag.y, y); regionDrag = null; const src = srcCanvas || document.querySelector('.viewfinder img'); if (sx2 - sx1 < 5 && sy2 - sy1 < 5) { regionSel = null; if (src) { const fc = sampleRegionColor(src, sx1 - 30, sy1 - 30, 60, 60); if (fc) { focusColor = fc; if (fc.samplePos) { fc.samplePos.x = sx1; fc.samplePos.y = sy1; } } } redrawOverlay(); return; } regionSel = { x1: sx1, y1: sy1, x2: sx2, y2: sy2 }; if (src) { const fc = sampleRegionColor(src, sx1, sy1, sx2 - sx1, sy2 - sy1); if (fc) { focusColor = fc; if (fc.samplePos) { fc.samplePos.x = (sx1 + sx2) / 2; fc.samplePos.y = (sy1 + sy2) / 2; } } } redrawOverlay(); }}
              onmouseleave={() => { regionDrag = null; if (colorPickerActive) { colorPreviewPos = null; crosshairPos = null; } }}
              onclick={(e) => { if (!colorPickerActive || !imageSrc) return; const r = overlay.getBoundingClientRect(); const x = (e.clientX - r.left) * (overlay.width / r.width); const y = (e.clientY - r.top) * (overlay.height / r.height); const src = srcCanvas || document.querySelector('.viewfinder img'); if (src) { const fc = sampleRegionColor(src, Math.max(0,x-30), Math.max(0,y-30), 60, 60); if (fc) { fc.samplePos = { x, y }; colorPickerResult = fc; showColorPickerModal = true; colorPickerActive = false; colorPreviewPos = null; } } }}
            ></canvas>
          </div>
          {#each modelLoadErrors as err}
            <div class="model-err-banner">{err}</div>
          {/each}
          {#if uploadedImages.length > 1}
            <div class="upload-thumbnails">
              <button class="thumb-scroll thumb-prev" onclick={() => switchToImage(currentImageIdx - 1)} disabled={currentImageIdx <= 0} aria-label="Previous image"><i class="fas fa-chevron-left"></i></button>
              <div class="thumb-strip">
                {#each uploadedImages as img, i}
                  <div class="thumb-wrap" class:active={i === currentImageIdx}>
                    <button class="thumb-btn" onclick={() => switchToImage(i)} aria-label="{img.name}">
                      <img src={img.src} alt={img.name} class="thumb-img">
                    </button>
                    <button class="thumb-remove" onclick={() => removeImage(i)} aria-label="Remove {img.name}"><i class="fas fa-times"></i></button>
                    {#if imageResults.get(img.id)?.detections?.length}
                      <span class="thumb-badge">{imageResults.get(img.id).detections.length}</span>
                    {/if}
                  </div>
                {/each}
              </div>
              <button class="thumb-scroll thumb-next" onclick={() => switchToImage(currentImageIdx + 1)} disabled={currentImageIdx >= uploadedImages.length - 1} aria-label="Next image"><i class="fas fa-chevron-right"></i></button>
            </div>
          {/if}
        {:else}
          <div class="upload-zone" role="button" tabindex="0" onclick={() => document.getElementById('file-input').click()} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('file-input').click(); }}>
            <div class="text-center">
              <div class="text-5xl opacity-30 mb-3"><i class="fas fa-image"></i></div>
              <div class="font-brut text-brut-lg uppercase">Drop images here</div>
              <div class="text-brut-xs text-neo-darkgray">or click to browse (multiple allowed)</div>
              {#if uploadedImages.length > 0}
                <button class="brut-btn-primary mt-4 inline-block cursor-pointer">
                  <i class="fas fa-plus mr-2"></i> Add More
                </button>
              {:else}
                <button class="brut-btn mt-4 inline-block cursor-pointer">
                  <i class="fas fa-folder-open mr-2"></i> Select Images
                </button>
              {/if}
            </div>
          </div>
        {/if}
      </div>
      <input id="file-input" type="file" accept="image/*" multiple onchange={handleUpload} class="hidden-input">

      {#if focusColor && imageSrc}
        <div class="upload-color-section" transition:fly={{ y: 8, duration: 200 }}>
          <div class="color-indicator-tag">
            <i class="fas fa-palette mr-1"></i> Color Indicator
          </div>
          <div class="upload-color-card" style="border-color: {focusColor.hex}" onmouseenter={() => highlightActive = true} onmouseleave={() => highlightActive = false} onclick={() => { if (focusColor?.samplePos) highlightActive = !highlightActive; }}>
            <div class="flex items-center gap-3 w-full">
              <div class="swatch-xl" style="background: {focusColor.hex}; box-shadow: 0 0 16px {focusColor.hex}88" onmouseenter={() => highlightActive = true} onmouseleave={() => highlightActive = false} onclick={() => { if (focusColor?.samplePos) highlightActive = !highlightActive; }}></div>
              <div class="flex-1 min-w-0">
                <div class="font-brut text-brut capitalize">{focusColor.name}</div>
                <div class="text-brut-xs text-neo-darkgray font-mono">{focusColor.hex}</div>
                {#if focusColor.r !== undefined}
                  <div class="text-brut-2xs text-neo-darkgray font-mono">RGB({focusColor.r},{focusColor.g},{focusColor.b})</div>
                {/if}
                {#if focusObj}
                  <div class="text-brut-xs text-neo-darkgray capitalize mt-0.5">{focusObj}</div>
                  {#if objColors[0]?.analysis}
                    <div class="flex items-center gap-1 mt-0.5">
                      <i class="fas {objColors[0].analysis.icon}" style="color:{objColors[0].analysis.color};font-size:0.65rem"></i>
                      <span class="text-brut-xs" style="color:{objColors[0].analysis.color}">{objColors[0].analysis.advice}</span>
                    </div>
                  {/if}
                {/if}
              </div>
              <div class="flex items-center gap-1.5">
                {#if focusColor.confusion?.length}
                  <span class="upload-icon-btn text-red-500" title={focusColor.confusion[0].label}><i class="fas fa-eye"></i></span>
                {/if}
                <button class="upload-icon-btn" onclick={() => saveColor(focusColor)} aria-label="Save color"><i class="fas fa-floppy-disk"></i></button>
                <button class="upload-icon-btn" onclick={() => showSimulation = !showSimulation} aria-label="Toggle CVD sim"><i class="fas {showSimulation ? 'fa-eye-slash' : 'fa-low-vision'}"></i></button>
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
        </div>
      {/if}

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
              <div role="button" tabindex="0" class="detection-item" class:selected={selectedObj?.label === d.label} style="border-left-color: {d.color.hex}" onclick={() => selectObject(d)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectObject(d); }}>
                <div class="det-color-box" style="background:{d.color.hex}; --swatch-glow: {d.color.hex}66">
                  <span class="det-color-hex">{d.color.hex}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="font-brut text-brut-sm truncate capitalize">{d.label}</span>
                    <span class="model-badge">{d.model === 'coco-ssd' ? 'AI' : 'MNet'}</span>
                  </div>
                  {#if d.analysis}
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <i class="fas {d.analysis.icon}" style="color:{d.analysis.color};font-size:0.7rem"></i>
                      <span class="font-brut text-brut-xs" style="color:{d.analysis.color}">{d.analysis.safety || d.analysis.toxicity}</span>
                    </div>
                  {/if}
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="font-brut text-brut-xs capitalize">{d.color.name}</span>
                    <span class="text-brut-xs font-mono">{d.color.hex}</span>
                  </div>
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
                <button class="fav-btn" class:saved={savedObjIds.has(d.label)} onclick={(e) => { e.stopPropagation(); saveObject(d); }} aria-label="Save object">
                  <i class="fas fa-cube"></i>
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

      {#if scenePalette.length > 0}
        <div class="scene-palette-panel brut-card">
          <div class="panel-head">
            <span class="font-brut text-brut-xs uppercase"><i class="fas fa-palette mr-2 text-neo-green"></i>Scene Colors</span>
            <span class="text-brut-xs text-neo-darkgray">{scenePalette.length} colors</span>
          </div>
          <div class="scene-palette-grid">
            {#each scenePalette as pc}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="scene-chip" onclick={() => { if (pc.positions?.[0]) { focusColor = { ...focusColor || {}, ...pc, samplePos: pc.positions[0] }; highlightActive = true; } }}>
                <div class="scene-swatch" style="background:{pc.hex}"></div>
                <div class="scene-chip-info">
                  <span class="font-brut text-brut-xs capitalize truncate">{pc.name}</span>
                  <span class="text-brut-xs text-neo-darkgray">{pc.hex} {pc.percentage.toFixed(0)}%</span>
                </div>
              </div>
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
              <span class="tag" style="--c:{getColorFor(d)}">{d.label} <span class="opacity-60 ml-1">{(d.score*100).toFixed(0)}</span>{#if d.analysis}<span class="ml-1 text-brut-2xs" style="color:{d.analysis.color}">· {d.analysis.safety || d.analysis.toxicity}</span>{/if}</span>
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
            <div class="desk-color-section">
              <div class="desk-color-tag">
                <i class="fas fa-palette mr-1"></i> Color Indicator
              </div>
              <div class="desk-color-card" style="border-color: {focusColor.hex}" onmouseenter={() => highlightActive = true} onmouseleave={() => highlightActive = false} onclick={() => { if (focusColor?.samplePos) highlightActive = !highlightActive; }}>
              <div class="desk-color-header">
                <div class="swatch-lg" style="background: {focusColor.hex}; box-shadow: 0 0 12px {focusColor.hex}66" onmouseenter={() => highlightActive = true} onmouseleave={() => highlightActive = false} onclick={() => { if (focusColor?.samplePos) highlightActive = !highlightActive; }}></div>
                <div class="flex-1 min-w-0">
                  <div class="font-brut text-brut-sm capitalize">{focusColor.name}</div>
                  <div class="text-brut-xs text-neo-darkgray">{focusColor.hex} {#if focusColor.r !== undefined}({focusColor.r},{focusColor.g},{focusColor.b}){/if}</div>
                  {#if focusObj}
                    <div class="text-brut-xs text-neo-darkgray capitalize">{focusObj}</div>
                    {#if objColors[0]?.analysis}
                      <div class="flex items-center gap-1 mt-0.5">
                        <i class="fas {objColors[0].analysis.icon}" style="color:{objColors[0].analysis.color};font-size:0.6rem"></i>
                        <span class="text-brut-xs" style="color:{objColors[0].analysis.color}">{objColors[0].analysis.advice}</span>
                      </div>
                    {/if}
                  {/if}
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
                <div role="button" tabindex="0" class="desk-det-item" class:selected={selectedObj?.label === d.label} style="border-left-color: {d.color.hex}" onclick={() => selectObject(d)} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectObject(d); }}>
                  <span class="color-swatch-mini" style="background: {d.color.hex}; box-shadow: 0 0 8px {d.color.hex}66"></span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1">
                      <span class="font-brut text-brut-xs truncate capitalize">{d.label}</span>
                      <span class="model-pill">{d.model === 'coco-ssd' ? 'AI' : 'MNet'}</span>
                    </div>
                    {#if d.analysis}
                      <div class="flex items-center gap-1 mt-0.5">
                        <i class="fas {d.analysis.icon}" style="color:{d.analysis.color};font-size:0.6rem"></i>
                        <span class="text-brut-xs" style="color:{d.analysis.color}">{d.analysis.safety || d.analysis.toxicity}</span>
                      </div>
                    {/if}
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
                  <button class="cam-fav-btn" class:saved={savedObjIds.has(d.label)} onclick={(e) => { e.stopPropagation(); saveObject(d); }} aria-label="Save object">
                    <i class="fas fa-cube"></i>
                  </button>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

{#if colorPreviewPos && colorPreviewHex}
  <div class="color-preview-follower" style="left: {colorPreviewPos.x + 16}px; top: {colorPreviewPos.y - 40}px;">
    <div class="color-preview-swatch" style="background: {colorPreviewHex}; box-shadow: 0 0 12px {colorPreviewHex}88;"></div>
    <span class="color-preview-label">{colorPreviewName || colorPreviewHex}</span>
  </div>
{/if}

{#if showColorPickerModal && colorPickerResult}
  <div class="cp-modal-overlay" role="presentation" onclick={() => showColorPickerModal = false}>
    <div class="cp-modal-card" onclick={(e) => e.stopPropagation()} role="dialog" tabindex="0" aria-label="Color picker result">
      <button class="cp-modal-close" onclick={() => showColorPickerModal = false} aria-label="Close"><i class="fas fa-times"></i></button>
      <div class="cp-modal-swatch" style="background: {colorPickerResult.hex};">
        {#if colorPickerResult.samplePos}
          <div class="cp-modal-coords">x:{Math.round(colorPickerResult.samplePos.x)} y:{Math.round(colorPickerResult.samplePos.y)}</div>
        {/if}
      </div>
      <div class="cp-modal-body">
        <h3 class="cp-modal-name">{colorPickerResult.name}</h3>
        <div class="cp-modal-hex">{colorPickerResult.hex}</div>
        {#if colorPickerResult.r !== undefined}
          <div class="cp-modal-rgb">RGB({colorPickerResult.r}, {colorPickerResult.g}, {colorPickerResult.b})</div>
        {/if}
        {#if colorPickerResult.confusion?.length}
          <div class="cp-modal-sim">
            <span class="cp-modal-sim-label">CVD Simulation</span>
            <div class="cp-modal-sim-row">
              {#each colorPickerResult.confusion as cvd}
                <div class="cp-modal-sim-chip" title={cvd.label}>
                  <div class="cp-modal-sim-dot" style="background:{cvd.hex};"></div>
                  <span>{cvd.label.slice(0,5)}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        {#if colorPickerResult.hsl}
          <div class="cp-modal-detail">HSL({colorPickerResult.hsl.h}° {colorPickerResult.hsl.s}% {colorPickerResult.hsl.l}%)</div>
        {/if}
        <div class="cp-modal-actions">
          <button class="cp-modal-save" onclick={() => { saveColor(colorPickerResult); showColorPickerModal = false; }}>
            <i class="fas fa-floppy-disk mr-1"></i> Save Color
          </button>
          <button class="cp-modal-cancel" onclick={() => showColorPickerModal = false}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if showStatusToast}
  <div class="toast" class:toast-error={statusToastType === 'error'} class:toast-info={statusToastType === 'info'} transition:fly={{ y: -20, duration: 200 }}>
    <i class="fas {statusToastType === 'success' ? 'fa-check-circle' : statusToastType === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle'}"></i>
    {statusToastMsg}
  </div>
{/if}

<TourGuide show={showTour} onClose={() => showTour = false} />

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
  .cam-viewfinder canvas { position: absolute; }
  .cam-viewfinder canvas.cam-overlay-canvas { cursor: crosshair; }
  .viewfinder canvas.color-picking { cursor: crosshair; }
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
    .desk-det-item { display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.5rem; cursor: pointer; transition: background 0.1s; border-bottom: 1px solid rgba(10,10,10,0.08); border-left: 3px solid transparent; }
    .desk-det-item:hover { background: #39ff1422; }
    .desk-det-item.selected { background: #39ff1433; }
    .desk-det-item:last-child { border-bottom: none; }
  }
  .cam-color-section { display: flex; flex-direction: column; gap: 0.2rem; }
  .cam-color-tag {
    display: inline-flex; align-items: center; align-self: flex-start;
    padding: 0.15rem 0.5rem; font: 700 0.55rem/1 'Space Grotesk', system-ui, sans-serif;
    text-transform: uppercase; letter-spacing: 0.05em;
    background: #0a0a0a; color: #fefefe; border: 2px solid #0a0a0a;
    box-shadow: 2px 2px 0 rgba(0,0,0,0.3);
  }
  .cam-section-divider { height: 2px; background: rgba(255,255,255,0.15); margin: 0; }
  .swatch-lg { width: 44px; height: 44px; border: 2px solid #0a0a0a; flex-shrink: 0; border-radius: 4px; }
  .desk-color-section { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
  .desk-color-tag {
    display: inline-flex; align-items: center; align-self: flex-start;
    padding: 0.1rem 0.5rem; font: 700 0.5rem/1 'Space Grotesk', system-ui, sans-serif;
    text-transform: uppercase; letter-spacing: 0.05em;
    background: #0a0a0a; color: #fefefe; border: 2px solid #0a0a0a;
  }
  .cam-color-card {
    padding: 0.5rem 0.6rem; background: rgba(254,254,254,0.95); border: 3px solid;
    box-shadow: 4px 4px 0 #0a0a0a; backdrop-filter: blur(8px);
  }
  .upload-color-section { margin: 0.5rem 0; }
  .color-indicator-tag {
    display: inline-flex; align-items: center;
    padding: 0.2rem 0.6rem; font: 700 0.6rem/1 'Space Grotesk', system-ui, sans-serif;
    text-transform: uppercase; letter-spacing: 0.05em;
    background: #0a0a0a; color: #fefefe; border: 2px solid #0a0a0a;
    margin-bottom: 0.15rem; box-shadow: 2px 2px 0 rgba(0,0,0,0.3);
  }
  .upload-color-card {
    padding: 0.65rem 0.75rem; background: #fefefe; border: 3px solid;
    box-shadow: 4px 4px 0 #0a0a0a;
  }
  .swatch-xl { width: 52px; height: 52px; border: 3px solid #0a0a0a; flex-shrink: 0; border-radius: 6px; }
  .upload-icon-btn {
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    border: 2px solid #0a0a0a; background: #fefefe; cursor: pointer; font-size: 0.75rem; flex-shrink: 0; transition: all 0.15s;
  }
  .upload-icon-btn:hover { background: #ffd700; transform: scale(1.1); }
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
    display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.4rem;
    border-bottom: 1px solid rgba(10,10,10,0.06); cursor: pointer; transition: all 0.12s ease;
    position: relative; border-left: 3px solid transparent;
  }
  .cam-det-color { width: 48px; height: 48px; flex-shrink: 0; border: 3px solid #0a0a0a; border-radius: 4px; display: flex; align-items: flex-end; justify-content: center; padding: 1px; box-shadow: 0 0 10px var(--swatch-glow, transparent); }
  .cam-det-hex { font: 700 0.4rem/1 monospace; background: rgba(10,10,10,0.75); color: #fff; padding: 1px 2px; border-radius: 1px; max-width: 42px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .det-color-box { width: 60px; height: 60px; flex-shrink: 0; border: 3px solid #0a0a0a; border-radius: 4px; display: flex; align-items: flex-end; justify-content: center; padding: 2px; box-shadow: 0 0 12px var(--swatch-glow, transparent); }
  .det-color-hex { font: 700 0.45rem/1 monospace; background: rgba(10,10,10,0.75); color: #fff; padding: 1px 3px; border-radius: 1px; max-width: 54px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cam-det-item:hover { background: rgba(255,215,0,0.06); }
  .cam-det-item:active { background: rgba(255,215,0,0.15); transform: scale(0.98); }
  .cam-det-item.selected { background: linear-gradient(90deg, rgba(255,215,0,0.12), transparent); border-left: 3px solid #ffd700; box-shadow: inset 2px 0 0 #ffd700; }
  .model-pill { font-size: 0.5rem; font-weight: 700; text-transform: uppercase; padding: 0.08rem 0.3rem; border: 1px solid #0a0a0a; line-height: 1; background: #fefefe; }
  .conf-dot { height: 4px; border: 1px solid #0a0a0a; background: #e0e0e0; border-radius: 2px; transition: width 0.3s ease; }
  .cam-fav-btn { border: none; background: none; cursor: pointer; font-size: 0.75rem; color: #ddd; padding: 4px; transition: all 0.15s; }
  .cam-fav-btn:hover { color: #ff0033; transform: scale(1.25); text-shadow: 0 0 8px rgba(255,0,51,0.3); }
  .cam-fav-btn.saved { color: #ff0033; text-shadow: 0 0 6px rgba(255,0,51,0.3); }
  .cam-fav-btn[aria-label="Save object"]:hover { color: #ffd700; text-shadow: 0 0 8px rgba(255,215,0,0.3); }
  .cam-fav-btn[aria-label="Save object"].saved { color: #ffd700; text-shadow: 0 0 6px rgba(255,215,0,0.3); }
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
  .viewfinder canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: crosshair; }

  .upload-thumbnails { display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0; background: #fefefe; border: 2px solid #0a0a0a; box-shadow: 3px 3px 0 #0a0a0a; margin-top: 0.4rem; }
  .thumb-strip { display: flex; gap: 0.35rem; overflow-x: auto; flex: 1; scrollbar-width: thin; padding: 0.2rem 0; }
  .thumb-wrap { position: relative; flex-shrink: 0; }
  .thumb-wrap.active .thumb-btn { border-color: #ffd700; box-shadow: 0 0 0 2px #ffd700; }
  .thumb-btn { width: 52px; height: 52px; border: 3px solid #0a0a0a; padding: 0; cursor: pointer; overflow: hidden; background: #0a0a0a; transition: all 0.15s; display: block; }
  .thumb-btn:hover { transform: scale(1.05); }
  .thumb-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .thumb-remove {
    position: absolute; top: -6px; right: -6px; width: 18px; height: 18px;
    border: 2px solid #0a0a0a; background: #ff0033; color: #fff;
    cursor: pointer; font-size: 0.45rem; display: flex; align-items: center; justify-content: center;
    line-height: 1; padding: 0; z-index: 2; transition: all 0.15s;
  }
  .thumb-remove:hover { transform: scale(1.2); }
  .thumb-badge {
    position: absolute; bottom: -5px; right: -5px; width: 18px; height: 18px;
    border: 2px solid #0a0a0a; background: #39ff14; color: #0a0a0a;
    font: 700 0.45rem/1 'Space Grotesk', system-ui, sans-serif;
    display: flex; align-items: center; justify-content: center;
  }
  .thumb-scroll {
    width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
    border: 2px solid #0a0a0a; background: #fefefe; cursor: pointer; font-size: 0.65rem; flex-shrink: 0;
    transition: all 0.15s;
  }
  .thumb-scroll:disabled { opacity: 0.3; cursor: default; }
  .thumb-scroll:hover:not(:disabled) { background: #ffd700; }

  .hidden-input { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

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
  .brut-btn-danger { padding: 0.35rem 0.75rem; border: 2px solid #0a0a0a; background: #ff0033; color: #fff; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.03em; transition: all 0.15s; box-shadow: 2px 2px 0 #0a0a0a; }
  .brut-btn-danger:hover { background: #cc0029; transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #0a0a0a; }
  .detections-list { display: flex; flex-direction: column; gap: 0.25rem; max-height: 320px; overflow-y: auto; scrollbar-width: thin; }
  .detection-item {
    display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.5rem;
    border: 2px solid transparent; border-left: 3px solid transparent; cursor: pointer; transition: all 0.15s ease;
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
  .fav-btn[aria-label="Save object"]:hover { color: #ffd700; text-shadow: 0 0 8px rgba(255,215,0,0.3); }
  .fav-btn[aria-label="Save object"].saved { color: #ffd700; text-shadow: 0 0 6px rgba(255,215,0,0.3); }
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

  .color-preview-follower { position: fixed; z-index: 400; pointer-events: none; display: flex; align-items: center; gap: 0.4rem; background: rgba(254,254,254,0.95); border: 2px solid #0a0a0a; padding: 0.3rem 0.5rem; box-shadow: 3px 3px 0 #0a0a0a; animation: fadeIn 0.1s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
  .color-preview-swatch { width: 20px; height: 20px; border: 2px solid #0a0a0a; flex-shrink: 0; border-radius: 50%; }
  .color-preview-label { font: 700 0.6rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; color: #0a0a0a; }

  .cp-modal-overlay { position: fixed; inset: 0; z-index: 500; background: rgba(10,10,10,0.55); display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .cp-modal-card { width: 100%; max-width: 340px; background: #fefefe; border: 4px solid #0a0a0a; box-shadow: 10px 10px 0 #0a0a0a; position: relative; overflow: hidden; animation: modalIn 0.2s ease-out; }
  @keyframes modalIn { from { opacity: 0; transform: scale(0.9) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
  .cp-modal-close { position: absolute; top: 6px; right: 6px; z-index: 1; width: 32px; height: 32px; border: 2px solid #0a0a0a; background: #ff0033; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; transition: all 0.15s; }
  .cp-modal-close:hover { background: #cc0029; transform: scale(1.05); }
  .cp-modal-swatch { height: 140px; border-bottom: 4px solid #0a0a0a; display: flex; align-items: flex-end; justify-content: flex-end; padding: 0.4rem; }
  .cp-modal-coords { font: 700 0.55rem/1 'Space Grotesk', system-ui, sans-serif; background: rgba(10,10,10,0.7); color: #fff; padding: 0.2rem 0.4rem; }
  .cp-modal-body { padding: 1rem; display: flex; flex-direction: column; gap: 0.4rem; }
  .cp-modal-name { font: 700 1.2rem/1.1 'Space Grotesk', system-ui, sans-serif; text-transform: capitalize; color: #0a0a0a; }
  .cp-modal-hex { font: 700 0.85rem/1 'Space Grotesk', system-ui, sans-serif; color: #666; font-family: 'SF Mono', 'Fira Code', monospace; }
  .cp-modal-rgb { font: 500 0.7rem/1 'Space Grotesk', system-ui, sans-serif; color: #888; }
  .cp-modal-detail { font: 500 0.65rem/1 'Space Grotesk', system-ui, sans-serif; color: #aaa; }
  .cp-modal-sim { border-top: 2px solid #0a0a0a; padding-top: 0.5rem; margin-top: 0.2rem; }
  .cp-modal-sim-label { font: 700 0.6rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; color: #888; display: block; margin-bottom: 0.3rem; }
  .cp-modal-sim-row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .cp-modal-sim-chip { display: flex; align-items: center; gap: 0.25rem; font: 500 0.6rem/1 'Space Grotesk', system-ui, sans-serif; color: #555; text-transform: uppercase; }
  .cp-modal-sim-dot { width: 14px; height: 14px; border: 2px solid #0a0a0a; flex-shrink: 0; border-radius: 50%; }
  .cp-modal-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; border-top: 3px solid #0a0a0a; padding-top: 0.75rem; }
  .cp-modal-save { flex: 1; padding: 0.6rem; border: 3px solid #0a0a0a; background: #ffd700; font: 700 0.7rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; cursor: pointer; box-shadow: 3px 3px 0 #0a0a0a; transition: all 0.15s; }
  .cp-modal-save:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 #0a0a0a; }
  .cp-modal-cancel { padding: 0.6rem 1rem; border: 3px solid #0a0a0a; background: #fefefe; font: 700 0.7rem/1 'Space Grotesk', system-ui, sans-serif; text-transform: uppercase; cursor: pointer; box-shadow: 3px 3px 0 #0a0a0a; transition: all 0.15s; }
  .cp-modal-cancel:hover { transform: translate(-2px,-2px); box-shadow: 5px 5px 0 #0a0a0a; }

  .toast {
    position: fixed; top: 80px; left: 50%; transform: translateX(-50%); z-index: 300;
    background: #39ff14; color: #0a0a0a; border: 3px solid #0a0a0a; box-shadow: 4px 4px 0 #0a0a0a;
    padding: 0.6rem 1.2rem; font: 700 0.75rem/1 'Space Grotesk', system-ui, sans-serif;
    display: flex; align-items: center; gap: 0.5rem; white-space: nowrap;
  }
  .toast.toast-error { background: #ff0033; color: #fff; }
  .toast.toast-info { background: #00e5ff; color: #0a0a0a; }

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