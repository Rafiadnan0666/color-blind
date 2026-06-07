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
		exclude: ['onnxruntime-web']
	},
	worker: {
		format: 'es'
	}
});
