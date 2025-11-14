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

    // Cancel any pending response
    send({ type: 'response.cancel' });

    console.log('Microphone stopped');
  }, [pc, send]);

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

          // Create or reuse audio element
          if (!audioElementRef.current) {
            const audio = new Audio();
            audio.autoplay = true;
            audioElementRef.current = audio;
          }

          audioElementRef.current.srcObject = remoteStream;
          console.log('Remote audio track received');
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
              modalities: ['text', 'audio'],
              instructions:
                'You are a helpful AI assistant. Be concise and friendly. When shown an image, describe the key elements first.',
              voice: 'verse',
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
              },
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
            
            // Log errors with full details
            if (data.type === 'error') {
              console.error('OpenAI Realtime API Error:', data);
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
    isMicActive,
    cleanup,
  };
}
