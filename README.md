# ClrBlind — AI-Powered Color Vision Accessibility App

**ClrBlind** is a privacy-first, fully client-side web application that helps users with color vision deficiencies (CVD) navigate a color-dependent world. It combines real-time object detection, color analysis, OCR, and scene understanding — all running inside the browser using ONNX Runtime Web and TensorFlow.js. **No images ever leave your device.**

> Built with SvelteKit 2, Svelte 5 runes, Supabase, and a neo-brutalist design system.

---

## Why ClrBlind?

Around 300 million people worldwide have some form of color blindness. Everyday tasks — reading traffic lights, identifying currency, checking meat freshness, distinguishing pills — can be challenging. ClrBlind puts a pocket AI assistant in the browser that describes the visual world aloud and on-screen, with zero server uploads.

---

## Features

### Detection Modes

All detection runs on-device. Models are loaded once and cached for the session.

| Mode | What It Detects |
|------|----------------|
| **Fusion** | All models simultaneously — union of all detections |
| **COCO-SSD** | 80 everyday objects: person, car, bottle, apple, dog, chair, etc. |
| **Currency** | 7 Indonesian rupiah denominations: Rp 1.000, Rp 2.000, Rp 5.000, Rp 10.000, Rp 20.000, Rp 50.000, Rp 100.000 |
| **Medicine** | Paracetamol, Panadol, Amoxicillin, Vitamin C |
| **Traffic Light** | Red light, Green light, Yellow light |
| **Accessibility Signs** | Crosswalk, Speed limit, Stop sign, Traffic light |
| **Meat Freshness** | Fresh, Half-fresh, Spoiled |
| **Mushroom Toxicity** | 5 poisonous species: Autumn Skullcap, Death Cap, Destroying Angels, False Morel, Poison Fire Coral |

### Color Analysis Engine

- **Color naming** — 183+ named colors mapped from hex/RGB/HSV/HSL/CIELAB
- **Dominant palette extraction** — with spatial position data from uploaded images or camera frames
- **CVD simulation** — see the world through protanopia, deuteranopia, or tritanopia filters
- **Side-by-side view** — split-screen comparison of normal vision vs. protanopia simulation (live camera or image)
- **Color picker** — click anywhere on the camera feed or uploaded image to sample a color; live cursor preview; save to collection
- **Contour detection** — Sobel edge detection highlights object boundaries
- **WCAG contrast ratios** — accessibility-aware color contrast evaluation
- **Harmonies** — complementary, analogous, triadic, and tetradic color schemes

### Scene Classification

Identifies the environment from 4 categories: garden, orchard, indoor kitchen, supermarket.

### OCR Scanner

- Text extraction via Tesseract.js (14 languages)
- Copy-to-clipboard with one tap
- Full scan history with search

### AI Assistant

- On-device QnA model answers questions about colors, accessibility, and app features
- Falls back to browser-native Language Model API (Gemini Nano) when available
- Chat history preserved

### Voice Feedback

- Web SpeechSynthesis announces detected objects, colors, meat safety, and mushroom toxicity
- Configurable voice and rate
- Toggle on/off from profile

### Data Management

| Feature | Details |
|---------|---------|
| **Saved Colors** | CRUD with inline editing, hex copy, detail modals |
| **Saved Objects** | CRUD with inline editing, notes, detail modals |
| **Favorites** | Save any detection; manage from a dedicated page |
| **Scan History** | Paginated, searchable, with mode/object/confidence metadata |
| **Object Analytics** | Tracks total detections, average confidence, last seen per object |
| **OCR History** | Full text and language metadata, paginated |
| **Assistant History** | Question-answer pairs, paginated |

### User Experience

- **Camera & upload** — live camera feed or image file (PNG, JPG, WebP, GIF, BMP, TIFF)
- **Batch processing** — upload multiple images, process sequentially, swtich between results
- **Magnifier** — live zoom with grid overlay for fine detail inspection
- **Interactive tour** — 3-step onboarding with element highlighting for first-time users
- **Notifications** — in-app panel with read/unread status, badge counts; transactional emails via Resend
- **Feedback** — rate the app, submit comments
- **Themes** — Light, Dark, Grey, and System themes via CSS custom properties
- **Performance modes** — Quality (400ms interval), Balanced (800ms), Performance (1200ms) for battery/device tuning

---

## ML Models

### TensorFlow.js (Active)

| Model | Backend | Input | Classes |
|-------|---------|-------|---------|
| COCO-SSD | MobileNetV2 | flexible | 80 COCO classes |
| Scene Classifier | TFJS Graph | 224×224 RGB | garden, orchard, indoor_kitchen, supermarket |
| QnA | MobileNet-based | text | Question answering |

### ONNX Runtime Web (Shipped, WASM)

| Model | Architecture | Input | Classes |
|-------|-------------|-------|---------|
| Currency | YOLOv8n | 640×640 | 7 rupiah denominations |
| Medicine | YOLOv8n | 640×640 | 4 pill types |
| Traffic Light | YOLOv8n | 640×640 | Red, Green, Yellow |
| Accessibility | YOLOv8n | 640×640 | Crosswalk, Speed Limit, Stop Sign, Traffic Light |
| Meat Freshness | MobileNetV3 | 224×224 | Fresh, Half-Fresh, Spoiled |
| Mushroom | MobileNetV3 | 224×224 | 5 poisonous species |

All ONNX models use WASM SIMD threading for near-native inference speed.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | SvelteKit 2 + Svelte 5 runes (`$state`, `$derived`, `$effect`) |
| **Build** | Vite 8 |
| **CSS** | Tailwind CSS 3.4 + neo-brutalist custom design system |
| **Icons** | Font Awesome 6 (CDN) |
| **Font** | Space Grotesk |
| **ML (Object Detection)** | TensorFlow.js 4 + COCO-SSD (WebGL) |
| **ML (YOLO Models)** | ONNX Runtime Web 1.26 (WASM + SIMD + threading) |
| **OCR** | Tesseract.js 6 (Web Worker) |
| **Voice** | Web SpeechSynthesis API |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (email/password, Google OAuth, magic link) |
| **Email** | Resend API via Supabase Edge Function (Deno) |
| **Deployment** | Vercel (zero-config) / Netlify |

---

## Project Structure

```
src/
  lib/
    detection/
      colorDetection.js       — Color analysis engine (naming, palette, harmonics, CVD)
      objectDetection.js       — COCO-SSD detection wrapper
      tfDetection.js           — TensorFlow.js loader/detector
      sceneClassifier.js       — TFJS scene classification
      foodSafety.js            — Meat & mushroom safety data
      qnaDetection.js          — On-device QnA inference
      yoloDetection.js         — ONNX YOLO engine (preprocess, infer, decode)
      mobilenetDetection.js    — ONNX model registry
      analysis.js              — Detection result analysis
    supabase/
      client.js                — Browser Supabase client
      server.js                — Server SSR Supabase client
      db.js                    — All CRUD operations (340 lines)
      notifications.js         — Notification helpers
    stores/
      auth.js                  — User and session stores
      settings.js              — Derived settings stores
    components/
      ModeSheet.svelte         — Detection mode picker
      BottomNav.svelte         — Mobile bottom navigation
      FavoritesPanel.svelte    — Favorites list modal
      NotificationsPanel.svelte — Notifications list modal
      ScanHistoryList.svelte   — Paginated scan history
      TourGuide.svelte         — Onboarding tour with highlighting
    utils/
      voice.js                 — SpeechSynthesis wrapper
      notifications.js         — Browser notification helpers
  routes/
    +page.svelte               — Landing page
    +layout.svelte             — App shell (header, nav, theme)
    detects/+page.svelte       — Main detection UI (camera + upload, all modes)
    dashboard/+page.svelte     — User dashboard with feature cards
    profile/+page.svelte       — Profile, settings, preferences
    assistant/+page.svelte     — AI chat assistant
    ocr/+page.svelte           — OCR scanner
    history/+page.svelte       — Scan history page
    favorites/+page.svelte     — Favorites page
    saved-colors/+page.svelte  — Saved colors CRUD
    saved-objects/+page.svelte — Saved objects CRUD
    notifications/+page.svelte — Notifications page
    auth/
      login/                   — Login form
      register/                — Registration
      forgot-password/        — Password reset request
      reset-password/         — New password form
      callback/               — OAuth callback (server)
      confirm/                — Email verification (server)
      logout/                 — Logout handler (server)
      oauth/google/           — Google OAuth redirect (server)
static/
  models/                      — 6 ONNX model files (.onnx)
  model_scene/                 — TFJS scene classifier (model.json + shards)
  model_tfjs/                 — Additional TFJS model artifacts
  wasm/                        — ONNX Runtime Web WASM binaries (8 variants)
supabase/
  functions/
    send-notification-email/   — Edge Function (Deno, Resend API)
```

---

## Quick Start

```bash
npm install
npm run dev
```

### Environment

Create `.env.local` in the project root:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Build & Deploy

```bash
npm run build
npm run preview
```

Supports **Vercel** and **Netlify** zero-config deployment. WASM MIME types and Cross-Origin headers are pre-configured in `vercel.json` and `netlify.toml`.

### Build Notes

- ONNX Runtime Web requires WASM files in `static/wasm/` to be served with `Content-Type: application/wasm`
- TensorFlow.js uses WebGL backend — ensure browser supports WebGL 2.0
- Tesseract.js runs in a Web Worker — CSP allows `blob:` workers

---

## Database Schema

The app uses Supabase PostgreSQL with 11 tables:

| Table | Purpose |
|-------|---------|
| `ScanHistory` | Detection results with mode, object name, color, confidence |
| `Favorites` | Bookmarked detections |
| `SavedColors` | User's color collection with hex/RGB |
| `SavedObjects` | User's object collection with notes |
| `ObjectAnalytics` | Aggregated detection statistics (RPC-driven) |
| `Notifications` | In-app notification feed |
| `Feedback` | User ratings and comments |
| `OCRHistory` | OCR extraction history |
| `AssistantHistory` | Q&A chat history |
| `UserSettings` | Feature toggles, theme, performance mode |
| `UserProfile` | Name, avatar, language, CVD preferences |

All tables reference `auth.users` via `userid` (UUID) with client-side rate limiting (10 ops / 2s window).

---

## Auth Providers

- **Email/Password** — standard registration and login
- **Google OAuth** — one-tap sign-in
- **Magic Link** — passwordless email login
- **Password Reset** — forgot password flow with recovery email

Session management uses `@supabase/ssr` with cookie-based sessions and real-time `onAuthStateChange` listeners.

---

## Performance Modes

Three levels adapt the detection interval to device capability:

- **Quality** (400ms) — fastest detection, higher battery use
- **Balanced** (800ms) — default, good trade-off
- **Performance** (1200ms) — slower detection, lower battery use

---

## Security & Privacy

- **100% client-side inference** — camera frames and uploaded images are never transmitted
- **Supabase only stores metadata** — object names, colors, confidence scores, timestamps
- **CSP headers** configured for safe WASM execution (`wasm-unsafe-eval`, `blob:`)
- **Cross-Origin policies** set for WASM and model file serving
- **Input sanitization** — all user inputs are stripped of `<>` and truncated before storage
- **Rate limiting** — client-side throttling prevents rapid-fire API calls

---

## License

MIT
