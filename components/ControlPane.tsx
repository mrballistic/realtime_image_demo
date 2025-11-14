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
import { useRealtime } from '@/hooks/useRealtime';
import { useEffect, useState } from 'react';
import { captureScreenshot, optimizeImage } from '@/lib/screenshot';

interface Event {
  type: string;
  timestamp: number;
  data?: unknown;
}

export function ControlPane() {
  const {
    isConnected,
    connectionState,
    isMicActive,
    startMic,
    stopMic,
    send,
    on,
    off,
  } = useRealtime();

  const [events, setEvents] = useState<Event[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

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

  // Handle screen share
  const handleScreenShare = async () => {
    if (!isConnected) {
      setNotification('Not connected to OpenAI');
      return;
    }

    setIsCapturing(true);

    try {
      // Capture screenshot
      const screenshot = await captureScreenshot();
      
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
              text: 'What do you see in this screenshot?',
            },
            {
              type: 'input_image',
              image_url: optimizedImage,
            },
          ],
        },
      });

      // Request response
      send({
        type: 'response.create',
        response: {
          output_modalities: ['text', 'audio'],
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
      'response.audio.delta',
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
            color="secondary"
            onClick={handleScreenShare}
            disabled={!isConnected || isCapturing}
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'secondary.main',
              color: 'background.paper',
              '&:hover': {
                bgcolor: 'secondary.dark',
              },
              '&:disabled': {
                bgcolor: 'action.disabledBackground',
              },
            }}
          >
            <ScreenShareIcon />
          </IconButton>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            {isCapturing ? 'Capturing...' : 'Share Screen'}
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
}
