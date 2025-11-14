# OpenAI Realtime API Demo

A real-time voice and image conversation application built with Next.js and OpenAI's Realtime API (`gpt-realtime`). Features voice-to-voice conversations with live screen sharing and automatic image analysis.

## ✨ Features

- 🎙️ **Real-time Voice Conversations** - Natural voice-to-voice chat powered by OpenAI's Realtime API
- 🖼️ **Live Screen Sharing** - Toggle screen sharing mode for continuous visual analysis
- 🔄 **Auto-Refresh Analysis** - AI automatically analyzes new images when you change the reference photo
- 🌐 **WebRTC Connection** - Direct browser-to-OpenAI communication via WebRTC
- 🎨 **Modern UI** - Built with Material-UI (MUI) v7 and Tailwind CSS
- 🔊 **Server VAD** - Server-side Voice Activity Detection for natural conversation flow
- 🎵 **Audio Responses** - AI responds with voice to both conversation and image analysis
- 📝 **Live Transcription** - Real-time transcription of your voice input using Whisper

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- OpenAI API key with Realtime API access

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd realtime_image_demo
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the project root:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎯 Usage

### Voice Conversation
1. **Connect** - The app automatically connects to OpenAI's Realtime API when loaded
2. **Start Talking** - Click the microphone button to begin voice conversation
3. **Stop Talking** - Click the microphone button again to stop (automatically cancels any active AI response)

### Live Screen Sharing Mode
1. **Start Sharing** - Click the "Share Screen" button (turns red when active)
2. **Select Window** - Choose the window/screen you want the AI to analyze
3. **Change Image** - Click the refresh button on the Unsplash image (upper-left corner)
4. **Auto-Analysis** - AI automatically captures and analyzes the new screenshot with voice response
5. **Stop Sharing** - Click the "Stop Sharing" button to end the session

**Note**: Screen sharing only prompts for permission once - subsequent image changes reuse the same screen stream for seamless analysis.

## 🛠️ Technical Stack

- **Framework**: Next.js 16 (App Router)
- **UI Libraries**: Material-UI v7, Tailwind CSS v4
- **Language**: TypeScript
- **API**: OpenAI Realtime API (`gpt-realtime`)
- **Connection**: WebRTC with DataChannel for event streaming
- **Audio**: PCM16 format for input/output, Web Audio API for playback
- **Images**: Unsplash API for random reference photos

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── realtime/session/  # SDP exchange proxy
│   │   └── unsplash/          # Random image API
│   └── page.tsx               # Main application page (manages screen share state)
├── components/
│   ├── ChatPane.tsx           # Chat display component
│   ├── ControlPane.tsx        # Controls, screen sharing, event log
│   └── ImagePane.tsx          # Background image display with refresh button
├── hooks/
│   └── useRealtime.ts         # WebRTC connection hook
├── lib/
│   └── screenshot.ts          # Screen capture utilities
└── memory-bank/
    └── openai-realtime-api.md # API reference documentation
```

## 🔑 Key Components

### WebRTC Connection (`useRealtime.ts`)
- Establishes peer connection with OpenAI
- Manages audio transceivers using `replaceTrack()` pattern
- Handles DataChannel for JSON event streaming
- Tracks active responses to prevent cancellation errors
- Provides `enableAudio()` for browser autoplay policy compliance
- Implements proper cleanup and error handling

### Session Configuration
```typescript
{
  modalities: ["audio", "text"],
  voice: "alloy",
  input_audio_format: "pcm16",
  output_audio_format: "pcm16",
  turn_detection: { type: "server_vad" }
}
```

### Live Screen Sharing
- Captures MediaStream once via `getDisplayMedia()` 
- Reuses stream for all subsequent screenshots (no re-permission)
- Automatically triggers on image refresh when sharing is active
- 1-second delay ensures new image is fully rendered
- Focuses AI analysis on main image content, ignoring UI elements
- Cancels in-progress responses before sending new screenshots

## 🐛 Troubleshooting

**No audio output?**
- Audio requires user interaction - click mic or screen share button first
- Check browser audio permissions
- Verify `modalities: ["audio", "text"]` order (audio first)

**Connection fails?**
- Verify OPENAI_API_KEY is set correctly
- Check browser console for WebRTC errors
- Ensure stable internet connection

**Screen sharing permission asked multiple times?**
- Should only happen once - if recurring, check browser console for errors
- Make sure you're not denying and retrying

**AI describes UI elements instead of image?**
- Prompt includes instructions to ignore UI - may need image to be larger in screenshot
- Try sharing just the image pane window instead of full screen

## 📚 Documentation

See [memory-bank/openai-realtime-api.md](./memory-bank/openai-realtime-api.md) for detailed API documentation, including:
- Connection methods
- Session configuration
- Event types and structures
- WebRTC best practices
- Common pitfalls and solutions

## 🎨 Recent Updates

### November 14, 2025
- ✅ Fixed audio playback with user interaction requirement
- ✅ Implemented active response tracking to prevent cancellation errors
- ✅ Added toggle-based screen sharing with persistent stream
- ✅ Integrated auto-capture on image refresh
- ✅ Added 1-second delay for proper image rendering
- ✅ Enhanced prompt to focus on main image content
- ✅ Added refresh button to Unsplash image pane

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [Next.js Documentation](https://nextjs.org/docs)
- [Material-UI Documentation](https://mui.com/)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
