/**
 * Capture a screenshot using getDisplayMedia API
 * Returns base64 data URL of the captured image
 */
export async function captureScreenshot(): Promise<string> {
  try {
    // Request screen/window capture
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });

    // Create video element to capture frame
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;

    return new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play();

        // Wait for first frame
        requestAnimationFrame(() => {
          try {
            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Failed to get canvas context');
            }

            // Draw video frame
            ctx.drawImage(video, 0, 0);

            // Stop stream
            stream.getTracks().forEach((track) => track.stop());
            video.remove();

            // Convert to data URL (PNG with 80% quality)
            const dataUrl = canvas.toDataURL('image/png', 0.8);
            resolve(dataUrl);
          } catch (error) {
            stream.getTracks().forEach((track) => track.stop());
            video.remove();
            reject(error);
          }
        });
      };

      video.onerror = (error) => {
        stream.getTracks().forEach((track) => track.stop());
        video.remove();
        reject(error);
      };
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Screen sharing permission denied');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No screen sharing available');
      }
    }
    throw new Error('Screen capture failed');
  }
}

/**
 * Optimize image size if it exceeds maxSize
 * Reduces quality or dimensions to fit within limit
 */
export async function optimizeImage(
  dataUrl: string,
  maxSize: number = 1.5 * 1024 * 1024 // 1.5MB default
): Promise<string> {
  const img = new Image();

  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Calculate dimensions to fit within size limit
      let { width, height } = img;
      let quality = 0.8;

      // Scale down if too large
      const maxDimension = 1280;
      if (width > maxDimension || height > maxDimension) {
        const scale = Math.min(maxDimension / width, maxDimension / height);
        width *= scale;
        height *= scale;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Try different quality levels to meet size constraint
      let result = canvas.toDataURL('image/jpeg', quality);

      while (result.length > maxSize && quality > 0.1) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }

      resolve(result);
    };

    img.src = dataUrl;
  });
}
