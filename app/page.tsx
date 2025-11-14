'use client';

import { Box, Container, Grid } from '@mui/material';
import { ImagePane } from '@/components/ImagePane';
import { ControlPane } from '@/components/ControlPane';

export default function Home() {
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
            <ImagePane />
          </Grid>

          {/* Right Pane - Controls */}
          <Grid size={{ xs: 12, md: 4 }}>
            <ControlPane />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
