// YOLO DETECTION — commented out for production (COCO-SSD only)
//
// import * as ort from 'onnxruntime-web';
//
// ort.env.wasm.numThreads = 1;
// ort.env.wasm.wasmPaths = '/wasm/';
//
// if (typeof SharedArrayBuffer === 'undefined') {
//   ort.env.wasm.numThreads = 1;
// }
//
// ort.env.wasm.wasmPaths = '/wasm/';
// ... (full implementation removed)
//
export async function loadYoloModel() { return null; }
export async function detectYolo() { return []; }
export function getYoloColor() { return '#888'; }
