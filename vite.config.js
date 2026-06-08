import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
			'Cross-Origin-Embedder-Policy': 'credentialless'
		}
	},
	optimizeDeps: {
		exclude: ['onnxruntime-web', '@tensorflow/tfjs', '@tensorflow-models/coco-ssd'],
		include: ['long', 'tesseract.js']
	},
	ssr: {
		noExternal: ['tesseract.js', 'long']
	},
	build: {
		target: 'esnext',
		commonjsOptions: {
			include: [/long/, /tesseract/]
		},
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('@tensorflow/tfjs') || id.includes('@tensorflow-models/coco-ssd')) return 'tfjs';
					if (id.includes('onnxruntime-web')) return 'onnx';
					if (id.includes('tesseract.js')) return 'tesseract';
				}
			}
		}
	},
	worker: {
		format: 'es'
	}
});
