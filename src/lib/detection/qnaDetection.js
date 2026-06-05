import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
let model = null;
let loading = false;
export async function loadQnA() {
  if (model) return;
  if (loading) {
    while (loading) await new Promise(r => setTimeout(r, 100));
    return;
  }
  loading = true;
  try {
    await tf.ready();
    const qna = await import('@tensorflow-models/qna');
    model = await qna.load();
  } catch (e) {
    console.warn('[QNA] Model not available:', e?.message || e);
  }
  loading = false;
}
export async function findAnswers(question, context) {
  if (!model) {
    await loadQnA();
    if (!model) return [];
  }
  try {
    const answers = await model.findAnswers(question, context);
    return answers.sort((a, b) => b.score - a.score).slice(0, 3);
  } catch (e) {
    console.warn('[QNA] Answer error:', e);
    return [];
  }
}