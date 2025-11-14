import { NextResponse } from 'next/server';

export async function GET() {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return NextResponse.json(
      { error: 'Unsplash API key not configured' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      'https://api.unsplash.com/photos/random?orientation=landscape',
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
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
    return NextResponse.json(
      { error: 'Failed to fetch photo' },
      { status: 500 }
    );
  }
}
