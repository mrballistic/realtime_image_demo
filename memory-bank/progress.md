# Project Progress

## Project Timeline
**Start Date**: November 14, 2025
**Current Phase**: A - Foundations
**Target Completion**: TBD

## Implementation Phases

### Phase A: Foundations ⏳ (Current)
**Goal**: Establish project structure and basic UI

#### Tasks
- [ ] 1. Bootstrap Next.js (App Router, TypeScript) + MUI
- [ ] 2. Wire dark theme via `prefers-color-scheme`
- [ ] 3. Create 2-pane layout (responsive left image, right controls)
- [ ] 4. Implement `/api/unsplash` proxy for random photo
- [ ] 5. Add credit overlay for Unsplash attribution

**Status**: Not started
**Blockers**: None

### Phase B: Realtime WebRTC 📋 (Planned)
**Goal**: Implement core WebRTC functionality for realtime communication

#### Tasks
- [ ] 6. Build `useRealtime()` hook with RTCPeerConnection
- [ ] 7. Create DataChannel for JSON event messaging
- [ ] 8. Add `<audio autoplay>` for remote stream
- [ ] 9. Implement `/api/realtime/session` SDP exchange endpoint
- [ ] 10. Add session config (voice, modalities) integration

### Phase C: Voice Control 📋 (Planned) 
**Goal**: Implement microphone control and audio processing

#### Tasks
- [ ] 11. Mic control: getUserMedia + track management
- [ ] 12. Handle mic start/stop with visual feedback
- [ ] 13. Implement response cancellation on mic stop
- [ ] 14. Add level meter with Web Audio API
- [ ] 15. Handle server events (session.created, response.*)

### Phase D: Screenshot Flow 📋 (Planned)
**Goal**: Implement screen capture and image analysis

#### Tasks
- [ ] 16. Implement Share button with getDisplayMedia
- [ ] 17. Canvas capture to PNG data URL
- [ ] 18. Send conversation.item.create with image
- [ ] 19. Display thumbnail chip for captured image
- [ ] 20. Add image downscaling guardrails (>1.5MB)

### Phase E: Polish & QA 📋 (Planned)
**Goal**: Add polish features and comprehensive testing

#### Tasks
- [ ] 21. Event log with timestamps and types
- [ ] 22. Error toasts and empty states
- [ ] 23. Graceful retry on session disconnect
- [ ] 24. Manual test matrix (Chrome/Edge, permissions)
- [ ] 25. Observability: SDP round-trip and first token latency

## Completed Features
*None yet - project just initialized*

## Current Sprint (Week 1)
**Focus**: Project foundation and basic layout
**Target**: Complete Phase A tasks 1-5

## Architecture Milestones
- [ ] Next.js App Router foundation
- [ ] MUI integration with Grid v7
- [ ] Dark theme implementation
- [ ] Unsplash API integration
- [ ] WebRTC foundation
- [ ] Screenshot capture flow
- [ ] End-to-end voice + vision demo

## Performance Targets
- [ ] Initial audio round-trip < 1.5s
- [ ] SDP exchange latency tracking
- [ ] Zero crashes on Chrome/Edge latest
- [ ] Screenshot capture + analysis flow < 5s total

## Quality Gates
- [ ] TypeScript strict mode compliance
- [ ] ESLint passing without warnings
- [ ] Responsive design across device sizes
- [ ] Accessibility keyboard navigation
- [ ] Error handling for all permission scenarios