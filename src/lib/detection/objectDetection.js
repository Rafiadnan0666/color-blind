import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";

/**
 * @type {cocoSsd.ObjectDetection | null}
 */
let model = null;

export async function loadModel() {
    await tf.setBackend("webgl");

    if (!model) {
        model = await cocoSsd.load();
    }

    return model;
}

/**
 * @param {HTMLVideoElement} video
 * @returns {Promise<Array<cocoSsd.DetectedObject>>}
 */
export async function detectObjects(video) {
    if (!model) return [];

    const predictions = await model.detect(video);

    return predictions;
}