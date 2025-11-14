# WebRTC Implementation Patterns

## Core WebRTC Setup

### RTCPeerConnection Configuration
```typescript
const pcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
}

const pc = new RTCPeerConnection(pcConfig)
```

### DataChannel Creation
```typescript
// Create ordered, reliable channel for JSON events
const dataChannel = pc.createDataChannel('oai-events', {
  ordered: true,
  maxRetransmits: 3,
  id: 0
})

// Handle incoming channels
pc.ondatachannel = (event) => {
  const channel = event.channel
  channel.onmessage = handleMessage
  channel.onopen = () => console.log('DataChannel opened')
  channel.onclose = () => console.log('DataChannel closed')
}
```

### SDP Exchange Pattern
```typescript
// Create and send offer
const offer = await pc.createOffer({
  offerToReceiveAudio: true,
  offerToReceiveVideo: false
})
await pc.setLocalDescription(offer)

// Send to server for OpenAI exchange
const response = await fetch('/api/realtime/session', {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },
  body: offer.sdp
})

// Set answer from OpenAI
const answerSDP = await response.text()
await pc.setRemoteDescription({
  type: 'answer',
  sdp: answerSDP
})
```

## Audio Handling

### Input Audio (Microphone)
```typescript
const startMicrophone = async (): Promise<MediaStreamTrack> => {
  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000,
      channelCount: 1
    }
  }
  
  const stream = await navigator.mediaDevices.getUserMedia(constraints)
  const audioTrack = stream.getAudioTracks()[0]
  
  // Add to peer connection
  pc.addTrack(audioTrack, stream)
  
  return audioTrack
}

const stopMicrophone = (track: MediaStreamTrack) => {
  track.stop()
  
  // Remove from peer connection
  const sender = pc.getSenders().find(s => s.track === track)
  if (sender) {
    pc.removeTrack(sender)
  }
}
```

### Output Audio (Remote Stream)
```typescript
// Handle incoming audio
pc.ontrack = (event) => {
  const [remoteStream] = event.streams
  const audioElement = document.getElementById('audio-output') as HTMLAudioElement
  
  if (audioElement) {
    audioElement.srcObject = remoteStream
    audioElement.autoplay = true
  }
}

// Audio element setup
<audio
  id="audio-output"
  autoPlay
  playsInline
  style={{ display: 'none' }}
/>
```

### Audio Level Monitoring
```typescript
const createLevelMeter = (stream: MediaStream): AudioAnalyser => {
  const audioContext = new AudioContext()
  const analyser = audioContext.createAnalyser()
  const microphone = audioContext.createMediaStreamSource(stream)
  
  analyser.fftSize = 256
  analyser.smoothingTimeConstant = 0.8
  microphone.connect(analyser)
  
  const dataArray = new Uint8Array(analyser.frequencyBinCount)
  
  const getLevel = (): number => {
    analyser.getByteFrequencyData(dataArray)
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
    return average / 255 // Normalize to 0-1
  }
  
  return { getLevel, destroy: () => audioContext.close() }
}

// Usage in component
const [audioLevel, setAudioLevel] = useState(0)

useEffect(() => {
  if (!stream) return
  
  const levelMeter = createLevelMeter(stream)
  
  const updateLevel = () => {
    setAudioLevel(levelMeter.getLevel())
    requestAnimationFrame(updateLevel)
  }
  updateLevel()
  
  return () => levelMeter.destroy()
}, [stream])
```

## Connection State Management

### Connection State Monitoring
```typescript
const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new')
const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>('new')

pc.onconnectionstatechange = () => {
  setConnectionState(pc.connectionState)
  
  switch (pc.connectionState) {
    case 'connected':
      console.log('WebRTC connection established')
      break
    case 'failed':
    case 'disconnected':
      console.warn('WebRTC connection lost')
      // Implement reconnection logic
      break
  }
}

pc.oniceconnectionstatechange = () => {
  setIceConnectionState(pc.iceConnectionState)
}

pc.onicegatheringstatechange = () => {
  if (pc.iceGatheringState === 'complete') {
    console.log('ICE gathering complete')
  }
}
```

### Reconnection Strategy
```typescript
const reconnect = async (maxRetries: number = 3): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Reconnection attempt ${attempt}/${maxRetries}`)
      
      // Close existing connection
      pc.close()
      
      // Create new connection
      const newPc = new RTCPeerConnection(pcConfig)
      
      // Re-setup event handlers and restart session
      await setupConnection(newPc)
      
      return true
    } catch (error) {
      console.error(`Reconnection attempt ${attempt} failed:`, error)
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
      }
    }
  }
  
  return false
}
```

## Error Handling Patterns

### Permission Handling
```typescript
const checkPermissions = async (): Promise<PermissionStatus> => {
  try {
    const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return micPermission.state
  } catch (error) {
    // Fallback: try to access and see what happens
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      return 'granted'
    } catch (accessError) {
      return 'denied'
    }
  }
}

const requestMicrophoneAccess = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(track => track.stop()) // Clean up test stream
    return true
  } catch (error) {
    console.error('Microphone access denied:', error)
    return false
  }
}
```

### DataChannel Error Recovery
```typescript
const setupDataChannelWithRetry = (): Promise<RTCDataChannel> => {
  return new Promise((resolve, reject) => {
    const channel = pc.createDataChannel('oai-events', {
      ordered: true,
      maxRetransmits: 3
    })
    
    let timeoutId: NodeJS.Timeout
    
    channel.onopen = () => {
      clearTimeout(timeoutId)
      resolve(channel)
    }
    
    channel.onerror = (error) => {
      clearTimeout(timeoutId)
      reject(new Error(`DataChannel error: ${error}`))
    }
    
    // Timeout after 10 seconds
    timeoutId = setTimeout(() => {
      reject(new Error('DataChannel connection timeout'))
    }, 10000)
  })
}
```

## Screen Capture Integration

### Display Media Capture
```typescript
const captureScreen = async (): Promise<string> => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        mediaSource: 'screen',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    })
    
    // Create video element to capture frame
    const video = document.createElement('video')
    video.srcObject = stream
    video.muted = true
    
    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play()
        
        // Capture single frame
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0)
        
        // Clean up
        stream.getTracks().forEach(track => track.stop())
        video.remove()
        
        // Return as data URL
        const dataUrl = canvas.toDataURL('image/png', 0.8)
        resolve(dataUrl)
      }
      
      video.onerror = reject
    })
  } catch (error) {
    if (error.name === 'NotAllowedError') {
      throw new Error('Screen sharing permission denied')
    } else if (error.name === 'NotFoundError') {
      throw new Error('No screen sharing available')
    } else {
      throw new Error('Screen capture failed')
    }
  }
}
```

### Image Processing and Optimization
```typescript
const optimizeImage = async (dataUrl: string, maxSize: number = 1.5 * 1024 * 1024): Promise<string> => {
  const img = new Image()
  
  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      
      // Calculate dimensions to fit within size limit
      let { width, height } = img
      let quality = 0.8
      
      // Scale down if too large
      const maxDimension = 1280
      if (width > maxDimension || height > maxDimension) {
        const scale = Math.min(maxDimension / width, maxDimension / height)
        width *= scale
        height *= scale
      }
      
      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)
      
      // Try different quality levels to meet size constraint
      let result = canvas.toDataURL('image/jpeg', quality)
      
      while (result.length > maxSize && quality > 0.1) {
        quality -= 0.1
        result = canvas.toDataURL('image/jpeg', quality)
      }
      
      resolve(result)
    }
    
    img.src = dataUrl
  })
}
```

## Performance Optimization

### Resource Management
```typescript
class WebRTCManager {
  private pc: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private localStream: MediaStream | null = null
  private levelMeter: AudioAnalyser | null = null
  
  async initialize(): Promise<void> {
    this.pc = new RTCPeerConnection(pcConfig)
    this.setupEventHandlers()
  }
  
  async cleanup(): Promise<void> {
    // Stop local streams
    this.localStream?.getTracks().forEach(track => track.stop())
    this.localStream = null
    
    // Clean up audio analysis
    this.levelMeter?.destroy()
    this.levelMeter = null
    
    // Close data channel
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.close()
    }
    this.dataChannel = null
    
    // Close peer connection
    if (this.pc?.connectionState !== 'closed') {
      this.pc?.close()
    }
    this.pc = null
  }
}
```

### Memory Leak Prevention
```typescript
useEffect(() => {
  const webrtc = new WebRTCManager()
  
  // Initialize connection
  webrtc.initialize().catch(console.error)
  
  // Cleanup on unmount
  return () => {
    webrtc.cleanup().catch(console.error)
  }
}, [])

// Prevent memory leaks in event handlers
useEffect(() => {
  const handlers = new Map<string, Set<Function>>()
  
  const addEventListener = (type: string, handler: Function) => {
    if (!handlers.has(type)) {
      handlers.set(type, new Set())
    }
    handlers.get(type)!.add(handler)
  }
  
  return () => {
    // Remove all event listeners
    handlers.forEach((handlerSet, type) => {
      handlerSet.clear()
    })
    handlers.clear()
  }
}, [])
```

### Efficient Event Processing
```typescript
// Debounce frequent events
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => clearTimeout(handler)
  }, [value, delay])
  
  return debouncedValue
}

// Usage for audio level updates
const debouncedLevel = useDebounce(audioLevel, 50) // Update UI every 50ms max
```

## Browser Compatibility

### Feature Detection
```typescript
const checkWebRTCSupport = (): boolean => {
  return !!(
    window.RTCPeerConnection &&
    navigator.mediaDevices?.getUserMedia &&
    navigator.mediaDevices?.getDisplayMedia
  )
}

const checkAudioSupport = (): boolean => {
  return !!(
    window.AudioContext || 
    (window as any).webkitAudioContext
  )
}

// Polyfill for older browsers
if (!navigator.mediaDevices) {
  navigator.mediaDevices = {} as MediaDevices
}

if (!navigator.mediaDevices.getUserMedia) {
  navigator.mediaDevices.getUserMedia = (constraints: MediaStreamConstraints) => {
    const getUserMedia = 
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia
    
    if (!getUserMedia) {
      return Promise.reject(new Error('getUserMedia not supported'))
    }
    
    return new Promise((resolve, reject) => {
      getUserMedia.call(navigator, constraints, resolve, reject)
    })
  }
}
```

### Cross-Browser Testing Utilities
```typescript
const getBrowserInfo = (): string => {
  const userAgent = navigator.userAgent
  
  if (userAgent.includes('Chrome')) return 'chrome'
  if (userAgent.includes('Firefox')) return 'firefox'
  if (userAgent.includes('Safari')) return 'safari'
  if (userAgent.includes('Edge')) return 'edge'
  
  return 'unknown'
}

const logBrowserCapabilities = (): void => {
  console.log('Browser capabilities:', {
    browser: getBrowserInfo(),
    webrtc: checkWebRTCSupport(),
    audio: checkAudioSupport(),
    mediaDevices: !!navigator.mediaDevices,
    getUserMedia: !!navigator.mediaDevices?.getUserMedia,
    getDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia
  })
}