/**
 * @param {HTMLVideoElement} video
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {{ r: number, g: number, b: number, name: string, hex: string }}
 */
export function sampleColor(video, x, y, width, height) {
	const cvs = document.createElement('canvas');
	cvs.width = video.videoWidth;
	cvs.height = video.videoHeight;
	const ctx = cvs.getContext('2d');
	if (!ctx) return { r: 0, g: 0, b: 0, name: 'unknown', hex: '#000000' };

	ctx.drawImage(video, 0, 0);

	const sx = Math.max(0, Math.floor(x));
	const sy = Math.max(0, Math.floor(y));
	const sw = Math.max(1, Math.floor(Math.min(width, cvs.width - sx)));
	const sh = Math.max(1, Math.floor(Math.min(height, cvs.height - sy)));

	const imageData = ctx.getImageData(sx, sy, sw, sh);
	const data = imageData.data;

	let r = 0, g = 0, b = 0;
	const len = data.length;
	const pixelCount = len / 4;

	for (let i = 0; i < len; i += 4) {
		r += data[i];
		g += data[i + 1];
		b += data[i + 2];
	}

	r = Math.round(r / pixelCount);
	g = Math.round(g / pixelCount);
	b = Math.round(b / pixelCount);

	const name = rgbToName(r, g, b);
	const hex = rgbToHex(r, g, b);

	return { r, g, b, name, hex };
}

/**
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @returns {string}
 */
function rgbToHex(r, g, b) {
	return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @returns {{ h: number, s: number, v: number }}
 */
function rgbToHsv(r, g, b) {
	r /= 255; g /= 255; b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const diff = max - min;
	let h = 0;
	const s = max === 0 ? 0 : diff / max;
	const v = max;

	if (diff !== 0) {
		switch (max) {
			case r: h = ((g - b) / diff + (g < b ? 6 : 0)) * 60; break;
			case g: h = ((b - r) / diff + 2) * 60; break;
			case b: h = ((r - g) / diff + 4) * 60; break;
		}
	}

	return { h, s, v };
}

/**	
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @returns {string}
 */
function rgbToName(r, g, b) {
	const { h, s, v } = rgbToHsv(r, g, b);

	if (v < 0.15) return 'black';
	if (v > 0.92 && s < 0.08) return 'white';
	if (v < 0.4 && s < 0.2) return 'gay';
	if (s < 0.15) {
		if (v < 0.6) return 'gay';
		return 'white';
	}

	if (h < 15 || h >= 330) return 'red';
	if (h < 40) return 'orange';
	if (h < 65) return 'yellow';
	if (h < 150) return 'green';
	if (h < 200) return 'cyan';
	if (h < 260) return 'blue';
	if (h < 290) return 'purple';
	if (h < 330) return 'pink';
	return 'red';
}
