'use client';

import {
  Box,
  Stack,
  Typography,
  IconButton,
  Chip,
  Paper,
  Alert,
  Snackbar,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import { useRealtime } from '@/hooks/useRealtime';
import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { captureScreenshot, optimizeImage } from '@/lib/screenshot';

interface Event {
  type: string;
  timestamp: number;
  data?: unknown;
}

interface ControlPaneProps {
  isScreenSharing: boolean;
  onScreenShareToggle: (value: boolean) => void;
}

export interface ControlPaneRef {
  captureAndSend: () => Promise<void>;
}

export const ControlPane = forwardRef<ControlPaneRef, ControlPaneProps>(
  ({ isScreenSharing, onScreenShareToggle }, ref) => {
  const {
    isConnected,
    connectionState,
    isMicActive,
    startMic,
    stopMic,
    enableAudio,
    cancelResponse,
    send,
    on,
    off,
  } = useRealtime();

  const [events, setEvents] = useState<Event[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Handle microphone toggle
  const handleMicToggle = async () => {
    if (isMicActive) {
      stopMic();
    } else {
      try {
        await startMic();
      } catch (error) {
        console.error('Microphone access failed:', error);
        setNotification('Microphone access denied');
      }
    }
  };

  // Capture screenshot from existing stream or create new one
  const captureFromStream = async (stream: MediaStream): Promise<string> => {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;

    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play();

        requestAnimationFrame(() => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Failed to get canvas context');
            }

            ctx.drawImage(video, 0, 0);
            video.remove();

            const dataUrl = canvas.toDataURL('image/png', 0.8);
            resolve(dataUrl);
          } catch (error) {
            video.remove();
            reject(error);
          }
        });
      };

      video.onerror = (error) => {
        video.remove();
        reject(error);
      };
    });
  };

  // Capture and send screenshot (exposed via ref and used internally)
  const captureAndSend = async (streamToUse?: MediaStream) => {
    if (!isConnected) {
      setNotification('Not connected to OpenAI');
      return;
    }

    setIsCapturing(true);

    try {
      // Enable audio playback (requires user interaction)
      try {
        await enableAudio();
      } catch (err) {
        console.warn('Could not enable audio playback yet:', err);
      }

      // Cancel any active response before sending new screenshot (only if there is one)
      cancelResponse();

      let screenshot: string;
      
      const stream = streamToUse || screenStream;
      
      if (stream) {
        // Reuse existing stream (no permission prompt)
        screenshot = await captureFromStream(stream);
      } else {
        // First time - request permission
        screenshot = await captureScreenshot();
      }
      
      // Optimize image size
      const optimizedImage = await optimizeImage(screenshot);

      // Send to OpenAI via conversation.item.create
      send({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Describe only the main image in this screenshot. Ignore any UI elements, buttons, or interface components. Focus solely on the photograph or visual content being displayed.',
            },
            {
              type: 'input_image',
              image_url: optimizedImage,
            },
          ],
        },
      });

      // Request response with audio
      send({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
        },
      });

      setNotification('Screenshot sent! AI is analyzing...');
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      setNotification(
        error instanceof Error ? error.message : 'Screenshot capture failed'
      );
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle screen share toggle
  const handleScreenShareToggle = async () => {
    if (isScreenSharing) {
      // Turn off screen sharing - stop the stream
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      onScreenShareToggle(false);
      setNotification('Screen sharing stopped');
    } else {
      // Turn on screen sharing - request permission and capture stream
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        
        setScreenStream(stream);
        
        // Take first screenshot - pass stream directly to avoid state delay
        await captureAndSend(stream);
        onScreenShareToggle(true);
        
        // Listen for when user stops sharing via browser UI
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          onScreenShareToggle(false);
          setNotification('Screen sharing stopped');
        };
      } catch (error) {
        console.error('Screen share failed:', error);
        setNotification('Screen sharing permission denied');
      }
    }
  };

  // Expose captureAndSend to parent via ref
  useImperativeHandle(ref, () => ({
    captureAndSend,
  }));

  // Listen to realtime events
  useEffect(() => {
    const logEvent = (data: { type: string; [key: string]: unknown }) => {
      console.log('Event logged to UI:', data.type, data);
      
      // Display errors prominently
      if (data.type === 'error' && data.error) {
        const errorObj = data.error as { message?: string; code?: string };
        const errorMsg = `API Error: ${errorObj.message || 'Unknown error'} (${errorObj.code || 'no code'})`;
        setLastError(errorMsg);
        setNotification(errorMsg);
      }
      
      // Display response failures
      if (data.type === 'response.done') {
        const response = data.response as { 
          status?: string; 
          status_details?: { 
            error?: { 
              type?: string; 
              message?: string; 
              code?: string 
            } 
          } 
        };
        
        if (response.status === 'failed' && response.status_details?.error) {
          const error = response.status_details.error;
          const errorMsg = `Response Failed: ${error.type || 'unknown'} - ${error.message || 'No message'}`;
          setLastError(errorMsg);
          setNotification(errorMsg);
          console.error('❌ RESPONSE FAILURE DETECTED:', {
            type: error.type,
            code: error.code,
            message: error.message,
            fullResponse: response
          });
        }
      }
      
      setEvents((prev) => [
        { type: data.type, timestamp: Date.now(), data },
        ...prev.slice(0, 49), // Keep last 50 events
      ]);
    };

    // Subscribe to key events
    const eventTypes = [
      'session.created',
      'session.updated',
      'conversation.item.created',
      'conversation.item.input_audio_transcription.completed',
      'input_audio_buffer.speech_started',
      'input_audio_buffer.speech_stopped',
      'input_audio_buffer.committed',
      'response.created',
      'response.output_item.added',
      'response.content_part.added',
      'response.audio_transcript.delta',
      'response.audio_transcript.done',
      'response.audio.delta',
      'response.audio.done',
      'response.text.delta',
      'response.done',
      'error',
    ];

    eventTypes.forEach((type) => on(type, logEvent));

    return () => {
      eventTypes.forEach((type) => off(type, logEvent));
    };
  }, [on, off]);

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Controls
      </Typography>

      {/* Connection Status */}
      <Box sx={{ mb: 2 }}>
        <Chip
          label={
            isConnected
              ? 'Connected'
              : connectionState === 'connecting'
                ? 'Connecting...'
                : 'Disconnected'
          }
          color={isConnected ? 'success' : 'default'}
          size="small"
        />
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
          {connectionState}
        </Typography>
      </Box>

      <Stack spacing={2} sx={{ mt: 2 }}>
        {/* Mic Button */}
        <Box>
          <IconButton
            size="large"
            color={isMicActive ? 'error' : 'primary'}
            onClick={handleMicToggle}
            disabled={!isConnected}
            sx={{
              width: 64,
              height: 64,
              bgcolor: isMicActive ? 'error.main' : 'primary.main',
              color: 'background.paper',
              '&:hover': {
                bgcolor: isMicActive ? 'error.dark' : 'primary.dark',
              },
              '&:disabled': {
                bgcolor: 'action.disabledBackground',
              },
              transition: 'all 0.2s ease',
            }}
          >
            {isMicActive ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            {isMicActive ? 'Mic Active (Click to stop)' : 'Mic Off (Click to start)'}
          </Typography>
        </Box>

        {/* Share Button */}
        <Box>
          <IconButton
            size="large"
            color={isScreenSharing ? 'error' : 'secondary'}
            onClick={handleScreenShareToggle}
            disabled={!isConnected || isCapturing}
            sx={{
              width: 64,
              height: 64,
              bgcolor: isScreenSharing ? 'error.main' : 'secondary.main',
              color: 'background.paper',
              '&:hover': {
                bgcolor: isScreenSharing ? 'error.dark' : 'secondary.dark',
              },
              '&:disabled': {
                bgcolor: 'action.disabledBackground',
              },
            }}
          >
            {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
          </IconButton>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            {isCapturing ? 'Capturing...' : isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          </Typography>
        </Box>
      </Stack>

      {/* Instructions */}
      {!isConnected && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Connecting to OpenAI...
        </Alert>
      )}

      {isConnected && !isMicActive && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Ready! Click mic button to start talking
        </Alert>
      )}

      {isConnected && isMicActive && (
        <Alert severity="error" sx={{ mt: 2 }}>
          🎤 Listening... Click mic button to stop
        </Alert>
      )}

      {lastError && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setLastError(null)}>
          {lastError}
        </Alert>
      )}

      {/* Events Log */}
      <Box sx={{ mt: 4, flex: 1, overflow: 'auto' }}>
        <Typography variant="subtitle2" gutterBottom>
          Events ({events.length})
        </Typography>

        <Stack spacing={1}>
          {events.map((event, index) => (
            <Paper
              key={`${event.type}-${event.timestamp}-${index}`}
              sx={{
                p: 1.5,
                bgcolor: 'background.paper',
                borderLeft: 3,
                borderColor: 'primary.main',
              }}
            >
              <Typography variant="caption" component="div" fontWeight="bold">
                {event.type}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(event.timestamp).toLocaleTimeString()}
              </Typography>
            </Paper>
          ))}

          {events.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No events yet...
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Notification Snackbar */}
      <Snackbar
        open={!!notification}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        message={notification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
});

ControlPane.displayName = 'ControlPane';
