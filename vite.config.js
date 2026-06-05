import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
			'Cross-Origin-Embedder-Policy': 'credentialless',
			'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://mepnivbdpeuqplgeiyia.supabase.co https://cdn.jsdelivr.net https://storage.googleapis.com https://tessdata.projectnaptha.com https://*.supabase.co wss://*.supabase.co; font-src 'self' data: https://cdnjs.cloudflare.com"
		}
	},
	optimizeDeps: {
		exclude: ['onnxruntime-web']
	},
	worker: {
		format: 'es'
	}
});
