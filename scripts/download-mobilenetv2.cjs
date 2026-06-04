const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-backend-cpu');
const fs = require('fs');
const path = require('path');

const MODEL_URL = 'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/classification/2/default/1';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'static', 'model_mobilenetv2');

async function main() {
  console.log('=== MobileNet-v2 TFJS Model Downloader ===\n');
  console.log('Model URL:', MODEL_URL);
  console.log('Output:', OUTPUT_DIR, '\n');

  await tf.ready();

  let model;
  let attempts = 0;
  while (attempts < 5) {
    try {
      attempts++;
      console.log(`Loading model (attempt ${attempts}/5)...`);
      model = await tf.loadGraphModel(MODEL_URL, { fromTFHub: true });
      break;
    } catch (e) {
      console.log(`  Failed: ${e.message}`);
      if (attempts >= 5) throw new Error('Max attempts reached');
      console.log('  Retrying in 3s...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  console.log('Model loaded!\n');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const topology = model.artifacts.modelTopology;
  const weightSpecs = model.artifacts.weightSpecs;
  const weightArrays = model.weights;

  console.log('Topology nodes:', topology.node ? topology.node.length : '?');
  console.log('Weight specs:', weightSpecs.length);
  console.log('Weight objects:', Object.keys(weightArrays).length);

  // Build weight data in spec order
  const allBuffers = [];
  let totalBytes = 0;

  for (const spec of weightSpecs) {
    const data = weightArrays[spec.name];
    if (data == null) {
      console.warn('  Missing weight:', spec.name);
      continue;
    }

    let floatArray;
    if (Array.isArray(data)) {
      floatArray = new Float32Array(data);
    } else if (data instanceof Float32Array) {
      floatArray = data;
    } else if (data instanceof ArrayBuffer) {
      floatArray = new Float32Array(data);
    } else if (typeof data === 'object' && data.length != null) {
      floatArray = new Float32Array(data);
    } else {
      console.warn('  Unexpected type for', spec.name, typeof data);
      continue;
    }

    const bytes = new Uint8Array(floatArray.buffer, floatArray.byteOffset, floatArray.byteLength);
    allBuffers.push(bytes);
    totalBytes += bytes.length;
  }

  console.log(`\nTotal weight data: ${totalBytes} bytes (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);

  // Concatenate all weight data
  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const buf of allBuffers) {
    combined.set(buf, offset);
    offset += buf.length;
  }

  // Split into shards (max 50MB each)
  const maxShardSize = 50 * 1024 * 1024;
  const shards = [];
  let currentShard = { start: 0, end: 0 };
  let shardSize = 0;

  for (let i = 0; i < weightSpecs.length; i++) {
    const numEl = weightSpecs[i].shape.reduce((a, b) => a * b, 1);
    const byteSize = numEl * 4;

    if (shardSize + byteSize > maxShardSize && shardSize > 0) {
      currentShard.end = offset;
      shards.push(currentShard);
      currentShard = { start: offset, end: offset };
      shardSize = 0;
    }
    shardSize += byteSize;
    offset += byteSize;
    currentShard.end = offset;
  }
  if (shardSize > 0) shards.push(currentShard);

  // Reset offset tracking properly
  offset = 0;
  for (let i = 0; i < weightSpecs.length; i++) {
    const numEl = weightSpecs[i].shape.reduce((a, b) => a * b, 1);
    const byteSize = numEl * 4;
    offset += byteSize;
  }

  // Better shard calculation
  const actualShards = [];
  let so = 0;
  for (const spec of weightSpecs) {
    const numEl = spec.shape.reduce((a, b) => a * b, 1);
    const byteSize = numEl * 4;
    so += byteSize;
  }

  // Simple: create one shard if < 50MB, split if needed
  const NUM_SHARDS = Math.ceil(totalBytes / maxShardSize);
  const SHARD_SIZE = Math.ceil(totalBytes / NUM_SHARDS);
  const actualShards2 = [];
  for (let s = 0; s < NUM_SHARDS; s++) {
    actualShards2.push({
      start: s * SHARD_SIZE,
      end: Math.min((s + 1) * SHARD_SIZE, totalBytes)
    });
  }

  // Map weight specs to shards
  const weightsManifest = [];
  let currentShardIdx = 0;
  let currentShardWeights = [];
  let currentShardStart = 0;

  let bytePos = 0;
  for (const spec of weightSpecs) {
    const numEl = spec.shape.reduce((a, b) => a * b, 1);
    const byteSize = numEl * 4;
    const specEntry = { name: spec.name, shape: spec.shape, dtype: spec.dtype };

    currentShardWeights.push(specEntry);
    bytePos += byteSize;

    if (currentShardIdx < actualShards2.length - 1 && bytePos >= actualShards2[currentShardIdx + 1].start) {
      weightsManifest.push({
        paths: [`group1-shard${currentShardIdx + 1}of${actualShards2.length}.bin`],
        weights: currentShardWeights
      });
      currentShardWeights = [];
      currentShardIdx++;
    }
  }
  if (currentShardWeights.length > 0) {
    weightsManifest.push({
      paths: [`group1-shard${currentShardIdx + 1}of${actualShards2.length}.bin`],
      weights: currentShardWeights
    });
  }

  console.log(`\nWriting ${actualShards2.length} shard(s)...`);

  for (let s = 0; s < actualShards2.length; s++) {
    const filename = `group1-shard${s + 1}of${actualShards2.length}.bin`;
    const filepath = path.join(OUTPUT_DIR, filename);
    const shardData = combined.slice(actualShards2[s].start, actualShards2[s].end);
    fs.writeFileSync(filepath, Buffer.from(shardData));
    console.log(`  ${filename} - ${(shardData.length / 1024 / 1024).toFixed(2)} MB`);
  }

  const modelJson = {
    format: 'graph-model',
    generatedBy: 'tensorflowjs-converter',
    convertedBy: 'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/classification/2/default/1',
    signature: model.signature,
    modelTopology: topology,
    weightsManifest
  };

  const jsonPath = path.join(OUTPUT_DIR, 'model.json');
  fs.writeFileSync(jsonPath, JSON.stringify(modelJson));
  const jsonSize = fs.statSync(jsonPath).size;
  console.log(`\n  model.json - ${(jsonSize / 1024).toFixed(1)} KB`);

  console.log('\n\u2713 Model saved to', OUTPUT_DIR);
  model.dispose();
}

main().catch(err => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
