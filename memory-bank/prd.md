# PRD — Unsplash × OpenAI Realtime Vision (Next.js + MUI)

## 1) Summary

A lean prototype that proves GPT‑5 Realtime can (a) start a voice session from the browser, (b) accept a single screenshot image, and (c) describe what it sees. The UI shows a random Unsplash image on the left and a compact control panel on the right with **Mic** and **Share** (screenshot) actions. Dark theme is derived from user OS prefs (no theme toggle).

**Out of scope:** auth, accounts, persistence, analytics, multi‑party calling, continuous screen capture.

---

## 2) Goals & Non‑Goals

**Goals**

* 1‑click start/stop mic to talk to GPT‑5 Realtime.
* Send a **single** captured screenshot (not a live stream) to the active session.
* Ask: “What do you see?” and receive a concise description.
* Keep the app tiny and idiomatic: Next.js + App Router + MUI + TypeScript.

**Non‑Goals**

* No databases, no user profiles, no transcripts export, no fine‑tuning.
* No WebSocket path for the browser (we’ll prefer WebRTC); WS noted below for completeness.

---

## 3) Primary User Stories

* **US‑1:** As a user, I click **Mic** to start a realtime conversation; I hear the model and can speak back.
* **US‑2:** As a user, I click **Share** to capture one screenshot, send it to the session, and ask the model to describe it.
* **US‑3:** As a user, I see a random Unsplash photo each load.

---

## 4) Architecture (High‑Level)

**Client (Next.js, Edge‑ready)**

* React client page renders a 2‑pane layout.
* Uses WebRTC to the Realtime API. Audio handled via `getUserMedia` and `RTCPeerConnection`.
* DataChannel carries client/server events (JSON).
* Screenshot capture uses the Screen Capture API → canvas → PNG data URL.

**Server (Next.js API Route)**

* Small API route `/api/realtime/session` to initialize the session using the **unified interface** (exchange SDP with OpenAI) *or* mint a short‑lived client secret.
* API route `/api/unsplash` to proxy Unsplash random photo (keeps keys server‑side, adds minimal cache headers).

**Third‑Party**

* Unsplash API (Random photo endpoint).
* OpenAI Realtime (model: `gpt-realtime` family or `gpt-5` with realtime).

---

## 5) UI & UX

**Layout**

* **Left pane:** responsive image container (object‑fit: cover; preserves aspect). Shows Unsplash random image with credit overlay.
* **Right pane:** vertical stack of controls and events log.

  * **Mic** (toggle): start/stop audio track; shows level meter.
  * **Share**: opens picker, captures one frame, displays a thumbnail chip, and sends to the session.
  * **Ask**: implicit; after Share, we automatically send “What do you see?” (configurable).
  * Events log: textual stream of `response.output_text.delta` and a final turn summary when `response.done` arrives.

**Theming**

* MUI theme uses `prefers-color-scheme: dark`; no theme switch.

**Accessibility**

* Keyboard: Space = Mic toggle; Enter = Share dialog confirm; ARIA labels for buttons; live region for streaming text.

---

## 6) Realtime API: Event Shapes & Flows (WebRTC‑first)

> This section captures the **actual event names and minimal JSON** we’ll send/handle on the DataChannel. The app focuses on WebRTC; WebSocket equivalents are listed for reference.

### 6.1 Start session (browser)

1. Create peer connection, local mic track, and a DataChannel (e.g., `oai-events`).
2. Create offer and POST the SDP to our `/api/realtime/session` endpoint.
3. Set remote description from the returned SDP.
4. Wait for `session.created` from the server.

**Client event (optional, to tweak config mid‑session):**

```json
{
  "type": "session.update",
  "session": {
    "type": "realtime",
    "instructions": "Be concise. If the user sends an image, describe key elements first.",
    "output_modalities": ["text", "audio"],
    "audio": {
      "input": { "turn_detection": { "type": "semantic_vad" } },
      "output": { "voice": "verse" }
    }
  }
}
```

### 6.2 Mic on/off (WebRTC)

* **On:** add mic track to `RTCPeerConnection`.
* **Off:** remove/disable track; optionally send `response.cancel` if a reply is mid‑generation.

**(WebSocket‑only note):** you would send `input_audio_buffer.append` (base64 PCM), then `input_audio_buffer.commit`; server emits `input_audio_buffer.committed`. Not needed in WebRTC path.

### 6.3 Send a screenshot (single frame) + ask

1. Capture display: `navigator.mediaDevices.getDisplayMedia({ video: true })` → draw a frame to `<canvas>` → `canvas.toDataURL('image/png')`.
2. Add a **conversation item** with text and image; then ask model to respond.

**Client event:** add user message with image

```json
{
  "type": "conversation.item.create",
  "item": {
    "type": "message",
    "role": "user",
    "content": [
      { "type": "input_text", "text": "What do you see in this screenshot?" },
      { "type": "input_image", "image_url": "data:image/png;base64,<<BASE64>>" }
    ]
  }
}
```

**Then request a response (text only or text+audio):**

```json
{
  "type": "response.create",
  "response": { "output_modalities": ["text"] }
}
```

**Server events to handle:**

* `conversation.item.added` / `conversation.item.done`
* `response.created`
* `response.content_part.added`
* `response.output_text.delta` (streaming text chunks)
* `response.output_text.done`
* `response.done`

### 6.4 Cancel a response (e.g., user mutes mid‑generation)

```json
{ "type": "response.cancel" }
```

### 6.5 WebSocket parity (reference only)

If we were to use WebSockets instead of WebRTC from the browser, audio would be manual:

* Append audio bytes (base64 PCM):

```json
{ "type": "input_audio_buffer.append", "audio": "<<BASE64_PCM>>" }
```

* Commit the buffer:

```json
{ "type": "input_audio_buffer.commit" }
```

* Ask the model to respond:

```json
{ "type": "response.create" }
```

* Expect server events like `input_audio_buffer.speech_started`, `input_audio_buffer.speech_stopped`, `input_audio_buffer.committed`, `response.output_audio.delta` (if audio output configured), and `response.done`.

---

## 7) Unsplash Integration (Random Left Pane)

* Use `/photos/random` with minimal query params for variety; provide photographer credit and link per Unsplash guidelines.
* Server proxy to keep the access key private and allow light caching.
* Fallback image in case of rate limit.

---

## 8) Security & Privacy

* No tokens in the client; use unified SDP exchange (or ephemeral client secret with tight TTL) via our server.
* No storage of audio/image; all in‑memory only. Add `Cache-Control: no-store` where relevant.
* Limit screenshot resolution (e.g., scale to 1280px width) before sending to the model.

---

## 9) Edge Cases

* Mic permissions denied → show inline error and disable Mic button.
* Display capture denied/canceled → show toast, keep session active.
* Large screenshots → warn + downscale.
* Mid‑generation cancel → send `response.cancel`, clear progress UI.
* VAD false trigger (quiet rooms) → allow manual press‑to‑talk mode (toggle).

---

## 10) Success Criteria

* Within one click of **Share**, the model returns a correct short description of the screenshot.
* Latency: initial audio round‑trip < 1.5s on a typical laptop.
* Zero crashes across Chrome and Edge latest.

---

## 11) Implementation Plan & Task List

**A. Foundations**

1. Bootstrap Next.js (App Router, TypeScript) + MUI; wire dark theme via `prefers-color-scheme`.
2. Create 2‑pane layout with responsive left image, right controls.
3. Implement `/api/unsplash` proxy for random photo; show credit overlay.

**B. Realtime (WebRTC)**
4. Client: build `useRealtime()` hook

* create `RTCPeerConnection`; add `<audio autoplay>` for remote stream
* create DataChannel; register message handler (JSON parse + event dispatch)
* helpers: `send(event)`, `on(type, fn)`, `off(type, fn)`

5. Server: `/api/realtime/session`

   * Accept SDP offer (text/plain), attach session config (voice, modalities), POST to OpenAI `/v1/realtime/calls`, return SDP answer
   * Optional: alternate path to mint client secret via `/v1/realtime/client_secrets`
6. Mic control

   * Start: `getUserMedia({audio:true})`, `pc.addTrack(track)`
   * Stop: stop track; if generating, send `response.cancel`
7. Handle server events

   * Stream `response.output_text.delta` to a live region; accumulate to a turn buffer; finalize on `response.done`

**C. Screenshot flow**
8. Implement **Share** button flow

* `getDisplayMedia({video:true})` → draw current frame to canvas → `toDataURL('image/png')`
* Send `conversation.item.create` (input_text + input_image) → then `response.create`
* Display thumbnail chip; retain only last screenshot in memory

9. Guardrails

   * Downscale PNG if >1.5MB; catch and toast on DataChannel send failures

**D. Polish**
10. Level meter (Web Audio API) under Mic button
11. Minimal event log with timestamps and types
12. Error toasts & empty states; graceful retry of session on disconnect

**E. QA**
13. Manual test matrix: Chrome/Edge (desktop), mic/screen permission permutations, slow network
14. Observability: console timing for SDP round‑trip and first token latency

---

## 12) Testing Notes

* Mock mode for CI: bypass network, render fake deltas.
* Visual diff of screenshot downscaling to ensure quality remains readable.

---

## 13) Future Considerations

* Server‑side tool calling to route identified UI elements to actions.
* Multi‑image comparison (Unsplash vs. screenshot).
* Export/share transcripts.
