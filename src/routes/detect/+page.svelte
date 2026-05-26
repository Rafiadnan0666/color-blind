<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';

    let canvasEl;
    let videoEl;
    let fileInputEl;
    let detectionsContainerEl;
    let modelStatusEl = 'loading...';
    let confValue = 0.35;
    let fps = 0;
    let detCount = 0;
    let inferTime = '0ms';
    let resolution = '-';
    let detectionsHtml = '';

    let engine;
    let isRunning = false;
    let stream;
    let animFrameId;
    let lastTime = 0;
    let frameCount = 0;
    let lastInferTime = 0;

    const INFER_INTERVAL = 100;
    const MODEL_PATH = '/model.onnx';
    const CLASS_NAMES = ['green_tiger_tank', 'sand_is2_tank', 'gray_a320_plane'];

    let YOLOInferenceEngine;

    onMount(async () => {
        if (!browser) return;

        // Load the engine class
        YOLOInferenceEngine = window.YOLOInferenceEngine;
        if (!YOLOInferenceEngine) {
            // If imported via script tag, it's already on window
            await new Promise((resolve) => {
                const check = () => {
                    if (window.YOLOInferenceEngine) {
                        YOLOInferenceEngine = window.YOLOInferenceEngine;
                        resolve();
                    } else setTimeout(check, 100);
                };
                check();
            });
        }

        engine = new YOLOInferenceEngine(MODEL_PATH, CLASS_NAMES, 0.35, 0.45);
        const ok = await engine.load();
        modelStatusEl = ok ? `loaded (${CLASS_NAMES.length} classes)` : 'FAILED';
    });

    function handleConfChange(e) {
        confValue = parseFloat(e.target.value);
        if (engine) engine.confThreshold = confValue;
    }

    function handleImageUpload() {
        fileInputEl.click();
    }

    async function handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        stopCamera();

        const img = new Image();
        img.onload = async () => {
            canvasEl.width = img.naturalWidth;
            canvasEl.height = img.naturalHeight;
            const ctx = canvasEl.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolution = `${img.naturalWidth}x${img.naturalHeight}`;
            await runInference();
        };
        img.src = URL.createObjectURL(file);
    }

    async function handleCamera() {
        if (isRunning) return;
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
            });
            videoEl.srcObject = stream;
            await videoEl.play();
            canvasEl.width = videoEl.videoWidth || 640;
            canvasEl.height = videoEl.videoHeight || 640;
            resolution = `${canvasEl.width}x${canvasEl.height}`;
            isRunning = true;
            runCameraLoop();
        } catch (err) {
            alert('Camera access denied.');
        }
    }

    function stopCamera() {
        isRunning = false;
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    }

    async function runCameraLoop() {
        const loop = async (timestamp) => {
            if (!isRunning) return;
            if (lastTime > 0) {
                frameCount++;
                const elapsed = timestamp - lastTime;
                if (elapsed >= 1000) { fps = Math.round(frameCount * 1000 / elapsed); frameCount = 0; lastTime = timestamp; }
            } else { lastTime = timestamp; }

            const ctx = canvasEl.getContext('2d');
            ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

            if (timestamp - lastInferTime > INFER_INTERVAL) {
                lastInferTime = timestamp;
                await runInference();
            }
            animFrameId = requestAnimationFrame(loop);
        };
        animFrameId = requestAnimationFrame(loop);
    }

    async function runInference() {
        if (!engine || !engine.session) return;
        const start = performance.now();
        const detections = await engine.infer(canvasEl);
        inferTime = `${(performance.now() - start).toFixed(1)}ms`;
        detCount = detections.length;
        engine.draw(canvasEl, detections, true);
        updateDetectionList(detections);
    }

    function updateDetectionList(detections) {
        const colors = ['#00FF00', '#FF0000', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
        if (detections.length === 0) {
            detectionsHtml = '<div style="color:#484f58;">No detections</div>';
            return;
        }
        detectionsHtml = detections.map((d, i) => {
            const color = colors[d.classId % colors.length];
            return `<div class="det-item"><span><span class="badge" style="background:${color};color:#000;">${i+1}</span> <span style="color:${color}">${d.label}</span></span><span>${(d.score*100).toFixed(1)}%</span></div>`;
        }).join('');
    }
</script>

<svelte:head>
    <script src="https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js"></script>
    <script src="/yolo-engine.js"></script>
</svelte:head>

<div class="container">
    <h1>Color-Aware Detection</h1>

    <div class="controls">
        <button class="primary" on:click={handleImageUpload}>Upload Image</button>
        <button class="primary" on:click={handleCamera}>Camera</button>
        {#if isRunning}
            <button class="danger" on:click={stopCamera}>Stop</button>
        {/if}
        <label>Conf: <span>{confValue.toFixed(2)}</span>
            <input type="range" min="0.05" max="0.95" step="0.05" value={confValue} on:input={handleConfChange}>
        </label>
        <span class="status">Model: {modelStatusEl}</span>
    </div>

    <input type="file" accept="image/*" bind:this={fileInputEl} on:change={handleFileChange} style="display:none">

    <div class="canvas-wrapper">
        <canvas bind:this={canvasEl} width="640" height="480"></canvas>
    </div>
    <video bind:this={videoEl} autoplay playsinline style="display:none"></video>

    <div class="stats">
        <span>FPS: <b>{fps}</b></span>
        <span>Detections: <b>{detCount}</b></span>
        <span>Inference: <b>{inferTime}</b></span>
        <span>Res: <b>{resolution}</b></span>
    </div>

    <div class="detection-list">
        <h3>Detections</h3>
        <div>{@html detectionsHtml}</div>
    </div>
</div>

<style>
    :global(body) {
        font-family: 'Segoe UI', monospace;
        background: #0d1117;
        color: #c9d1d9;
        margin: 0;
        padding: 20px;
    }
    .container { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
    h1 { font-size: 1.5rem; color: #58a6ff; text-transform: uppercase; letter-spacing: 2px; text-align: center; }
    .controls {
        display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
        background: #161b22; padding: 12px 16px; border-radius: 8px; border: 1px solid #30363d;
    }
    .controls button {
        padding: 8px 16px; background: #21262d; border: 1px solid #30363d;
        color: #c9d1d9; border-radius: 6px; cursor: pointer; font-size: 0.85rem;
    }
    .controls button:hover { background: #30363d; }
    .primary { background: #238636 !important; border-color: #2ea043 !important; }
    .primary:hover { background: #2ea043 !important; }
    .danger { background: #8b1a1a !important; border-color: #b62323 !important; }
    .danger:hover { background: #b62323 !important; }
    .status { margin-left: auto; font-size: 0.8rem; color: #8b949e; }
    .canvas-wrapper { background: #161b22; border-radius: 8px; border: 1px solid #30363d; overflow: hidden; }
    canvas { width: 100%; display: block; }
    .stats {
        display: flex; gap: 16px; font-size: 0.8rem; color: #8b949e;
        background: #161b22; padding: 8px 16px; border-radius: 8px; border: 1px solid #30363d;
    }
    .stats b { color: #58a6ff; }
    .detection-list {
        background: #161b22; border-radius: 8px; border: 1px solid #30363d; padding: 12px 16px;
    }
    .detection-list h3 { font-size: 0.85rem; margin: 0 0 8px; color: #8b949e; }
    :global(.det-item) {
        display: flex; justify-content: space-between; padding: 4px 0;
        border-bottom: 1px solid #21262d; font-size: 0.85rem;
    }
    :global(.det-item:last-child) { border-bottom: none; }
    :global(.badge) {
        display: inline-block; padding: 2px 8px; border-radius: 10px;
        font-size: 0.7rem; font-weight: bold;
    }
</style>
