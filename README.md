# OpenAI Realtime API Demo

A real-time voice and image conversation application built with Next.js and OpenAI's Realtime API (`gpt-realtime`). Features voice-to-voice conversations with screen sharing capabilities.

## ✨ Features

- 🎙️ **Real-time Voice Conversations** - Natural voice-to-voice chat powered by OpenAI's Realtime API
- 🖼️ **Screen Sharing** - Capture and share screenshots with AI for visual analysis
- 🌐 **WebRTC Connection** - Direct browser-to-OpenAI communication via WebRTC
- 🎨 **Modern UI** - Built with Material-UI (MUI) v7 and Tailwind CSS
- 🔊 **Server VAD** - Server-side Voice Activity Detection for natural conversation flow
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

1. **Connect** - The app automatically connects to OpenAI's Realtime API when loaded
2. **Start Talking** - Click the microphone button to begin voice conversation
3. **Share Screen** - Click the screen share button to capture and send a screenshot to the AI
4. **View Events** - Monitor real-time API events in the control panel

## 🛠️ Technical Stack

- **Framework**: Next.js 16 (App Router)
- **UI Libraries**: Material-UI v7, Tailwind CSS v4
- **Language**: TypeScript
- **API**: OpenAI Realtime API (`gpt-realtime`)
- **Connection**: WebRTC with DataChannel for event streaming
- **Audio**: PCM16 format for input/output

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── realtime/session/  # SDP exchange proxy
│   │   └── unsplash/          # Random image API
│   └── page.tsx               # Main application page
├── components/
│   ├── ChatPane.tsx           # Chat display component
│   ├── ControlPane.tsx        # Controls and event log
│   └── ImagePane.tsx          # Background image display
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
- Implements proper cleanup and error handling

### Session Configuration
```typescript
{
  modalities: ["audio", "text"],
  voice: "verse",
  input_audio_format: "pcm16",
  output_audio_format: "pcm16",
  turn_detection: { type: "server_vad" }
}
```

### Screen Sharing
- Uses Web APIs to capture screen/window
- Optimizes images (max 512px, 80% quality)
- Sends via `conversation.item.create` event

## 🐛 Troubleshooting

**No audio output?**
- Check browser audio permissions
- Verify `modalities: ["audio", "text"]` order (audio first)
- Check console for `response.audio.delta` events

**Connection fails?**
- Verify OPENAI_API_KEY is set correctly
- Check browser console for WebRTC errors
- Ensure stable internet connection

**Screen sharing not working?**
- Grant screen capture permissions when prompted
- Try refreshing the page if permissions were denied

## 📚 Documentation

See [memory-bank/openai-realtime-api.md](./memory-bank/openai-realtime-api.md) for detailed API documentation, including:
- Connection methods
- Session configuration
- Event types and structures
- WebRTC best practices
- Common pitfalls and solutions

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [Next.js Documentation](https://nextjs.org/docs)
- [Material-UI Documentation](https://mui.com/)
- [WebRTC API Reference](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
