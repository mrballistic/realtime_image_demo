'use client';

import { Box, Typography, Link, CircularProgress, Alert, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface UnsplashPhoto {
  url: string;
  photographer: string;
  photographerUrl: string;
  photoUrl: string;
  description: string;
}

export function ImagePane() {
  const [photo, setPhoto] = useState<UnsplashPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhoto = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const response = await fetch(`/api/unsplash?t=${timestamp}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch photo');
      }

      const data = await response.json();
      setPhoto(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load photo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhoto();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          p: 3,
        }}
      >
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!photo) {
    return null;
  }

  return (
    <Box
      sx={{
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      {/* Refresh Button */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
        }}
      >
        <Tooltip title="Change image">
          <IconButton
            onClick={fetchPhoto}
            disabled={loading}
            sx={{
              bgcolor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.8)',
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(0, 0, 0, 0.3)',
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Image */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        <Image
          src={photo.url}
          alt={photo.description}
          fill
          style={{ objectFit: 'cover' }}
          priority
        />
      </Box>

      {/* Credit Overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
          p: 2,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'white',
            display: 'block',
          }}
        >
          Photo by{' '}
          <Link
            href={photo.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: 'white',
              textDecoration: 'underline',
              '&:hover': {
                opacity: 0.8,
              },
            }}
          >
            {photo.photographer}
          </Link>
          {' '}on{' '}
          <Link
            href="https://unsplash.com"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: 'white',
              textDecoration: 'underline',
              '&:hover': {
                opacity: 0.8,
              },
            }}
          >
            Unsplash
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
