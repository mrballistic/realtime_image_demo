# System Architecture

## High-Level Architecture

### Client-Side (Next.js App Router)
- **Framework**: Next.js with App Router (TypeScript, Edge-ready)
- **UI Library**: MUI with Grid v7 API (dark theme only)
- **Layout**: 2-pane responsive design (image left, controls right)
- **Real-time**: WebRTC via RTCPeerConnection + DataChannel
- **Audio**: getUserMedia for input, remote stream for playback

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
1. **User**: Click Share button
2. **Browser**: getDisplayMedia() → capture single frame
3. **Client**: Canvas draw → toDataURL('image/png')
4. **Client**: Send conversation.item.create + response.create
5. **OpenAI**: Process image, stream response.output_text.delta
6. **Client**: Accumulate deltas, display final response

### Image Loading Flow
1. **Page Load**: Request random Unsplash photo
2. **Server**: Proxy request to Unsplash API
3. **Client**: Display image with photographer attribution
4. **Caching**: Basic cache headers for performance

## Component Architecture

### Layout Components
```
App (page.tsx)
├── ImagePane (left)
│   ├── UnsplashImage
│   └── CreditOverlay
└── ControlPane (right)
    ├── MicButton (toggle)
    ├── ShareButton (screenshot)
    ├── LevelMeter (audio)
    └── EventsLog (streaming)
```

### Hook Architecture
```
useRealtime()
├── RTCPeerConnection management
├── DataChannel event handling
├── Audio track control
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

// Add message with image
{
  type: "conversation.item.create",
  item: {
    role: "user",
    content: [
      { type: "input_text", text: "What do you see?" },
      { type: "input_image", image_url: "data:image/png;base64,..." }
    ]
  }
}

// Request response
{
  type: "response.create",
  response: { output_modalities: ["text"] }
}
```

### Server → Client Events
```typescript
// Session ready
{ type: "session.created" }

// Streaming text response
{
  type: "response.output_text.delta",
  delta: "I can see..."
}

// Response complete
{ type: "response.done" }
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
- **Image size limits**: Scale to 1280px width max
- **File type validation**: PNG/JPEG only
- **Rate limiting**: Basic DOS protection

## Performance Architecture

### Optimization Strategies
- **Edge deployment**: Next.js edge runtime compatible
- **Minimal bundles**: Tree-shaking, code splitting
- **Caching**: Appropriate cache headers for static assets
- **WebRTC**: Direct peer connection (no relay)

### Performance Targets
- **Initial load**: < 3s first contentful paint
- **Audio latency**: < 1.5s round-trip
- **Screenshot flow**: < 5s end-to-end
- **Memory usage**: Bounded image/audio buffers

## Error Handling Architecture

### Graceful Degradation
- **Permission denied**: Disable features gracefully
- **Network issues**: Retry with exponential backoff
- **API failures**: Fallback to local processing where possible

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
- **MUI 6+**: Grid v7, dark theme, responsive components
- **WebRTC**: RTCPeerConnection, getUserMedia APIs
- **Canvas API**: Screenshot processing

### Backend
- **Next.js API Routes**: Edge-compatible serverless
- **OpenAI SDK**: Realtime API integration
- **HTTP Proxy**: Unsplash API integration

### Development
- **TypeScript**: Strict mode, interface-first design
- **ESLint + Prettier**: Code quality and formatting
- **Testing**: Unit tests for critical paths
- **Git**: Version control with conventional commits