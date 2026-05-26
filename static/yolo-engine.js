/*
 * YOLO ONNX Runtime Web Inference Engine
 * Loads exported ONNX model and runs inference in browser.
 *
 * Usage:
 *   const engine = new YOLOInferenceEngine('/model.onnx', classNames);
 *   await engine.load();
 *   const detections = await engine.infer(videoElement);
 *   engine.draw(canvas, detections);
 */

class YOLOInferenceEngine {
    constructor(modelPath, classNames = [], confThreshold = 0.35, iouThreshold = 0.45) {
        this.modelPath = modelPath;
        this.classNames = classNames;
        this.confThreshold = confThreshold;
        this.iouThreshold = iouThreshold;
        this.session = null;
        this.inputName = null;
        this.outputName = null;
        this.inputSize = 320; // Must match training imgsz
    }

    async load() {
        try {
            this.session = await ort.InferenceSession.create(this.modelPath, {
                executionProviders: ['webgl', 'wasm', 'cpu'],
                graphOptimizationLevel: 'all',
            });
            this.inputName = this.session.inputNames[0];
            this.outputName = this.session.outputNames[0];
            console.log(`Model loaded: ${this.modelPath}`);
            console.log(`Input: ${this.inputName}, Output: ${this.outputName}`);
            return true;
        } catch (err) {
            console.error('Failed to load model:', err);
            return false;
        }
    }

    /**
     * Preprocess image: resize, pad, normalize, convert to tensor.
     */
    preprocess(source) {
        // Get image data from canvas or video
        let imgData;
        if (source instanceof HTMLVideoElement) {
            // Draw video frame to temp canvas
            const canvas = document.createElement('canvas');
            canvas.width = source.videoWidth;
            canvas.height = source.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(source, 0, 0);
            imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } else if (source instanceof HTMLCanvasElement) {
            const ctx = source.getContext('2d');
            imgData = ctx.getImageData(0, 0, source.width, source.height);
        } else if (source instanceof HTMLImageElement) {
            const canvas = document.createElement('canvas');
            canvas.width = source.naturalWidth;
            canvas.height = source.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(source, 0, 0);
            imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } else {
            throw new Error('Unsupported source type');
        }

        this._origWidth = imgData.width;
        this._origHeight = imgData.height;

        // Letterbox resize
        const { resized, pad, scale } = this._letterbox(imgData);
        this._scale = scale;
        this._padX = pad[0];
        this._padY = pad[1];

        // Convert to float32 tensor [1, 3, H, W]
        const pixels = resized.data;
        const float32Data = new Float32Array(3 * this.inputSize * this.inputSize);

        for (let y = 0; y < this.inputSize; y++) {
            for (let x = 0; x < this.inputSize; x++) {
                const srcIdx = (y * this.inputSize + x) * 4;
                const dstIdxR = y * this.inputSize + x;
                const dstIdxG = this.inputSize * this.inputSize + y * this.inputSize + x;
                const dstIdxB = 2 * this.inputSize * this.inputSize + y * this.inputSize + x;
                float32Data[dstIdxR] = pixels[srcIdx] / 255.0;       // R
                float32Data[dstIdxG] = pixels[srcIdx + 1] / 255.0;   // G
                float32Data[dstIdxB] = pixels[srcIdx + 2] / 255.0;   // B
            }
        }

        return new ort.Tensor('float32', float32Data, [1, 3, this.inputSize, this.inputSize]);
    }

    _letterbox(imgData) {
        const canvas = document.createElement('canvas');
        canvas.width = this.inputSize;
        canvas.height = this.inputSize;
        const ctx = canvas.getContext('2d');

        const srcW = imgData.width;
        const srcH = imgData.height;
        const scale = Math.min(this.inputSize / srcW, this.inputSize / srcH);
        const newW = Math.round(srcW * scale);
        const newH = Math.round(srcH * scale);
        const padX = Math.round((this.inputSize - newW) / 2);
        const padY = Math.round((this.inputSize - newH) / 2);

        // Fill with gray (114)
        ctx.fillStyle = '#727272';
        ctx.fillRect(0, 0, this.inputSize, this.inputSize);

        // Draw resized image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = srcW;
        tempCanvas.height = srcH;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(tempCanvas, padX, padY, newW, newH);

        return {
            resized: ctx.getImageData(0, 0, this.inputSize, this.inputSize),
            pad: [padX, padY],
            scale,
        };
    }

    /**
     * Run inference on a video/image/canvas element.
     */
    async infer(source) {
        if (!this.session) {
            throw new Error('Model not loaded. Call load() first.');
        }

        const inputTensor = this.preprocess(source);

        const feeds = {};
        feeds[this.inputName] = inputTensor;
        const results = await this.session.run(feeds);

        const outputTensor = results[this.outputName];
        const outputData = outputTensor.data; // Float32Array

        // Parse YOLOv8 output
        return this._parseOutput(outputData);
    }

    _parseOutput(outputData) {
        const numClasses = this.classNames.length;
        const numPredictions = outputData.length / (4 + numClasses);
        const detections = [];

        // YOLOv8 format: each column is [cx, cy, w, h, cls0_score, cls1_score, ...]
        for (let i = 0; i < numPredictions; i++) {
            const baseIdx = i * (4 + numClasses);
            const cx = outputData[baseIdx];
            const cy = outputData[baseIdx + 1];
            const w = outputData[baseIdx + 2];
            const h = outputData[baseIdx + 3];

            // Find best class
            let maxScore = 0;
            let bestClass = -1;
            for (let c = 0; c < numClasses; c++) {
                const score = outputData[baseIdx + 4 + c];
                if (score > maxScore) {
                    maxScore = score;
                    bestClass = c;
                }
            }

            if (maxScore < this.confThreshold) continue;

            // Convert from padded-normalized to original image coords
            let x1 = (cx - w / 2) * this.inputSize;
            let y1 = (cy - h / 2) * this.inputSize;
            let x2 = (cx + w / 2) * this.inputSize;
            let y2 = (cy + h / 2) * this.inputSize;

            // Remove padding
            x1 = (x1 - this._padX) / this._scale;
            y1 = (y1 - this._padY) / this._scale;
            x2 = (x2 - this._padX) / this._scale;
            y2 = (y2 - this._padY) / this._scale;

            detections.push({
                x1: Math.max(0, x1),
                y1: Math.max(0, y1),
                x2: Math.min(this._origWidth, x2),
                y2: Math.min(this._origHeight, y2),
                score: maxScore,
                classId: bestClass,
                label: this.classNames[bestClass] || `class_${bestClass}`,
                width: x2 - x1,
                height: y2 - y1,
            });
        }

        // Apply NMS
        return this._nms(detections);
    }

    _nms(detections) {
        if (detections.length <= 1) return detections;

        detections.sort((a, b) => b.score - a.score);
        const keep = [];

        while (detections.length > 0) {
            const best = detections.shift();
            keep.push(best);

            detections = detections.filter(d => {
                const iou = this._computeIoU(best, d);
                return iou < this.iouThreshold;
            });
        }

        return keep;
    }

    _computeIoU(a, b) {
        const x1 = Math.max(a.x1, b.x1);
        const y1 = Math.max(a.y1, b.y1);
        const x2 = Math.min(a.x2, b.x2);
        const y2 = Math.min(a.y2, b.y2);
        const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const areaA = a.width * a.height;
        const areaB = b.width * b.height;
        return inter / (areaA + areaB - inter);
    }

    /**
     * Draw detections on a canvas element.
     */
    draw(canvas, detections, showLabels = true) {
        const ctx = canvas.getContext('2d');

        // Color palette for different classes
        const colors = [
            '#00FF00', '#FF0000', '#0000FF', '#FFFF00',
            '#FF00FF', '#00FFFF', '#FF8800', '#8800FF',
            '#00FF88', '#FF0088',
        ];

        for (const det of detections) {
            const color = colors[det.classId % colors.length];

            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(det.x1, det.y1, det.width, det.height);

            if (showLabels) {
                const label = `${det.label} ${(det.score * 100).toFixed(1)}%`;
                ctx.fillStyle = color;
                ctx.font = '16px monospace';

                const textWidth = ctx.measureText(label).width;
                ctx.fillRect(det.x1, det.y1 - 22, textWidth + 10, 22);
                ctx.fillStyle = '#000000';
                ctx.fillText(label, det.x1 + 5, det.y1 - 5);
            }
        }
    }
}
