# System Architecture

## High-Level Architecture

### Client-Side (Next.js App Router)
- **Framework**: Next.js with App Router (TypeScript, Edge-ready)
- **UI Library**: MUI with Grid v7 API (dark theme only)
- **Layout**: 2-pane responsive design (image left with refresh button, controls right)
- **Real-time**: WebRTC via RTCPeerConnection + DataChannel
- **Audio**: getUserMedia for input, remote audio track for playback (with user interaction requirement)
- **Screen Sharing**: Persistent MediaStream reuse for continuous analysis

### Server-Side (Next.js API Routes)
- **Minimal Backend**: Edge-compatible API routes
- **OpenAI Integration**: `/api/realtime/session` for SDP exchange
- **Proxy Services**: `/api/unsplash` for photo API (keeps keys secure)
- **Security**: Server-side key management, no client tokens

### Third-Party Services
- **OpenAI Realtime API**: GPT-5 family models for voice + vision
- **Unsplash API**: Random photo endpoint with attribution
- **Browser APIs**: WebRTC, getUserMedia, getDisplayMedia, Screen Capture

## Data Flow Patterns

### Voice Session Flow
1. **Client**: Create RTCPeerConnection + DataChannel
2. **Client**: Generate SDP offer, POST to `/api/realtime/session`
3. **Server**: Configure session, exchange SDP with OpenAI
4. **Client**: Set remote SDP, establish WebRTC connection
5. **Bi-directional**: Audio tracks + JSON events via DataChannel

### Screenshot Analysis Flow
1. **User**: Click Share button (toggles screen sharing mode)
2. **Browser**: getDisplayMedia() → capture MediaStream (stored for reuse)
3. **Client**: Canvas draw from video track → toDataURL('image/png')
4. **Client**: Send conversation.item.create with focused prompt + response.create
5. **OpenAI**: Process image, stream response with audio + text
6. **Client**: Play audio response via remote audio track
7. **User**: Click refresh button → new image loads
8. **Client**: Wait 1 second for render, auto-capture from stored MediaStream
9. **Client**: Cancel any active response, send new screenshot
10. **Repeat**: Steps 7-9 as desired until user stops sharing

### Auto-Capture Flow (Live Screen Sharing Mode)
1. **Toggle On**: User clicks "Share Screen", captures MediaStream once
2. **Image Change**: User clicks refresh button on Unsplash image
3. **Render Delay**: System waits 1 second for Next.js Image to render
4. **Auto-Capture**: Reuses stored MediaStream (no re-permission)
5. **Smart Cancel**: Cancels active response if AI is still talking
6. **Analysis**: AI analyzes new screenshot with voice response
7. **Toggle Off**: User clicks "Stop Sharing", cleans up MediaStream

### Image Loading Flow
1. **Page Load**: Request random Unsplash photo
2. **Server**: Proxy request to Unsplash API
3. **Client**: Display image with photographer attribution
4. **Caching**: Basic cache headers for performance

## Component Architecture

### Layout Components
```
App (page.tsx)
├── Screen Sharing State Management
├── ImagePane (left)
│   ├── UnsplashImage
│   ├── RefreshButton (upper-left overlay)
│   ├── CreditOverlay
│   └── onImageChange callback
└── ControlPane (right, forwardRef)
    ├── MicButton (toggle, enables audio)
    ├── ShareButton (toggle red when active)
    ├── EventsLog (streaming)
    ├── captureAndSend() exposed method
    └── MediaStream state management
```

### Hook Architecture
```
useRealtime()
├── RTCPeerConnection management
├── DataChannel event handling
├── Audio track control (replaceTrack pattern)
├── Active response tracking (activeResponseRef)
├── enableAudio() for autoplay compliance
├── cancelResponse() with active check
└── Session state management
```

## API Design

### `/api/realtime/session`
```typescript
// Request: SDP offer (text/plain)
POST /api/realtime/session
Content-Type: text/plain

// Response: SDP answer + session config
{
  sdp: "v=0...",
  type: "answer"
}
```

### `/api/unsplash`
```typescript
// Request: Random photo
GET /api/unsplash?query=nature

// Response: Proxied Unsplash data
{
  urls: { regular: "..." },
  user: { name: "...", links: "..." },
  links: { html: "..." }
}
```

## Event Architecture (OpenAI Realtime)

### Client → Server Events
```typescript
// Session configuration
{
  type: "session.update",
  session: {
    instructions: "Be concise...",
    output_modalities: ["text", "audio"]
  }
}

// Add message with image (focused prompt)
{
  type: "conversation.item.create",
  item: {
    role: "user",
    content: [
      { 
        type: "input_text", 
        text: "Describe only the main image in this screenshot. Ignore any UI elements, buttons, or interface components. Focus solely on the photograph or visual content being displayed." 
      },
      { type: "input_image", image_url: "data:image/png;base64,..." }
    ]
  }
}

// Request response with audio
{
  type: "response.create",
  response: { 
    modalities: ["text", "audio"]
  }
}

// Cancel active response (with check)
{
  type: "response.cancel"
  // Only sent if activeResponseRef.current !== null
}
```

### Server → Client Events
```typescript
// Session ready
{ type: "session.created" }

// Response started (tracked)
{ 
  type: "response.created",
  response: { id: "resp_123" }
  // Sets activeResponseRef.current = "resp_123"
}

// Streaming text response
{
  type: "response.output_text.delta",
  delta: "I can see..."
}

// Streaming audio response
{
  type: "response.audio.delta",
  delta: "base64_audio_data..."
  // Played via remote audio track
}

// Response complete (clear tracking)
{ 
  type: "response.done"
  // Sets activeResponseRef.current = null
}

// Response cancelled (clear tracking)
{
  type: "response.cancelled"
  // Sets activeResponseRef.current = null
}
```

## Security Architecture

### Authentication
- **No user accounts**: Stateless prototype
- **OpenAI API**: Server-side keys only
- **Session tokens**: Ephemeral via unified SDP or client secrets

### Privacy
- **No persistence**: All data in-memory only
- **No logging**: Audio/image not stored
- **Cache-Control**: no-store headers where relevant

### Input Validation
- **Image size limits**: Scale to 1920px width max, optimize quality
- **File type validation**: PNG/JPEG from canvas capture
- **Rate limiting**: Basic DOS protection
- **Browser compliance**: Autoplay policy via user interaction
- **Response tracking**: Prevent cancellation errors with activeResponseRef

## Performance Architecture

### Optimization Strategies
- **Edge deployment**: Next.js edge runtime compatible
- **Minimal bundles**: Tree-shaking, code splitting
- **Caching**: Appropriate cache headers for static assets
- **WebRTC**: Direct peer connection (no relay)
- **MediaStream reuse**: Single permission prompt for screen sharing
- **Smart cancellation**: Only cancel active responses to prevent errors
- **Audio optimization**: User interaction requirement for autoplay compliance

### Performance Targets
- **Initial load**: < 3s first contentful paint
- **Audio latency**: < 1.5s round-trip
- **Screenshot flow**: < 5s end-to-end (< 1s with stream reuse)
- **Memory usage**: Bounded image/audio buffers
- **Screen sharing**: Single permission prompt, persistent stream
- **Image render delay**: 1s for accurate auto-capture

## Error Handling Architecture

### Graceful Degradation
- **Permission denied**: Disable features gracefully, show user-friendly messages
- **Network issues**: Retry with exponential backoff
- **API failures**: Fallback to local processing where possible
- **Browser autoplay**: Audio enabled via user interaction (mic/screen share buttons)
- **Response conflicts**: Active response tracking prevents cancellation errors

### User Experience
- **Loading states**: Clear progress indicators
- **Error messages**: User-friendly, actionable
- **Recovery flows**: One-click retry mechanisms

### Development
- **TypeScript strict**: Compile-time error prevention
- **Error boundaries**: React error isolation
- **Monitoring**: Console-based observability

## Technology Stack

### Frontend
- **Next.js 14+**: App Router, TypeScript, Edge runtime
- **MUI 6+**: Grid v7, dark theme, responsive components, IconButton, Tooltip
- **WebRTC**: RTCPeerConnection, getUserMedia, getDisplayMedia APIs
- **Canvas API**: Screenshot processing with MediaStream video track
- **Audio**: Remote audio track playback with user interaction requirement
- **State Management**: React hooks (useState, useCallback, useRef, forwardRef)

### Backend
- **Next.js API Routes**: Edge-compatible serverless
- **OpenAI SDK**: Realtime API integration
- **HTTP Proxy**: Unsplash API integration

### Development
- **TypeScript**: Strict mode, interface-first design
- **ESLint + Prettier**: Code quality and formatting
- **Testing**: Unit tests for critical paths
- **Git**: Version control with conventional commits