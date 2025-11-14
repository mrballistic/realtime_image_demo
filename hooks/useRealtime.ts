'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// Event type definitions
interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}

type EventHandler = (data: RealtimeEvent) => void;

interface UseRealtimeResult {
  isConnected: boolean;
  connectionState: RTCPeerConnectionState;
  send: (event: RealtimeEvent) => void;
  on: (type: string, handler: EventHandler) => void;
  off: (type: string, handler: EventHandler) => void;
  startMic: () => Promise<void>;
  stopMic: () => void;
  enableAudio: () => Promise<void>;
  isMicActive: boolean;
  cleanup: () => void;
}

export function useRealtime(): UseRealtimeResult {
  const [pc, setPc] = useState<RTCPeerConnection | null>(null);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState>('new');
  const [isMicActive, setIsMicActive] = useState(false);

  const eventHandlers = useRef<Map<string, Set<EventHandler>>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const activeResponseRef = useRef<string | null>(null); // Track active response ID

  // Event emitter functions
  const on = useCallback((type: string, handler: EventHandler) => {
    if (!eventHandlers.current.has(type)) {
      eventHandlers.current.set(type, new Set());
    }
    eventHandlers.current.get(type)!.add(handler);
  }, []);

  const off = useCallback((type: string, handler: EventHandler) => {
    const handlers = eventHandlers.current.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventHandlers.current.delete(type);
      }
    }
  }, []);

  const emit = useCallback((type: string, data: RealtimeEvent) => {
    const handlers = eventHandlers.current.get(type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${type}:`, error);
        }
      });
    }
  }, []);

  // Play queued audio chunks
  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    const audioContext = audioContextRef.current!;

    while (audioQueueRef.current.length > 0) {
      const pcm16 = audioQueueRef.current.shift()!;

      // Convert PCM16 to Float32 for Web Audio API
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0; // Normalize to [-1, 1]
      }

      // Create audio buffer (24kHz sample rate for Realtime API)
      const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      // Play the buffer
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    }

    isPlayingRef.current = false;
  }, []);

  // Audio playback function
  const playAudioDelta = useCallback((base64Audio: string) => {
    try {
      // Initialize AudioContext if needed
      if (!audioContextRef.current) {
        // @ts-expect-error - webkitAudioContext for Safari compatibility
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        console.log('🎵 AudioContext initialized');
      }

      // Decode base64 to binary
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert to Int16Array (PCM16)
      const pcm16 = new Int16Array(bytes.buffer);
      audioQueueRef.current.push(pcm16);

      // Start playback if not already playing
      if (!isPlayingRef.current) {
        playAudioQueue();
      }
    } catch (error) {
      console.error('Failed to decode audio delta:', error);
    }
  }, [playAudioQueue]);

  // Send event through DataChannel
  const send = useCallback(
    (event: RealtimeEvent) => {
      if (dataChannel?.readyState === 'open') {
        try {
          dataChannel.send(JSON.stringify(event));
        } catch (error) {
          console.error('Failed to send event:', error);
        }
      } else {
        console.warn('DataChannel not ready, cannot send event:', event.type);
      }
    },
    [dataChannel]
  );

  // Microphone control
  const startMic = useCallback(async () => {
    if (!pc) {
      console.error('PeerConnection not initialized');
      return;
    }

    try {
      console.log('Requesting microphone access...');
      
      // Enable audio playback NOW (user interaction required for autoplay)
      if (audioElementRef.current) {
        try {
          await audioElementRef.current.play();
          console.log('✅ Audio playback enabled via user interaction');
        } catch (err) {
          console.warn('Could not enable audio playback yet:', err);
        }
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioTrack = stream.getAudioTracks()[0];
      console.log('Audio track obtained:', audioTrack.label);
      
      // Always use replaceTrack since we created a transceiver during setup
      const audioSender = pc.getSenders().find(s => s.track === null || s.track.kind === 'audio');
      
      if (audioSender) {
        console.log('Replacing audio track (no renegotiation)');
        await audioSender.replaceTrack(audioTrack);
      } else {
        console.error('No audio sender found! This should not happen.');
        return;
      }

      localStreamRef.current = stream;
      setIsMicActive(true);

      console.log('Microphone started - DataChannel should stay open');
    } catch (error) {
      console.error('Failed to start microphone:', error);
      throw error;
    }
  }, [pc]);

  const stopMic = useCallback(() => {
    console.log('Stopping microphone...');
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        console.log('Stopping track:', track.label);
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Replace track with null instead of removing
    if (pc) {
      const audioSender = pc.getSenders().find(s => s.track?.kind === 'audio');
      if (audioSender) {
        console.log('Replacing audio track with null');
        audioSender.replaceTrack(null).catch(err => 
          console.error('Failed to replace track:', err)
        );
      }
    }

    setIsMicActive(false);

    // Only cancel if there's an active response
    if (activeResponseRef.current) {
      console.log('Cancelling active response:', activeResponseRef.current);
      send({ type: 'response.cancel' });
    } else {
      console.log('No active response to cancel');
    }

    console.log('Microphone stopped');
  }, [pc, send]);

  // Enable audio playback (requires user interaction)
  const enableAudio = useCallback(async () => {
    if (audioElementRef.current) {
      try {
        await audioElementRef.current.play();
        console.log('✅ Audio playback enabled');
      } catch (err) {
        console.warn('Could not enable audio playback:', err);
        throw err;
      }
    }
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop microphone
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close data channel
    if (dataChannel?.readyState === 'open') {
      dataChannel.close();
    }

    // Close peer connection
    if (pc?.connectionState !== 'closed') {
      pc?.close();
    }

    // Clear event handlers
    eventHandlers.current.clear();

    // Remove audio element
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current = null;
    }

    setIsConnected(false);
    setIsMicActive(false);
    setConnectionState('closed');

    console.log('WebRTC resources cleaned up');
  }, [dataChannel, pc]);

  // Initialize WebRTC connection
  useEffect(() => {
    const initConnection = async () => {
      try {
        // Create peer connection
        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        // Monitor connection state
        peerConnection.onconnectionstatechange = () => {
          setConnectionState(peerConnection.connectionState);

          if (peerConnection.connectionState === 'connected') {
            console.log('WebRTC connection established');
          } else if (peerConnection.connectionState === 'failed') {
            console.error('WebRTC connection failed');
          }
        };

        // Handle incoming audio track
        peerConnection.ontrack = (event) => {
          const [remoteStream] = event.streams;
          console.log('Remote track received:', event.track.kind, remoteStream);

          // Create or reuse audio element
          if (!audioElementRef.current) {
            const audio = new Audio();
            audio.autoplay = false; // Don't autoplay - requires user interaction
            audio.volume = 1.0;
            audioElementRef.current = audio;
            console.log('Audio element created (autoplay disabled until user interaction)');
            
            // Add to DOM to ensure playback (some browsers require this)
            document.body.appendChild(audio);
            audio.style.display = 'none';
          }

          audioElementRef.current.srcObject = remoteStream;
          console.log('Remote audio stream connected to audio element (ready to play after user interaction)');
          
          // Log audio element state
          audioElementRef.current.onplay = () => console.log('🔊 Audio element PLAYING');
          audioElementRef.current.onpause = () => console.log('⏸️ Audio element PAUSED');
          audioElementRef.current.onerror = (e) => console.error('❌ Audio element error:', e);
          audioElementRef.current.onended = () => console.log('🏁 Audio element ENDED');
        };

        // Add a transceiver for audio (required by OpenAI)
        // This creates a placeholder that we'll use later with replaceTrack
        const audioTransceiver = peerConnection.addTransceiver('audio', {
          direction: 'sendrecv',
        });
        console.log('Audio transceiver added:', audioTransceiver);

        // Create data channel for JSON events
        const channel = peerConnection.createDataChannel('oai-events', {
          ordered: true,
        });

        channel.onopen = () => {
          console.log('DataChannel opened');
          setIsConnected(true);

          // Configure session on connection
          const sessionConfig = {
            type: 'session.update',
            session: {
              modalities: ['audio', 'text'], // Order matters: audio first for voice responses
              instructions:
                'You are a helpful AI assistant. Be concise and friendly. When shown an image, describe the key elements first.',
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1',
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
                create_response: true,
              },
              temperature: 0.8,
            },
          };

          console.log('Sending session config:', sessionConfig);
          channel.send(JSON.stringify(sessionConfig));
        };

        channel.onclose = () => {
          console.log('DataChannel closed');
          setIsConnected(false);
        };

        channel.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as RealtimeEvent;
            console.log('Received event:', data.type, data);
            
            // Log ALL events to find missing audio data
            if (data.type.includes('audio')) {
              console.log('🎵 AUDIO EVENT:', data.type, JSON.stringify(data, null, 2));
            }
            
            // Clear audio queue when output is cleared or response cancelled
            if (data.type === 'output_audio_buffer.cleared' || data.type === 'response.cancelled') {
              console.log('🗑️ Clearing audio queue');
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              activeResponseRef.current = null; // Clear active response on cancel
            }
            
            // Log errors with full details
            if (data.type === 'error') {
              console.error('OpenAI Realtime API Error:', data);
            }
            
            // Log response lifecycle events
            if (data.type === 'response.created') {
              console.log('🎬 RESPONSE CREATED:', JSON.stringify(data, null, 2));
              // Track active response
              const responseId = (data as { response?: { id?: string } }).response?.id;
              if (responseId) {
                activeResponseRef.current = responseId;
              }
            }
            
            if (data.type === 'response.output_item.added') {
              console.log('➕ OUTPUT ITEM ADDED:', JSON.stringify(data, null, 2));
            }
            
            if (data.type === 'response.content_part.added') {
              console.log('📝 CONTENT PART ADDED:', JSON.stringify(data, null, 2));
            }
            
            if (data.type === 'response.audio.delta') {
              const delta = (data as Record<string, unknown>).delta as string;
              console.log('🔊 AUDIO DELTA received, length:', delta?.length || 0);
              
              // Play the audio delta
              if (delta) {
                playAudioDelta(delta);
              }
            }
            
            // Also handle buffered audio from output_audio_buffer
            if (data.type === 'output_audio_buffer.audio_added') {
              const delta = (data as Record<string, unknown>).audio as string;
              console.log('🔊 OUTPUT AUDIO BUFFER received, length:', delta?.length || 0);
              
              // Play the buffered audio
              if (delta) {
                playAudioDelta(delta);
              }
            }
            
            if (data.type === 'response.text.delta') {
              console.log('📄 TEXT DELTA:', (data as Record<string, unknown>).delta);
            }
            
            // Log response.done with full details to debug audio output
            if (data.type === 'response.done') {
              console.log('✅ RESPONSE DONE DETAILS:', JSON.stringify(data, null, 2));
              
              // Clear active response
              activeResponseRef.current = null;
              
              const resp = (data as Record<string, unknown>).response as Record<string, unknown>;
              if (resp.status === 'failed') {
                const statusDetails = resp.status_details as Record<string, unknown>;
                console.error('❌ RESPONSE FAILED:', statusDetails?.error);
              } else {
                const output = resp.output as unknown[];
                console.log('Response output items:', output?.length || 0);
                console.log('Response modalities:', resp.modalities);
              }
            }
            
            // Log session.updated to see actual config
            if (data.type === 'session.updated') {
              console.log('⚙️ SESSION CONFIG:', JSON.stringify(data, null, 2));
            }
            
            // Log conversation item creation
            if (data.type === 'conversation.item.created') {
              const item = (data as Record<string, unknown>).item as Record<string, unknown>;
              const content = item.content as Array<Record<string, unknown>>;
              console.log('💬 CONVERSATION ITEM CREATED:', {
                id: item.id,
                type: item.type,
                role: item.role,
                status: item.status,
                content: content?.map((c) => ({
                  type: c.type,
                  hasTranscript: !!c.transcript,
                  hasAudio: !!c.audio,
                  hasText: !!c.text
                }))
              });
            }
            
            emit(data.type, data);
          } catch (error) {
            console.error('Failed to parse DataChannel message:', error);
          }
        };

        channel.onerror = (error) => {
          console.error('DataChannel error:', error);
        };

        // Create SDP offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Exchange SDP with OpenAI via our server
        const response = await fetch('/api/realtime/session', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: offer.sdp,
        });

        if (!response.ok) {
          throw new Error(`Session creation failed: ${response.status}`);
        }

        const answerSDP = await response.text();
        await peerConnection.setRemoteDescription({
          type: 'answer',
          sdp: answerSDP,
        });

        setPc(peerConnection);
        setDataChannel(channel);

        console.log('WebRTC connection initialized');
      } catch (error) {
        console.error('Failed to initialize WebRTC:', error);
      }
    };

    initConnection();

    // Cleanup on unmount
    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isConnected,
    connectionState,
    send,
    on,
    off,
    startMic,
    stopMic,
    enableAudio,
    isMicActive,
    cleanup,
  };
}
