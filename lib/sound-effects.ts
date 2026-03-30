// Sound Effects System for flotick
// Provides audio feedback for task and sprint completions

export interface SoundConfig {
  volume?: number;
  playbackRate?: number;
  loop?: boolean;
}

export class SoundEffectsManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private isEnabled: boolean = true;
  private masterVolume: number = 0.3; // Default volume (30%)

  constructor() {
    this.initializeAudioContext();
    this.loadSounds();
  }

  private initializeAudioContext() {
    try {
      // Create AudioContext with user gesture requirement handling
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Handle autoplay policy - resume context on first user interaction
      if (this.audioContext.state === 'suspended') {
        const resumeAudio = () => {
          if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
          }
          // Remove listeners after first interaction
          document.removeEventListener('click', resumeAudio);
          document.removeEventListener('keydown', resumeAudio);
          document.removeEventListener('touchstart', resumeAudio);
        };

        document.addEventListener('click', resumeAudio);
        document.addEventListener('keydown', resumeAudio);
        document.addEventListener('touchstart', resumeAudio);
      }
    } catch (error) {
      console.warn('AudioContext not supported:', error);
      this.audioContext = null;
    }
  }

  private async loadSounds() {
    if (!this.audioContext) return;

    const soundFiles = {
      taskComplete: this.generateTaskCompleteSound(),
      sprintComplete: this.generateSprintCompleteSound(),
    };

    try {
      for (const [name, audioData] of Object.entries(soundFiles)) {
        const audioBuffer = await this.audioContext.decodeAudioData(audioData);
        this.sounds.set(name, audioBuffer);
      }
    } catch (error) {
      console.warn('Failed to load sounds:', error);
    }
  }

  // Generate a pleasant task completion sound (short chime)
  private generateTaskCompleteSound(): ArrayBuffer {
    if (!this.audioContext) return new ArrayBuffer(0);

    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.5; // 500ms
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Create a pleasant chime sound with multiple harmonics
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 3); // Exponential decay
      
      // Multiple frequency components for a richer sound
      const freq1 = 523.25; // C5
      const freq2 = 659.25; // E5
      const freq3 = 783.99; // G5
      
      data[i] = envelope * (
        0.4 * Math.sin(2 * Math.PI * freq1 * t) +
        0.3 * Math.sin(2 * Math.PI * freq2 * t) +
        0.3 * Math.sin(2 * Math.PI * freq3 * t)
      );
    }

    // Convert to ArrayBuffer
    const arrayBuffer = new ArrayBuffer(length * 4);
    const view = new Float32Array(arrayBuffer);
    view.set(data);
    return arrayBuffer;
  }

  // Generate a celebratory sprint completion sound (fanfare)
  private generateSprintCompleteSound(): ArrayBuffer {
    if (!this.audioContext) return new ArrayBuffer(0);

    const sampleRate = this.audioContext.sampleRate;
    const duration = 1.2; // 1.2 seconds
    const length = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Create a fanfare-like sound with ascending notes
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let envelope = 1;
      let frequency = 0;
      
      // Different phases of the fanfare
      if (t < 0.3) {
        // First note - C5
        envelope = Math.exp(-t * 2);
        frequency = 523.25;
      } else if (t < 0.6) {
        // Second note - E5
        envelope = Math.exp(-(t - 0.3) * 2);
        frequency = 659.25;
      } else if (t < 0.9) {
        // Third note - G5
        envelope = Math.exp(-(t - 0.6) * 2);
        frequency = 783.99;
      } else {
        // Final chord - C6
        envelope = Math.exp(-(t - 0.9) * 3);
        frequency = 1046.50;
      }
      
      // Add some harmonics for richness
      data[i] = envelope * (
        0.5 * Math.sin(2 * Math.PI * frequency * t) +
        0.2 * Math.sin(2 * Math.PI * frequency * 2 * t) +
        0.1 * Math.sin(2 * Math.PI * frequency * 3 * t)
      );
    }

    // Convert to ArrayBuffer
    const arrayBuffer = new ArrayBuffer(length * 4);
    const view = new Float32Array(arrayBuffer);
    view.set(data);
    return arrayBuffer;
  }

  public async playSound(soundName: string, config: SoundConfig = {}) {
    if (!this.isEnabled || !this.audioContext || !this.sounds.has(soundName)) {
      return;
    }

    try {
      const audioBuffer = this.sounds.get(soundName)!;
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = audioBuffer;
      source.playbackRate.value = config.playbackRate || 1;
      source.loop = config.loop || false;

      gainNode.gain.value = (config.volume || 1) * this.masterVolume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start();
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  public isAudioEnabled(): boolean {
    return this.isEnabled && !!this.audioContext;
  }
}

// Create singleton instance
export const soundEffects = new SoundEffectsManager();

// Convenience functions for specific sounds
export const playTaskCompleteSound = (config?: SoundConfig) => {
  soundEffects.playSound('taskComplete', config);
};

export const playSprintCompleteSound = (config?: SoundConfig) => {
  soundEffects.playSound('sprintComplete', config);
};

// Settings management
export const setSoundEnabled = (enabled: boolean) => {
  soundEffects.setEnabled(enabled);
  // Store preference in localStorage
  localStorage.setItem('flotick-sound-enabled', enabled.toString());
};

export const isSoundEnabled = (): boolean => {
  const stored = localStorage.getItem('flotick-sound-enabled');
  return stored !== null ? stored === 'true' : true; // Default to enabled
};

export const setSoundVolume = (volume: number) => {
  soundEffects.setMasterVolume(volume);
  // Store preference in localStorage
  localStorage.setItem('flotick-sound-volume', volume.toString());
};

export const getSoundVolume = (): number => {
  const stored = localStorage.getItem('flotick-sound-volume');
  return stored !== null ? parseFloat(stored) : 0.3; // Default to 30%
};

// Initialize settings from localStorage
if (typeof window !== 'undefined') {
  soundEffects.setEnabled(isSoundEnabled());
  soundEffects.setMasterVolume(getSoundVolume());
}
