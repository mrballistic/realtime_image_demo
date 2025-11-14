# OpenAI Realtime API Reference

**Last Updated**: November 2025  
**Model**: `gpt-realtime` (latest stable, also versioned as `gpt-realtime-2025-08-28`)  
**Documentation**: https://platform.openai.com/docs/guides/realtime  

## Connection Methods

### WebRTC (Recommended for Browser)
```typescript
// 1. Create SDP offer
const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
})

// Add audio transceiver BEFORE creating offer
pc.addTransceiver('audio', { direction: 'sendrecv' })

const offer = await pc.createOffer()
await pc.setLocalDescription(offer)

// 2. Exchange with OpenAI via server proxy
const response = await fetch('/api/realtime/session', {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: offer.sdp
})
const answerSDP = await response.text()
await pc.setRemoteDescription({ type: 'answer', sdp: answerSDP })

// 3. Create DataChannel for events
const dataChannel = pc.createDataChannel('oai-events', { ordered: true })
```

### Server-Side SDP Exchange
```typescript
// app/api/realtime/session/route.ts
export async function POST(request: Request) {
  const offerSDP = await request.text()
  
  const response = await fetch(
    'https://api.openai.com/v1/realtime?model=gpt-realtime',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/sdp'
      },
      body: offerSDP
    }
  )
  
  const answerSDP = await response.text()
  return new Response(answerSDP, {
    headers: { 'Content-Type': 'application/sdp' }
  })
}
```

### WebSocket (Server-Side)
```typescript
// Not recommended for browser due to token security
const ws = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-realtime', {
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'OpenAI-Beta': 'realtime=v1'
  }
})
```

## Session Configuration

### Session Update Event (CORRECT FORMAT)
```typescript
// Send this after DataChannel opens
{
  type: "session.update",
  session: {
    modalities: ["audio", "text"],  // ⚠️ ORDER MATTERS! Audio first for voice responses
    instructions: "You are a helpful assistant. Be concise and friendly.",
    voice: "verse",  // Options: alloy, ash, ballad, coral, echo, sage, shimmer, verse
    input_audio_format: "pcm16",  // or "g711_ulaw", "g711_alaw"
    output_audio_format: "pcm16",
    input_audio_transcription: {
      model: "whisper-1"
    },
    turn_detection: {
      type: "server_vad",  // Server Voice Activity Detection
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500
    },
    temperature: 0.8,
    max_response_output_tokens: "inf"  // or integer
  }
}

// Server responds with:
{ type: "session.created", session: {...} }
{ type: "session.updated", session: {...} }
```

**CRITICAL**: The order of modalities array matters! Put `"audio"` first if you want audio responses by default. If `"text"` is first, responses may only contain text even with VAD-triggered responses.

### Common Configuration Issues
```typescript
// ❌ WRONG - These parameters don't exist in gpt-realtime
{
  session: {
    output_modalities: [...],  // Wrong! Use 'modalities'
    audio: {  // Wrong! Flat structure only
      input: {...},
      output: {...}
    }
  }
}

// ✅ CORRECT - Flat structure
{
  session: {
    modalities: ["text", "audio"],
    voice: "verse",
    input_audio_format: "pcm16",
    output_audio_format: "pcm16",
    turn_detection: { type: "server_vad", ... }
  }
}
```

## Conversation & Response Events

### Creating Conversation Items
```typescript
// Add user message with text
{
  type: "conversation.item.create",
  item: {
    type: "message",
    role: "user",
    content: [
      { type: "input_text", text: "What's in this image?" }
    ]
  }
}

// Add user message with image
{
  type: "conversation.item.create",
  item: {
    type: "message",
    role: "user",
    content: [
      { 
        type: "input_image",
        image_url: "data:image/png;base64,iVBORw0KGgoAAAA..."
      }
    ]
  }
}

// Multi-modal: text + image
{
  type: "conversation.item.create",
  item: {
    type: "message",
    role: "user",
    content: [
      { type: "input_text", text: "Describe this screenshot:" },
      { type: "input_image", image_url: "data:image/png;base64,..." }
    ]
  }
}
```

### Requesting Responses
```typescript
// Request response (uses session modalities by default)
{
  type: "response.create"
}

// ❌ WRONG - response.output_modalities doesn't exist
{
  type: "response.create",
  response: {
    output_modalities: ["text"]  // This parameter is invalid!
  }
}

// Cancel ongoing response
{
  type: "response.cancel"
}
```

### Response Events
```typescript
// Response lifecycle
{ type: "response.created", response: {...} }
{ type: "response.output_item.added", output_index: 0, item: {...} }
{ type: "response.content_part.added", content_index: 0, part: {...} }

// Text output
{
  type: "response.text.delta",
  response_id: "resp_001",
  item_id: "msg_001",
  output_index: 0,
  content_index: 0,
  delta: "I can see a screenshot..."
}
{ type: "response.text.done", text: "..." }

// Audio output
{
  type: "response.audio.delta",
  response_id: "resp_001",
  item_id: "msg_001", 
  output_index: 0,
  content_index: 0,
  delta: "<<BASE64_PCM>>"
}
{ type: "response.audio.done" }

// Audio transcript
{
  type: "response.audio_transcript.delta",
  delta: "Hello, how can I help you?"
}
{ type: "response.audio_transcript.done", transcript: "..." }

// Completion
{ 
  type: "response.done",
  response: {
    status: "completed",  // or "cancelled", "failed", "incomplete"
    usage: {
      total_tokens: 150,
      input_tokens: 50,
      output_tokens: 100
    }
  }
}
```

## Audio Input Events (WebRTC Auto-Managed)

### WebRTC Audio Flow
```typescript
// With WebRTC + server_vad, audio is automatically managed:
// 1. Add audio track to peer connection
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const audioTrack = stream.getAudioTracks()[0]
const sender = pc.getSenders().find(s => s.track?.kind === 'audio')
await sender.replaceTrack(audioTrack)  // Use replaceTrack, not addTrack!

// 2. Server automatically detects speech and commits buffer
// You'll receive these events automatically:
{ type: "input_audio_buffer.speech_started" }
{ type: "input_audio_buffer.speech_stopped" }  
{ type: "input_audio_buffer.committed" }
{ type: "conversation.item.created", item: { type: "message", role: "user", ... } }

// 3. Response is automatically triggered by server_vad
{ type: "response.created" }
{ type: "response.audio.delta", delta: "<<BASE64>>" }
{ type: "response.done" }
```

### Manual Audio Control (WebSocket Only)
```typescript
// Only needed if using WebSocket connection without server_vad
{
  type: "input_audio_buffer.append",
  audio: "<<BASE64_PCM16>>"
}

{ type: "input_audio_buffer.commit" }

{ type: "input_audio_buffer.clear" }
```

### Input Audio Transcription
```typescript
// Transcription events (if enabled in session config)
{
  type: "conversation.item.input_audio_transcription.delta",
  item_id: "msg_001",
  content_index: 0,
  delta: "Hello, can you help me"
}

{
  type: "conversation.item.input_audio_transcription.completed",
  item_id: "msg_001",
  content_index: 0,
  transcript: "Hello, can you help me with this?"
}
```

## Critical WebRTC Patterns

### Audio Track Management (IMPORTANT!)
```typescript
// ❌ WRONG - Never use addTrack after initial setup
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const track = stream.getAudioTracks()[0]
pc.addTrack(track, stream)  // This causes renegotiation and breaks DataChannel!

// ✅ CORRECT - Always use replaceTrack
// 1. Create transceiver during setup (BEFORE creating offer)
pc.addTransceiver('audio', { direction: 'sendrecv' })

// 2. Create offer and complete SDP exchange
const offer = await pc.createOffer()
await pc.setLocalDescription(offer)
// ... exchange SDP ...

// 3. Later, when user clicks mic button, use replaceTrack
const startMic = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const audioTrack = stream.getAudioTracks()[0]
  
  // Find the audio sender from the transceiver we created
  const sender = pc.getSenders().find(s => s.track === null || s.track.kind === 'audio')
  
  if (sender) {
    await sender.replaceTrack(audioTrack)  // No renegotiation!
  }
}

// 4. To stop mic, replace with null
const stopMic = () => {
  const sender = pc.getSenders().find(s => s.track?.kind === 'audio')
  if (sender) {
    sender.replaceTrack(null)  // Stops sending audio without renegotiation
  }
  
  // Stop the local track
  localStream?.getAudioTracks().forEach(track => track.stop())
}
```

### Remote Audio Playback
```typescript
// Handle incoming audio track from OpenAI
pc.ontrack = (event) => {
  if (event.track.kind === 'audio') {
    const [remoteStream] = event.streams
    
    // Create audio element for playback
    const audioElement = new Audio()
    audioElement.autoplay = true
    audioElement.srcObject = remoteStream
    
    // Start playback
    audioElement.play().catch(err => {
      console.error('Audio playback failed:', err)
      // May need user interaction to enable autoplay
    })
  }
}
```

### DataChannel Event Handling
```typescript
// Create DataChannel
const dataChannel = pc.createDataChannel('oai-events', { ordered: true })

dataChannel.onopen = () => {
  console.log('DataChannel opened')
  
  // Send session configuration immediately
  dataChannel.send(JSON.stringify({
    type: 'session.update',
    session: {
      modalities: ['text', 'audio'],
      instructions: '...',
      voice: 'verse',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      turn_detection: { type: 'server_vad', ... }
    }
  }))
}

dataChannel.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data)
    console.log('Received event:', data.type, data)
    
    // Handle errors
    if (data.type === 'error') {
      console.error('API Error:', data.error)
    }
    
    // Emit to event handlers
    eventEmitter.emit(data.type, data)
  } catch (error) {
    console.error('Failed to parse message:', error)
  }
}

dataChannel.onclose = () => {
  console.log('DataChannel closed')
}

dataChannel.onerror = (error) => {
  console.error('DataChannel error:', error)
}

// Sending events
const send = (event: any) => {
  if (dataChannel?.readyState === 'open') {
    dataChannel.send(JSON.stringify(event))
  } else {
    console.warn('DataChannel not ready:', event.type)
  }
}
```

### Connection State Management
```typescript
pc.onconnectionstatechange = () => {
  console.log('Connection state:', pc.connectionState)
  
  switch (pc.connectionState) {
    case 'connected':
      console.log('WebRTC connected')
      break
    case 'disconnected':
    case 'failed':
      console.error('Connection failed, attempting reconnect...')
      // Implement reconnection logic
      break
    case 'closed':
      console.log('Connection closed')
      break
  }
}

pc.oniceconnectionstatechange = () => {
  console.log('ICE connection state:', pc.iceConnectionState)
}
```

## Error Handling

### Common API Errors
```typescript
// Error event structure
{
  type: "error",
  error: {
    type: "unknown_parameter",
    code: "unknown_parameter", 
    message: "Unknown parameter: 'session.output_modalities'.",
    param: "session.output_modalities"
  }
}

// Common errors:
// - "unknown_parameter": Using beta API params on GA model
// - "invalid_request_error": Malformed request
// - "authentication_error": Invalid API key
// - "rate_limit_error": Too many requests
```

### Connection Error Handling
```typescript
pc.onconnectionstatechange = () => {
  if (pc.connectionState === 'failed') {
    console.error('WebRTC connection failed')
    // Retry with backoff
    setTimeout(() => reconnect(), 1000)
  }
}

dataChannel.onerror = (error) => {
  console.error('DataChannel error:', error)
  // Show user error, attempt recovery
}
```

### Microphone Permissions
```typescript
const requestMicPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })
    return { success: true, stream }
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      return { success: false, error: 'Microphone permission denied' }
    } else if (error.name === 'NotFoundError') {
      return { success: false, error: 'No microphone found' }
    } else {
      return { success: false, error: 'Microphone access failed' }
    }
  }
}
```

## Image Handling

### Screenshot Capture
```typescript
const captureScreenshot = async (): Promise<string> => {
  // Request screen share
  const stream = await navigator.mediaDevices.getDisplayMedia({ 
    video: { mediaSource: 'screen' }
  })
  
  // Create video element
  const video = document.createElement('video')
  video.srcObject = stream
  await video.play()
  
  // Wait for video metadata
  await new Promise(resolve => {
    video.onloadedmetadata = resolve
  })
  
  // Capture frame to canvas
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video, 0, 0)
  
  // Stop stream
  stream.getTracks().forEach(track => track.stop())
  
  // Return base64 data URL
  return canvas.toDataURL('image/png')
}
```

### Image Optimization
```typescript
const optimizeImage = async (
  dataUrl: string, 
  maxWidth: number = 1280,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      // Calculate dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // Return optimized data URL
      resolve(canvas.toDataURL('image/png', quality))
    }
    
    img.src = dataUrl
  })
}
```

### Sending Images to Model
```typescript
// 1. Capture and optimize
const screenshot = await captureScreenshot()
const optimized = await optimizeImage(screenshot, 1280, 0.8)

// 2. Create conversation item
send({
  type: 'conversation.item.create',
  item: {
    type: 'message',
    role: 'user',
    content: [
      { type: 'input_image', image_url: optimized }
    ]
  }
})

// 3. Request response
send({ type: 'response.create' })
```

## Best Practices

### 1. Always Use replaceTrack for Audio
```typescript
// ❌ NEVER do this after initial setup
pc.addTrack(audioTrack, stream)  // Breaks DataChannel!

// ✅ ALWAYS do this
const sender = pc.getSenders().find(s => s.track?.kind === 'audio')
await sender.replaceTrack(audioTrack)
```

### 2. Create Audio Transceiver Early
```typescript
// Do this BEFORE creating SDP offer
pc.addTransceiver('audio', { direction: 'sendrecv' })
const offer = await pc.createOffer()
```

### 3. Configure Session Immediately
```typescript
dataChannel.onopen = () => {
  // Send session config as first message
  send({
    type: 'session.update',
    session: { modalities: ['text', 'audio'], ... }
  })
}
```

### 4. Handle Remote Audio Properly
```typescript
pc.ontrack = (event) => {
  if (event.track.kind === 'audio') {
    const audio = new Audio()
    audio.autoplay = true
    audio.srcObject = event.streams[0]
    audio.play().catch(console.error)
  }
}
```

### 5. Clean Up Resources
```typescript
const cleanup = () => {
  // Stop local tracks
  localStream?.getTracks().forEach(track => track.stop())
  
  // Close DataChannel
  dataChannel?.close()
  
  // Close PeerConnection
  pc?.close()
  
  // Remove audio element
  audioElement.srcObject = null
}
```