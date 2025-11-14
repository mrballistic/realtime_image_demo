import { NextResponse } from 'next/server';

export async function GET() {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  // If no API key, use Unsplash Source (no auth required)
  if (!accessKey) {
    console.log('No Unsplash API key, using Unsplash Source');
    
    const width = 1920;
    const height = 1080;
    const randomSeed = Math.floor(Math.random() * 10000);
    
    return NextResponse.json({
      url: `https://source.unsplash.com/random/${width}x${height}?sig=${randomSeed}`,
      photographer: 'Unsplash Contributors',
      photographerUrl: 'https://unsplash.com',
      photoUrl: 'https://unsplash.com',
      description: 'Random photo from Unsplash',
    });
  }

  try {
    const randomSeed = Math.random().toString(36).substring(7);
    const response = await fetch(
      `https://api.unsplash.com/photos/random?orientation=landscape&sig=${randomSeed}`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
        cache: 'no-store', // Disable Next.js cache
      }
    );

    if (!response.ok) {
      console.warn(`Unsplash API error ${response.status}, falling back to Unsplash Source`);
      
      // Fallback to Unsplash Source
      const width = 1920;
      const height = 1080;
      const randomSeed = Math.floor(Math.random() * 10000);
      
      return NextResponse.json({
        url: `https://source.unsplash.com/random/${width}x${height}?sig=${randomSeed}`,
        photographer: 'Unsplash Contributors',
        photographerUrl: 'https://unsplash.com',
        photoUrl: 'https://unsplash.com',
        description: 'Random photo from Unsplash',
      });
    }

    const data = await response.json();

    return NextResponse.json({
      url: data.urls.regular,
      photographer: data.user.name,
      photographerUrl: data.user.links.html,
      photoUrl: data.links.html,
      description: data.description || data.alt_description || 'Unsplash photo',
    });
  } catch (error) {
    console.error('Error fetching Unsplash photo:', error);
    
    // Final fallback
    const width = 1920;
    const height = 1080;
    const randomSeed = Math.floor(Math.random() * 10000);
    
    return NextResponse.json({
      url: `https://source.unsplash.com/random/${width}x${height}?sig=${randomSeed}`,
      photographer: 'Unsplash Contributors',
      photographerUrl: 'https://unsplash.com',
      photoUrl: 'https://unsplash.com',
      description: 'Random photo from Unsplash',
    });
  }
}
