namespace Teboraw.Core.Configuration;

public class AudioStorageSettings
{
    public string BasePath { get; set; } = "./data/audio";
    public string[] AllowedExtensions { get; set; } = [".m4a", ".mp3", ".wav", ".webm", ".ogg"];
    public int MaxFileSizeMb { get; set; } = 50;
}

public class WhisperSettings
{
    public string ModelPath { get; set; } = "./data/models/whisper/ggml-base.bin";
    public string Language { get; set; } = "auto";
}
