# Active Context

## Project Overview
**Unsplash × OpenAI Realtime Vision** - A production-ready demo showcasing OpenAI's Realtime API (`gpt-realtime`) for voice interaction and live image analysis using Next.js + MUI.

## Current Status
**Phase E: Production Ready** ✅
- All core features complete and tested
- Voice-to-voice conversations working
- Live screen sharing mode operational
- Auto-capture on image refresh functional
- Browser compatibility verified

## Active Features
### Recently Completed (November 14, 2025)
- ✅ Audio playback fix with browser autoplay policy compliance
- ✅ Active response tracking to prevent cancellation errors
- ✅ Toggle-based screen sharing with persistent MediaStream
- ✅ Auto-capture workflow on image refresh
- ✅ 1-second render delay for accurate screenshot capture
- ✅ Image-focused AI prompts (ignore UI elements)
- ✅ Refresh button for Unsplash images
- ✅ Comprehensive documentation (README, memory bank)

### Production Features
1. **Voice Conversations**: Real-time voice-to-voice chat with server VAD
2. **Screen Sharing**: Toggle-based live screen sharing mode
3. **Auto-Analysis**: AI automatically analyzes new images when you refresh
4. **Audio Responses**: Voice responses for both conversation and image analysis
5. **Smart Cancellation**: Only cancels responses when actually active
6. **Stream Reuse**: Single permission prompt, persistent MediaStream

### Next Improvements (Future)
- Performance metrics tracking
- Additional voice options
- Image history/gallery
- Session persistence
- Mobile optimization

## Key Implementation Decisions
- **Framework**: Next.js App Router with TypeScript
- **UI Library**: MUI v7 with Grid v7 API
- **Theming**: Dark theme via OS preferences
- **Real-time**: WebRTC with DataChannel for events
- **Audio**: PCM16 format, user interaction for autoplay compliance
- **Architecture**: Client-side WebRTC, minimal server proxies
- **Screen Sharing**: Persistent MediaStream reuse for performance

## Current Blockers
- None ✅

## Technical Context
- **Model**: `gpt-realtime` (OpenAI Realtime API)
- **Audio**: WebRTC remote audio track via RTCPeerConnection
- **Images**: Screenshot capture with stream reuse
- **Voice**: Server-side VAD for natural conversation
- **Scope**: Production demo with comprehensive error handling

## Architecture Highlights

### WebRTC Connection
- Direct browser-to-OpenAI peer connection
- Audio transceivers using `replaceTrack()` pattern
- DataChannel for JSON event streaming
- Active response tracking for clean cancellation
- Proper cleanup on unmount

### Screen Sharing Flow
1. User toggles screen share → captures MediaStream once
2. MediaStream stored in state for reuse
3. User clicks refresh on image → new image loads
4. 1-second delay for image to render
5. Auto-capture screenshot from existing stream (no re-permission)
6. AI analyzes with voice response
7. Cancels any active response before new capture

### Audio Playback
- Requires user interaction (browser autoplay policy)
- `enableAudio()` called on mic/screen share button click
- Audio element plays remote WebRTC audio track
- Reliable playback after first interaction

## Dependencies & Integrations
- **OpenAI**: Realtime API via SDP exchange (`/api/realtime/session`)
- **Unsplash**: Random photo API with server-side proxy
- **Browser APIs**: getUserMedia, getDisplayMedia, RTCPeerConnection, Web Audio API
- **MUI**: Grid v7, dark theme, IconButton, Tooltip, responsive components
- **Next.js**: App Router, API routes, Image optimization

## Session Summary
**Completion Date**: November 14, 2025
**Status**: Production Ready ✅
**All Phases**: A (Foundations), B (WebRTC), C (Voice), D (Screenshots), E (Polish) - Complete