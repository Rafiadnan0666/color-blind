# ClrBlind — Color Blindness Detection & Accessibility App

AI-powered browser application for color blindness detection, object recognition, color analysis, and accessibility — all running **100% client-side** using ONNX Runtime Web and TensorFlow.js.

## Features

- **9 Detection Modes**: Fusion (all models simultaneously), COCO-SSD, SSD Lens, Currency (7 Indonesian rupiah denominations), Drug Detection, Traffic Light Detection, Accessibility Signs (crosswalk/stop/speedlimit/trafficlight), Meat Freshness (Fresh/Half-Fresh/Spoiled), Mushroom Toxicity (5 poisonous species)
- **Color Analysis**: 125+ named colors, hex/RGB/HSV/HSL, palette extraction with spatial positions, CVD simulation (protanopia/deuteranopia/tritanopia)
- **Color Picker**: Click on camera or uploaded image to sample color; live cursor preview; modal with save option
- **OCR Scanner**: Text extraction via Tesseract.js with copy and history
- **AI Assistant**: On-device QnA model answers questions about colors, accessibility, and app features
- **Scene Classification**: Identifies garden/kitchen/orchard/supermarket environments
- **Voice Feedback**: SpeechSynthesis announces detected objects, colors, meat safety, and mushroom toxicity
- **Saved Colors & Objects**: Full CRUD with inline editing and detail modals
- **Scan History**: Paginated history with search
- **Favorites**: Save and manage favorites
- **Notifications**: In-app notification panel
- **Theme System**: Light, Dark, Grey, and System themes with CSS custom properties
- **CVD Side-by-Side**: Compare normal vision with protanopia simulation on live camera/upload
- **Profile**: Avatar, CVD mode preference, voice toggle, performance mode (quality/balanced/performance)
- **Interactive Tour**: Onboarding with element highlighting for first-time users

## ML Models

### ONNX Runtime Web (WASM)

| Mode | Input | Classes |
|------|-------|---------|
| Currency | 224×224 | Rp 1.000, Rp 2.000, Rp 5.000, Rp 10.000, Rp 20.000, Rp 50.000, Rp 100.000 |
| Drug | 640×640 | Drug |
| Traffic Light | 640×640 | Red Light, Green Light, Yellow Light |
| Accessibility | 640×640 | Crosswalk, Speed Limit, Stop Sign, Traffic Light |
| Meat Freshness | 224×224 | Fresh, Half-Fresh, Spoiled |
| Mushroom | 224×224 | Autumn Skullcap, Death Cap, Destroying Angels, False Morel, Poison Fire Coral |

### TensorFlow.js

| Mode | Model | Classes |
|------|-------|---------|
| COCO-SSD / Fusion | MobileNetV2 | 80 COCO classes (person, car, bottle, etc.) |
| Scene | TFJS Graph | garden, orchard, indoor_kitchen, supermarket |

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

- **SvelteKit 2** with Svelte 5 runes ($state, $derived, $effect)
- **TensorFlow.js 4** — COCO-SSD object detection
- **ONNX Runtime Web** — YOLO model inference (WASM + threaded)
- **Tesseract.js** — OCR text extraction
- **Supabase** — Auth, database, notifications
- **Font Awesome 7** — Icons
- **Neo-brutalist Design** — Custom CSS with 4-theme system

## Project Structure

```
src/
  lib/
    detection/
      yoloDetection.js      — ONNX Runtime Web engine (load, preprocess, decode)
      tfDetection.js        — TensorFlow.js COCO-SSD engine
      mobilenetDetection.js — Wrapper around YOLO for all ONNX models
      colorDetection.js     — Color analysis (naming, palette, CVD simulation)
      sceneClassifier.js    — TFJS scene classification
      foodSafety.js         — Meat & mushroom analysis
      qnaDetection.js       — TensorFlow.js QnA
    supabase/db.js          — Database CRUD operations
    stores/auth.js          — Auth store
    components/
      TourGuide.svelte      — Interactive onboarding with element highlighting
      ModeSheet.svelte      — Detection mode picker sheet
      BottomNav.svelte      — Mobile navigation
  routes/
    detects/+page.svelte    — Main detection UI (camera + upload, all modes)
    dashboard/+page.svelte  — User dashboard with colorful cards
    profile/+page.svelte    — Profile & settings
    saved-colors/           — Saved colors CRUD
    saved-objects/          — Saved objects CRUD
    history/                — Scan history
    favorites/              — Favorites list
    notifications/          — Notifications panel
    assistant/              — AI assistant chat
    ocr/                    — OCR scanner
static/
  models/                   — 6 ONNX model files (.onnx)
  model_scene/              — TFJS scene classifier
  wasm/                     — ONNX Runtime Web WASM binaries
```

## Environment

Create `.env.local`:

```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Deployment

Supports Vercel and Netlify zero-config deployment. WASM MIME types are configured via `vercel.json` / `netlify.toml`. Ensure `static/wasm/` files are served with `application/wasm` MIME type.
