# Active Context

## Project Overview
**Unsplash × OpenAI Realtime Vision** - A lean prototype demonstrating GPT-5 Realtime API capabilities for voice interaction and image analysis using Next.js + MUI.

## Current Sprint Focus
**Phase A: Foundations & Setup** (Current)
- Bootstrap Next.js App Router with TypeScript and MUI
- Implement dark theme via `prefers-color-scheme`
- Create responsive 2-pane layout (image left, controls right)
- Integrate Unsplash API for random photos

## Active Features
### Recently Completed
- None (project initialization)

### In Progress
- Project setup and initial architecture
- PRD review and task planning

### Next Up
1. Next.js + MUI setup with dark theme
2. 2-pane responsive layout implementation
3. Unsplash API integration with credit overlay
4. WebRTC foundation with useRealtime() hook

## Key Implementation Decisions
- **Framework**: Next.js App Router (not Pages Router)
- **UI Library**: MUI v6+ with Grid v7 API (no `item` prop)
- **Theming**: Dark theme only via OS preferences (no toggle)
- **Real-time**: WebRTC over WebSocket for better performance
- **Architecture**: Edge-ready client with minimal server API routes

## Current Blockers
- None identified

## Technical Context
- **Model Target**: GPT-5 Realtime family
- **Audio**: WebRTC DataChannel for events, RTCPeerConnection for audio
- **Images**: Single screenshot capture (not streaming)
- **Scope**: Proof of concept - no auth, persistence, or analytics

## Next Session Goals
1. Complete Next.js + MUI foundation setup
2. Implement basic 2-pane layout structure
3. Add Unsplash integration with proper attribution
4. Begin WebRTC foundation planning

## Dependencies & Integrations
- **OpenAI**: Realtime API via unified SDP exchange or client secrets
- **Unsplash**: Random photo API with server-side proxy
- **Browser APIs**: getUserMedia, getDisplayMedia, RTCPeerConnection
- **MUI**: Grid v7, dark theme, responsive components