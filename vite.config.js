import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
			'Cross-Origin-Embedder-Policy': 'credentialless',
			'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net; worker-src 'self' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' https://mepnivbdpeuqplgeiyia.supabase.co https://cdn.jsdelivr.net https://storage.googleapis.com https://tfhub.dev https://www.kaggle.com https://tessdata.projectnaptha.com https://*.supabase.co wss://*.supabase.co; font-src 'self' data: https://cdnjs.cloudflare.com"
		}
	},
	optimizeDeps: {
		include: ['long', '@tensorflow/tfjs', '@tensorflow/tfjs-core'],
		exclude: ['onnxruntime-web', 'tesseract.js', '@tensorflow-models/mobilenet', '@tensorflow/tfjs-backend-webgl']
	},
	worker: {
		format: 'es'
	}
});
