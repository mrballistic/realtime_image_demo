'use client';

import { Box, Stack, Typography, IconButton } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';

export function ControlPane() {
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

      <Stack spacing={2} sx={{ mt: 2 }}>
        {/* Mic Button */}
        <Box>
          <IconButton
            size="large"
            color="primary"
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'primary.main',
              color: 'background.paper',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            <MicIcon />
          </IconButton>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Mic (Space)
          </Typography>
        </Box>

        {/* Share Button */}
        <Box>
          <IconButton
            size="large"
            color="secondary"
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'secondary.main',
              color: 'background.paper',
              '&:hover': {
                bgcolor: 'secondary.dark',
              },
            }}
          >
            <ScreenShareIcon />
          </IconButton>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Share Screen
          </Typography>
        </Box>
      </Stack>

      {/* Events Log */}
      <Box sx={{ mt: 4, flex: 1, overflow: 'auto' }}>
        <Typography variant="subtitle2" gutterBottom>
          Events
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No events yet...
        </Typography>
      </Box>
    </Box>
  );
}
