# ClrBlind — Color Blindness Detection & Accessibility App

A fully client-side browser ML app for visually impaired users. Identifies objects, analyzes colors, extracts text, and provides voice feedback — all running locally in the browser.

## Features

- **8 Detection Modes**: Fusion, COCO, Traffic Light, Currency, Medicine, Products, Accessibility, Fruit
- **Color Analysis**: Name, hex, RGB, HSL, palette extraction, CVD simulation (protanopia/deuteranopia/tritanopia)
- **OCR Scanner**: Extract text from images using Tesseract.js, auto-saves to history
- **Voice Feedback**: Speaks detected object names and colors via browser SpeechSynthesis
- **AI Assistant**: Ask questions about detected objects and colors
- **Saved Colors & Objects**: Full CRUD with detail modals, inline editing
- **Favorites**: Save and manage favorite detections
- **Scan History**: Browse past detections with pagination
- **Notifications**: In-app + native push notifications
- **Profile**: Avatar, settings, CVD mode, theme, performance mode
- **Scene Classification**: Identifies garden, kitchen, orchard, supermarket, indoor/outdoor
- **All ML runs in-browser** — ONNX Runtime Web + TensorFlow.js, no server calls

## ML Architecture

| Mode | Model | Backend |
|------|-------|---------|
| Fusion / COCO / Fruit | COCO-SSD (MobileNetV2) | TensorFlow.js |
| Traffic Light | YOLOv8 → ONNX | ONNX Runtime Web |
| Currency (7 rupiah) | YOLOv8 → ONNX | ONNX Runtime Web |
| Medicine (4 pills) | MobileNetV2 TFJS | TensorFlow.js |
| Products (44 Indian) | YOLOv8 → ONNX | ONNX Runtime Web |
| Accessibility (4 signs) | YOLOv8 → ONNX | ONNX Runtime Web |

## Quick Start

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Tech Stack

- **SvelteKit 2** — Full-stack framework
- **TensorFlow.js 4** — COCO-SSD inference
- **ONNX Runtime Web** — YOLO model inference (wasm + threads)
- **Tesseract.js** — OCR text extraction
- **Supabase** — Auth, database, notifications
- **Font Awesome 7** — Icons
- **Neo-brut design** — Custom CSS design system

## Project Structure

```
src/
  lib/
    detection/          — ML detection engines (TFJS + ONNX)
    supabase/db.js      — Database CRUD operations
    utils/
      voice.js          — Text-to-speech utility
      notifications.js  — Push notification helper
    components/         — Reusable UI components
  routes/
    detects/            — Main detection UI (camera + upload)
    ocr/                — OCR scanner
    assistant/          — AI assistant chat
    dashboard/          — User dashboard
    profile/            — Profile & settings
    saved-colors/       — Saved colors CRUD
    saved-objects/      — Saved objects CRUD
    history/            — Scan history
    favorites/          — Favorites list
    notifications/      — Notifications panel
static/
  model_mobilenet/      — Deployed TFJS models
  model_onnx/           — ONNX YOLO models
```

## Environment

Create `.env.local`:

```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Deployment

Supports Vercel and Netlify zero-config deployment. WASM MIME types are configured via `vercel.json` / `netlify.toml`.
