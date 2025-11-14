# OpenAI Realtime API Reference

## Connection Methods

### WebRTC (Preferred)
```typescript
// 1. Create SDP offer
const pc = new RTCPeerConnection()
const offer = await pc.createOffer()
await pc.setLocalDescription(offer)

// 2. Exchange with OpenAI
const response = await fetch('/api/realtime/session', {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: offer.sdp
})
const answerSDP = await response.text()
await pc.setRemoteDescription({ type: 'answer', sdp: answerSDP })

// 3. Create DataChannel for events
const dataChannel = pc.createDataChannel('oai-events')
```

### Client Secret (Alternative)
```typescript
// Get ephemeral token
const response = await fetch('/api/realtime/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ method: 'client_secret' })
})
const { client_secret } = await response.json()

// Connect with secret (production model)
const ws = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-realtime')
```

## Event Types

### Session Management
```typescript
// Configure session
{
  type: "session.update",
  session: {
    type: "realtime",
    instructions: "Be concise. If the user sends an image, describe key elements first.",
    output_modalities: ["text", "audio"],
    audio: {
      input: { turn_detection: { type: "semantic_vad" } },
      output: { voice: "verse" }
    }
  }
}

// Session ready
{ type: "session.created" }
```

### Conversation Management
```typescript
// Add user message with image
{
  type: "conversation.item.create",
  item: {
    type: "message",
    role: "user",
    content: [
      { type: "input_text", text: "What do you see in this screenshot?" },
      { type: "input_image", image_url: "data:image/png;base64,<<BASE64>>" }
    ]
  }
}

// Request response
{
  type: "response.create",
  response: { output_modalities: ["text"] }
}

// Cancel response
{ type: "response.cancel" }
```

### Response Handling
```typescript
// Response events
{ type: "response.created" }
{ type: "response.content_part.added" }
{
  type: "response.output_text.delta",
  delta: "I can see a screenshot showing..."
}
{ type: "response.output_text.done" }
{ type: "response.done" }

// Conversation events
{ type: "conversation.item.added" }
{ type: "conversation.item.done" }
```

### Audio Handling (WebSocket only)
```typescript
// Append audio buffer
{
  type: "input_audio_buffer.append",
  audio: "<<BASE64_PCM>>"
}

// Commit buffer
{ type: "input_audio_buffer.commit" }

// Audio events
{ type: "input_audio_buffer.speech_started" }
{ type: "input_audio_buffer.speech_stopped" }
{ type: "input_audio_buffer.committed" }

// Audio output
{
  type: "response.output_audio.delta",
  audio: "<<BASE64_PCM>>"
}
```

## WebRTC Implementation Patterns

### Hook Structure
```typescript
interface UseRealtimeResult {
  isConnected: boolean
  send: (event: any) => void
  on: (type: string, handler: (data: any) => void) => void
  off: (type: string, handler: (data: any) => void) => void
  startMic: () => Promise<void>
  stopMic: () => void
}

function useRealtime(): UseRealtimeResult {
  const [pc, setPc] = useState<RTCPeerConnection | null>(null)
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  
  // Implementation...
}
```

### DataChannel Events
```typescript
dataChannel.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data)
    eventEmitter.emit(data.type, data)
  } catch (error) {
    console.error('Failed to parse DataChannel message:', error)
  }
}

dataChannel.onopen = () => {
  setIsConnected(true)
}

dataChannel.onclose = () => {
  setIsConnected(false)
}
```

### Audio Track Management
```typescript
const startMic = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const track = stream.getAudioTracks()[0]
  
  pc.addTrack(track, stream)
  
  // Optional: add level meter
  const audioContext = new AudioContext()
  const analyser = audioContext.createAnalyser()
  const source = audioContext.createMediaStreamSource(stream)
  source.connect(analyser)
}

const stopMic = () => {
  const senders = pc.getSenders()
  senders.forEach(sender => {
    if (sender.track && sender.track.kind === 'audio') {
      pc.removeTrack(sender)
      sender.track.stop()
    }
  })
  
  // Cancel any pending response
  send({ type: 'response.cancel' })
}
```

## Error Handling Patterns

### Connection Errors
```typescript
pc.onconnectionstatechange = () => {
  if (pc.connectionState === 'failed') {
    console.error('WebRTC connection failed')
    // Retry logic here
  }
}

pc.onicegatheringstatechange = () => {
  if (pc.iceGatheringState === 'complete') {
    // Connection ready
  }
}
```

### DataChannel Errors
```typescript
dataChannel.onerror = (error) => {
  console.error('DataChannel error:', error)
  // Fallback to WebSocket or retry
}

// Send with error handling
const send = (event: any) => {
  if (dataChannel?.readyState === 'open') {
    try {
      dataChannel.send(JSON.stringify(event))
    } catch (error) {
      console.error('Failed to send message:', error)
      // Queue for retry or show user error
    }
  } else {
    console.warn('DataChannel not ready, queueing message')
    // Queue message for when channel is ready
  }
}
```

### Permission Handling
```typescript
const requestMicPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(track => track.stop()) // Clean up test stream
    return true
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      showError('Microphone permission denied')
    } else if (error.name === 'NotFoundError') {
      showError('No microphone found')
    } else {
      showError('Microphone access failed')
    }
    return false
  }
}
```

## Server-Side Integration

### SDP Exchange Endpoint
```typescript
// app/api/realtime/session/route.ts
export async function POST(request: Request) {
  const offer = await request.text()
  
  const response = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/sdp'
    },
    body: offer
  })
  
  const answer = await response.text()
  return new Response(answer, {
    headers: { 'Content-Type': 'application/sdp' }
  })
}
```

### Client Secret Endpoint (Alternative)
```typescript
export async function POST(request: Request) {
  const { method } = await request.json()
  
  if (method === 'client_secret') {
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-realtime',
        ttl: 600 // 10 minutes
      })
    })
    
    return Response.json(await response.json())
  }
}
```

## Image Processing Patterns

### Screenshot Capture
```typescript
const captureScreenshot = async (): Promise<string> => {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
  const video = document.createElement('video')
  video.srcObject = stream
  await video.play()
  
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video, 0, 0)
  
  stream.getTracks().forEach(track => track.stop())
  
  return canvas.toDataURL('image/png')
}
```

### Image Size Limits
```typescript
const resizeImage = (dataUrl: string, maxWidth: number = 1280): string => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png', 0.8))
    }
    img.src = dataUrl
  })
}
```

## Performance Considerations

### Memory Management
```typescript
// Clean up resources
const cleanup = () => {
  if (pc) {
    pc.close()
    setPc(null)
  }
  
  if (dataChannel) {
    dataChannel.close()
    setDataChannel(null)
  }
  
  // Stop all tracks
  localStream?.getTracks().forEach(track => track.stop())
}

// Use effect cleanup
useEffect(() => {
  return cleanup
}, [])
```

### Event Listener Management
```typescript
const eventHandlers = new Map<string, Set<(data: any) => void>>()

const on = (type: string, handler: (data: any) => void) => {
  if (!eventHandlers.has(type)) {
    eventHandlers.set(type, new Set())
  }
  eventHandlers.get(type)!.add(handler)
}

const off = (type: string, handler: (data: any) => void) => {
  const handlers = eventHandlers.get(type)
  if (handlers) {
    handlers.delete(handler)
    if (handlers.size === 0) {
      eventHandlers.delete(type)
    }
  }
}

const emit = (type: string, data: any) => {
  const handlers = eventHandlers.get(type)
  if (handlers) {
    handlers.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error(`Error in event handler for ${type}:`, error)
      }
    })
  }
}
```