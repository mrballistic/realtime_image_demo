'use client';

import { Box, Container, Grid } from '@mui/material';
import { ImagePane } from '@/components/ImagePane';
import { ControlPane } from '@/components/ControlPane';
import { useState, useCallback, useRef } from 'react';

export default function Home() {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const controlPaneRef = useRef<{ captureAndSend: () => Promise<void> }>(null);

  // Called when ImagePane's image changes
  const handleImageChange = useCallback(async () => {
    if (isScreenSharing && controlPaneRef.current) {
      console.log('Image changed while screen sharing - waiting for render...');
      // Wait for the new image to fully render before capturing
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Auto-capturing screenshot...');
      await controlPaneRef.current.captureAndSend();
    }
  }, [isScreenSharing]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Container maxWidth={false} disableGutters sx={{ flex: 1, display: 'flex' }}>
        <Grid container sx={{ flex: 1 }} spacing={0}>
          {/* Left Pane - Image Display */}
          <Grid size={{ xs: 12, md: 8 }}>
            <ImagePane onImageChange={handleImageChange} />
          </Grid>

          {/* Right Pane - Controls */}
          <Grid size={{ xs: 12, md: 4 }}>
            <ControlPane 
              ref={controlPaneRef}
              isScreenSharing={isScreenSharing}
              onScreenShareToggle={setIsScreenSharing}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
