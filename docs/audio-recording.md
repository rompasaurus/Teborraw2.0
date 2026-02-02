# Audio Recording Feature

This document provides an overview of the audio recording functionality in Teboraw, including architecture, code design, and file structure.

## Overview

The audio recording feature allows users to capture ambient audio from their mobile device, automatically upload it to the server, and have it transcribed using Whisper AI. Users can then search, browse, and play back their recordings through the web interface.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │────▶│    REST API     │────▶│   Background    │
│  (React Native) │     │   (.NET Core)   │     │    Services     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Local Storage  │     │   File System   │     │  Whisper Model  │
│  (Audio Chunks) │     │  (Audio Files)  │     │ (Transcription) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │    Database     │
                        │  (PostgreSQL)   │
                        └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │    Web App      │
                        │    (React)      │
                        └─────────────────┘
```

## Data Flow

1. **Recording**: Mobile app captures audio using `react-native-live-audio-stream`
2. **Chunking**: Audio is buffered and saved as WAV files in 5-minute chunks
3. **Upload**: Chunks are uploaded to the API during sync intervals
4. **Storage**: API saves files to disk and creates database records
5. **Transcription**: Background service processes pending recordings with Whisper
6. **Playback**: Web app streams audio and displays transcripts

## File Structure

### Mobile App (`apps/mobile/TeborawMobile/`)

```
src/
├── services/
│   ├── AudioService.ts      # Core audio recording service
│   └── TrackingService.ts   # Orchestrates audio + location tracking
├── utils/
│   └── audioPermissions.ts  # Microphone permission handling
└── screens/
    └── SettingsScreen.tsx   # Audio toggle UI
```

### API Backend (`apps/api/`)

```
Teboraw.Api/
├── Controllers/
│   └── AudioController.cs           # REST endpoints for audio
├── Services/
│   ├── WhisperTranscriptionService.cs    # Whisper integration
│   └── TranscriptionBackgroundService.cs # Background processor
└── DTOs/
    └── ActivityDTOs.cs              # Audio-related DTOs

Teboraw.Core/
├── Configuration/
│   └── AudioSettings.cs             # Storage & Whisper config
├── Entities/
│   └── AudioRecording.cs            # Database entity
└── Interfaces/
    └── ITranscriptionService.cs     # Transcription interface
```

### Web App (`apps/web/`)

```
src/
├── components/
│   └── audio/
│       ├── index.ts                 # Barrel export
│       ├── AudioPlayer.tsx          # Reusable audio player
│       └── AudioRecordingCard.tsx   # Recording display card
├── pages/
│   ├── Audio.tsx                    # Dedicated audio page
│   └── Dashboard.tsx                # Timeline with audio support
└── services/
    └── api.ts                       # audioApi functions
```

## Component Details

### Mobile: AudioService

The `AudioService` class manages all audio recording functionality:

```typescript
class AudioServiceClass {
  // Configuration
  private settings: AudioSettings
  private chunkTimer: ReturnType<typeof setInterval> | null
  private audioBuffer: number[]
  private pendingChunks: PendingChunk[]

  // Core methods
  async start()              // Begin recording
  async stop()               // Stop recording
  async uploadPendingChunks() // Upload to server
  async setEnabled(enabled)  // Toggle recording
}
```

**Key Features:**
- Records at 16kHz mono (optimal for speech)
- Creates proper WAV file headers
- Persists pending uploads across app restarts
- Handles permission checks automatically

### API: AudioController

REST endpoints for audio management:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/audio/upload` | Upload audio file |
| GET | `/api/audio` | List recordings with filters |
| GET | `/api/audio/{id}` | Get recording details |
| GET | `/api/audio/{id}/stream` | Stream audio file |
| GET | `/api/audio/{id}/transcription` | Get transcription status |

### API: TranscriptionBackgroundService

Polls for pending recordings and processes them:

```csharp
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    while (!stoppingToken.IsCancellationRequested)
    {
        await ProcessPendingTranscriptionsAsync(stoppingToken);
        await Task.Delay(_pollingInterval, stoppingToken);
    }
}
```

**Processing Flow:**
1. Query recordings with `TranscriptionStatus.Pending`
2. Convert audio to 16kHz WAV (Whisper requirement)
3. Run through Whisper model
4. Save transcript to database

### Web: AudioPlayer

Reusable component for authenticated audio playback:

```tsx
<AudioPlayer
  audioId="uuid"
  durationSeconds={300}
  compact={false}
/>
```

**Features:**
- Authenticated streaming via blob URL
- Progress bar with seek
- Play/pause, skip forward/back
- Mute toggle
- Compact mode for inline display

### Web: Audio Page

Dedicated page for browsing recordings:

- Filter by date range (today, week, month, all)
- Filter by transcription status
- Search transcripts
- Paginated results
- Stats dashboard (total, transcribed, processing, failed)

## Database Schema

### AudioRecording Entity

```csharp
public class AudioRecording : BaseEntity
{
    public string FilePath { get; set; }
    public int DurationSeconds { get; set; }
    public string? Transcript { get; set; }
    public TranscriptionStatus TranscriptionStatus { get; set; }
    public DateTime RecordedAt { get; set; }

    // Foreign key to Activity
    public Guid ActivityId { get; set; }
    public Activity Activity { get; set; }
}

public enum TranscriptionStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}
```

## Configuration

### API Settings (`appsettings.json`)

```json
{
  "AudioStorage": {
    "BasePath": "./data/audio",
    "AllowedExtensions": [".m4a", ".mp3", ".wav", ".webm", ".ogg"],
    "MaxFileSizeMb": 50
  },
  "Whisper": {
    "ModelPath": "./data/models/whisper/ggml-base.bin",
    "Language": "auto"
  }
}
```

### Mobile Settings

Settings are stored in AsyncStorage:

```typescript
interface AudioSettings {
  enabled: boolean
  chunkDuration: number  // milliseconds (default: 300000 = 5 min)
  sampleRate: number     // Hz (default: 16000)
  channels: number       // (default: 1 = mono)
  bitsPerSample: number  // (default: 16)
}
```

## Permissions

### iOS (`Info.plist`)

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Teboraw needs microphone access to record audio for transcription</string>
```

### Android (`AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

## Setup Requirements

1. **Whisper Model**: Download from HuggingFace and place at configured path:
   ```
   https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
   ```

2. **iOS Native Modules**: Run pod install after adding dependencies:
   ```bash
   cd apps/mobile/TeborawMobile/ios && pod install
   ```

3. **Storage Directory**: Ensure the API has write access to the audio storage path

## Security Considerations

- All API endpoints require authentication
- Audio files are stored with user-specific paths: `{basePath}/{userId}/{year}/{month}/`
- Streaming uses authenticated requests (Bearer token)
- Files are validated for type and size before storage

## Future Enhancements

- Real-time transcription during recording
- Speaker diarization (who said what)
- Audio waveform visualization
- Keyword/topic extraction from transcripts
- Export transcripts to various formats
- Voice activity detection (skip silence)
