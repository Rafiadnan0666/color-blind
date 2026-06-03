import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

let model = null;
let loaded = false;

export async function loadQnA() {
  if (loaded) return;
  loaded = true;
  try {
    await tf.ready();
    const qna = await import('@tensorflow-models/qna');
    model = await qna.load();
  } catch (e) {
    console.error('[QNA_LOAD_ERROR]', e?.message || e);
  }
}

export async function findAnswers(question, context) {
  if (!model) return [];
  try {
    const answers = await model.findAnswers(question, context);
    return answers.sort((a, b) => b.score - a.score).slice(0, 3);
  } catch (e) {
    console.error('[QNA_ERROR]', e);
    return [];
  }
}
