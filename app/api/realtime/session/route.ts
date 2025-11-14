import { NextRequest } from 'next/server';

/**
 * POST /api/realtime/session
 * Exchange SDP offer with OpenAI Realtime API
 * Returns SDP answer for WebRTC connection
 */
export async function POST(request: NextRequest) {
  try {
    const offerSDP = await request.text();

    if (!offerSDP) {
      return new Response('Missing SDP offer', { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response('Server configuration error', { status: 500 });
    }

    console.log('Received SDP offer length:', offerSDP.length);
    console.log('SDP offer preview:', offerSDP.substring(0, 200));

    // Exchange SDP with OpenAI Realtime API
    const response = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/sdp',
      },
      body: offerSDP,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      console.error('Status:', response.status);
      console.error('Headers:', Object.fromEntries(response.headers.entries()));
      return new Response(`OpenAI API error: ${response.status} - ${errorText}`, {
        status: response.status,
      });
    }

    const answerSDP = await response.text();

    return new Response(answerSDP, {
      headers: {
        'Content-Type': 'application/sdp',
      },
    });
  } catch (error) {
    console.error('Session creation error:', error);
    return new Response('Failed to create session', { status: 500 });
  }
}
