<script>
	import { onMount } from 'svelte';
	import { loadModel, detectObjects } from '$lib/detection/objectDetection';
	import { sampleColor } from '$lib/detection/colorDetection';

	let /** @type {HTMLVideoElement | null} */ video = $state(null);
	let /** @type {HTMLCanvasElement | null} */ canvas = $state(null);
	let status = $state('');

	onMount(() => {
		init();
	});

	async function init() {
		try {
			status = 'Starting camera...';
			await startCamera();
			status = 'Loading model...';
			await loadModel();
			status = '';
			detectFrame();
		} catch (error) {
			status = `Error: ${error instanceof Error ? error.message : String(error)}`;
			console.error(error);
		}
	}

	async function startCamera() {
		const stream = await navigator.mediaDevices.getUserMedia({
			video: { facingMode: 'environment' },
			audio: false
		});

		if (!video) return;
		video.srcObject = stream;
		await video.play();

		const vid = video;
		await new Promise((resolve) => {
			if (vid.videoWidth > 0) {
				resolve(undefined);
				return;
			}
			vid.addEventListener('loadeddata', () => resolve(undefined), { once: true });
		});

		if (canvas && video) {
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
		}
	}

	async function detectFrame() {
		if (!video) {
			requestAnimationFrame(detectFrame);
			return;
		}

		try {
			const predictions = await detectObjects(video);
			drawBoxes(predictions, video);
		} catch (error) {
			console.error(error);
		}

		requestAnimationFrame(detectFrame);
	}

	/**
	 * @param {Array<{bbox: number[], class: string, score: number}>} predictions
	 * @param {HTMLVideoElement} vid
	 */
	function drawBoxes(predictions, vid) {
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		for (const prediction of predictions) {
			const [x, y, width, height] = prediction.bbox;

			const color = sampleColor(vid, x, y, width, height);

			ctx.strokeStyle = color.hex;
			ctx.lineWidth = 3;
			ctx.strokeRect(x, y, width, height);

			const label = `${prediction.class} ${Math.round(prediction.score * 100)}%`;

			ctx.font = 'bold 18px sans-serif';
			const textWidth = ctx.measureText(label).width;
			const colorChipSize = 16;
			const colorChipGap = 4;
			const nameWidth = ctx.measureText(color.name).width;
			const bgWidth = textWidth + colorChipSize + colorChipGap + nameWidth + 20;

			ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
			ctx.fillRect(x, y - 26, bgWidth, 26);

			ctx.fillStyle = color.hex;
			ctx.fillRect(x + 4, y - 22, colorChipSize, colorChipSize);

			ctx.fillStyle = '#ffffff';
			ctx.fillText(label, x + 4 + colorChipSize + colorChipGap, y - 6);
			ctx.fillStyle = color.hex;
			ctx.fillText(color.name, x + 4 + colorChipSize + colorChipGap + textWidth + 4, y - 6);
		}
	}
</script>

{#if status}
	<div class="status">{status}</div>
{/if}

<div class="camera-container" class:active={!status}>
	<video bind:this={video} autoplay playsinline muted></video>
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.status {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font: 18px sans-serif;
		color: #555;
		background: #f5f5f5;
	}

	.camera-container {
		position: relative;
		width: 100%;
		max-width: 800px;
		margin: 0 auto;
		opacity: 0;
		transition: opacity 0.3s;
	}

	.camera-container.active {
		opacity: 1;
	}

	video {
		width: 100%;
		display: block;
	}

	canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
</style>