import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react'
import { audioApi } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

interface AudioPlayerProps {
  audioId: string
  durationSeconds?: number
  compact?: boolean
}

export function AudioPlayer({ audioId, durationSeconds = 0, compact = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(durationSeconds)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)
  const { accessToken } = useAuthStore()

  useEffect(() => {
    // Create audio element with auth token
    const audio = new Audio()

    // Set up authenticated stream URL
    const streamUrl = audioApi.getStreamUrl(audioId)

    // For authenticated requests, we need to fetch the audio as a blob
    const loadAudio = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(streamUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to load audio')
        }

        const blob = await response.blob()
        audio.src = URL.createObjectURL(blob)
        audioRef.current = audio
      } catch (err) {
        setError('Failed to load audio')
        console.error('Audio load error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadAudio()

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        if (audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src)
        }
      }
    }
  }, [audioId, accessToken])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || durationSeconds)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleError = () => {
      setError('Failed to play audio')
      setIsPlaying(false)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [audioRef.current, durationSeconds])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.muted = !audio.muted
    setIsMuted(!isMuted)
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    const progress = progressRef.current
    if (!audio || !progress) return

    const rect = progress.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    audio.currentTime = percentage * duration
  }

  const skip = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-red-400`}>
        <span>{error}</span>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className="w-8 h-8 rounded-full bg-primary-500 hover:bg-primary-400 disabled:bg-slate-600 flex items-center justify-center transition-colors"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </button>
        <div className="flex-1 min-w-[100px]">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="h-1.5 bg-slate-700 rounded-full cursor-pointer"
          >
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-slate-400 tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      {/* Progress bar */}
      <div
        ref={progressRef}
        onClick={handleProgressClick}
        className="h-2 bg-slate-700 rounded-full cursor-pointer mb-4"
      >
        <div
          className="h-full bg-primary-500 rounded-full transition-all relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400 tabular-nums w-12">
            {formatTime(currentTime)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => skip(-10)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Skip back 10s"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading}
            className="w-12 h-12 rounded-full bg-primary-500 hover:bg-primary-400 disabled:bg-slate-600 flex items-center justify-center transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-1" />
            )}
          </button>

          <button
            onClick={() => skip(10)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Skip forward 10s"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
          <span className="text-sm text-slate-400 tabular-nums w-12 text-right">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}
