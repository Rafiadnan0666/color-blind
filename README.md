# ClrBlind — Color Blindness Detection & Accessibility App

A fully client-side browser ML app that identifies objects and analyzes colors for people with color vision deficiency (CVD).

## Features

- **8 Detection Modes**: Fusion, COCO, Traffic Light, Currency, Medicine, Products, Accessibility, Fruit
- **Color Analysis**: Name, hex, RGB, HSL, palette extraction, contour detection
- **CVD Simulation**: Protanopia, Deuteranopia, Tritanopia views
- **Scene Classification**: Identifies garden, kitchen, orchard, supermarket
- **All ML runs in-browser** — no server calls, no data leakage

## ML Architecture

| Mode | Model | Backend |
|------|-------|---------|
| Fusion / COCO / Fruit | COCO-SSD | TensorFlow.js (MobileNetV2) |
| Traffic Light | SSD MobileNetV2 | TensorFlow.js |
| Currency (7 rupiah) | SSD MobileNetV2 | TensorFlow.js |
| Medicine (4 pills) | SSD MobileNetV2 | TensorFlow.js |
| Products (44 Indian) | SSD MobileNetV2 | TensorFlow.js |
| Accessibility (4 signs) | SSD MobileNetV2 | TensorFlow.js |

**All custom models use MobileNetV2 backbone** (converted from YOLOv8 ONNX) for faster, lighter browser inference.

## Quick Start

```bash
npm install
npm run dev
```

## Training Custom Models

See `training/README.md` for the JupyterLab-based training pipeline:

```bash
cd training
pip install -r requirements.txt
jupyter lab
```

Opens `notebooks/01_mobilenetv2_training_pipeline.ipynb` — runs on CPU or GPU, exports directly to TFJS.

## Dataset Sources

| Model | Source | Link |
|-------|--------|------|
| Accessibility | Kaggle — Road Sign Detection | [andrewmvd/road-sign-detection](https://www.kaggle.com/datasets/andrewmvd/road-sign-detection) |
| Traffic Light | Roboflow | [Traffic Light Dataset](https://universe.roboflow.com/traffic-light-detection-qsrxn/traffic-light-oq7uj) |
| Currency | Custom | Collect Indonesian rupiah images |
| Medicine | Custom | Collect pill packaging images |
| Products | Custom | Collect Indian FMCG product images |

## Project Structure

```
src/
  lib/
    detection/
      mobilenetDetection.js   — MobileNetV2 TFJS inference engine
      tfDetection.js          — COCO-SSD wrapper
      objectDetection.js      — Detection orchestrator
      sceneClassifier.js      — Scene classification
      colorDetection.js       — Color analysis utilities
      yoloDetection.js        — [Deprecated] YOLO ONNX fallback
  routes/
    detects/+page.svelte      — Main detection UI
training/
  notebooks/                  — JupyterLab training notebooks
  configs/                    — Dataset YAML configs
  datasets/                   — Downloaded/prepared datasets
  exported_models/            — SavedModel checkpoints
static/
  model_mobilenet/            — TFJS deployed models
  model_onnx/                 — [Legacy] YOLO ONNX models
  model_scene/                — Scene classifier
```

## Tech Stack

- **SvelteKit 2** — Full-stack framework
- **TensorFlow.js 4** — ML inference in browser
- **Tailwind CSS** — Neo-brut design system
- **Supabase** — Auth, DB, notifications
- **Prisma** — PostgreSQL ORM
