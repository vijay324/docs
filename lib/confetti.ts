import confetti from 'canvas-confetti';
import { playTaskCompleteSound, playSprintCompleteSound, isSoundEnabled } from './sound-effects';

// Confetti configuration types
export interface ConfettiOptions {
  particleCount?: number;
  angle?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  drift?: number;
  ticks?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  shapes?: ('square' | 'circle')[];
  scalar?: number;
  zIndex?: number;
}

// Enhanced confetti options with sound
export interface EnhancedConfettiOptions extends ConfettiOptions {
  playSound?: boolean;
  soundVolume?: number;
}

// Default confetti configuration
const defaultOptions: ConfettiOptions = {
  particleCount: 100,
  spread: 70,
  origin: { x: 0.5, y: 0.6 },
  colors: ['#26ccff', '#a25afd', '#ff5722', '#26a69a', '#ffc107'],
};

// Basic confetti burst
export const fireConfetti = (options?: ConfettiOptions) => {
  const config = { ...defaultOptions, ...options };
  return confetti(config);
};

// Enhanced task completion confetti with sound effects
export const taskCompletionConfetti = (options: EnhancedConfettiOptions = {}) => {
  // Play sound effect if enabled
  if (options.playSound !== false && isSoundEnabled()) {
    playTaskCompleteSound({ volume: options.soundVolume || 0.3 });
  }

  const count = 200;
  const defaults = {
    origin: { x: 0.5, y: 0.7 },
    zIndex: 1000
  };

  // Neutral brand colors with zinc palette
  const brandColors = [
    '#27272A', // Primary zinc-800
    '#3F3F46', // Secondary zinc-700
    '#52525B', // Zinc-600
    '#A1A1AA', // Zinc-400
    '#4caf50', // Success green
    '#ffc107', // Warning amber
    '#18181B'  // Dark accent
  ];

  function fire(particleRatio: number, opts: any) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
      colors: brandColors,
      shapes: ['circle', 'square'] as ('circle' | 'square')[],
      ...options
    });
  }

  // Enhanced burst pattern with brand colors
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    scalar: 1.2
  });

  fire(0.2, {
    spread: 60,
    startVelocity: 45
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    scalar: 0.9
  });
};

// Success confetti - smaller, more subtle
export const successConfetti = () => {
  confetti({
    particleCount: 50,
    spread: 60,
    origin: { x: 0.5, y: 0.8 },
    colors: ['#4caf50', '#8bc34a', '#cddc39'],
    startVelocity: 30,
    gravity: 0.8,
    drift: 0,
    ticks: 200
  });
};

// Celebration confetti - big celebration
export const celebrationConfetti = () => {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // since particles fall down, start a bit higher than random
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#26ccff', '#a25afd', '#ff5722', '#26a69a', '#ffc107']
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#26ccff', '#a25afd', '#ff5722', '#26a69a', '#ffc107']
    });
  }, 250);
};

// Enhanced side cannons confetti for individual task completion
export const sideCannonConfetti = (options: EnhancedConfettiOptions = {}) => {
  // Play task completion sound
  if (options.playSound !== false && isSoundEnabled()) {
    playTaskCompleteSound({ volume: options.soundVolume || 0.2 });
  }

  const end = Date.now() + (1.5 * 1000); // Shorter duration for individual tasks

  // Neutral brand colors for side cannons
  const colors = ['#27272A', '#3F3F46', '#52525B', '#4caf50'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
      startVelocity: 30,
      scalar: 0.8,
      zIndex: 1000,
      ...options
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
      startVelocity: 30,
      scalar: 0.8,
      zIndex: 1000,
      ...options
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
};

// School pride confetti
export const schoolPrideConfetti = () => {
  const end = Date.now() + (15 * 1000);

  // go Buckeyes!
  const colors = ['#bb0000', '#ffffff'];

  (function frame() {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
};

// Enhanced fireworks confetti for sprint completion
export const fireworksConfetti = (options: EnhancedConfettiOptions = {}) => {
  // Play sprint completion sound
  if (options.playSound !== false && isSoundEnabled()) {
    playSprintCompleteSound({ volume: options.soundVolume || 0.4 });
  }

  const duration = 4 * 1000; // 4 seconds of celebration
  const animationEnd = Date.now() + duration;
  const defaults = {
    startVelocity: 30,
    spread: 360,
    ticks: 60,
    zIndex: 1000,
    gravity: 0.8
  };

  // Neutral brand colors for fireworks
  const brandColors = [
    '#27272A', '#3F3F46', '#52525B', '#A1A1AA',
    '#4caf50', '#ffc107', '#18181B', '#9c27b0'
  ];

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Left side firework
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: brandColors,
      shapes: ['circle', 'square'] as ('circle' | 'square')[],
      scalar: randomInRange(0.8, 1.2),
      ...options
    });

    // Right side firework
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: brandColors,
      shapes: ['circle', 'square'] as ('circle' | 'square')[],
      scalar: randomInRange(0.8, 1.2),
      ...options
    });

    // Center burst for extra celebration
    if (Math.random() < 0.3) {
      confetti({
        ...defaults,
        particleCount: particleCount * 0.5,
        origin: { x: 0.5, y: randomInRange(0.2, 0.4) },
        colors: ['#27272A', '#3F3F46'], // Primary brand colors
        shapes: ['circle'] as ('circle')[],
        scalar: 1.5,
        startVelocity: 45,
        ...options
      });
    }
  }, 200); // Faster interval for more dynamic effect
};

// Convenience functions for specific use cases
export const celebrateTaskCompletion = (withSound: boolean = true) => {
  sideCannonConfetti({ playSound: withSound });
};

export const celebrateSprintCompletion = (withSound: boolean = true) => {
  fireworksConfetti({ playSound: withSound });
};

export const celebrateTaskCompletionFull = (withSound: boolean = true) => {
  taskCompletionConfetti({ playSound: withSound });
};

// Quick celebration without sound (for bulk operations)
export const quickCelebration = () => {
  confetti({
    particleCount: 50,
    spread: 70,
    origin: { x: 0.5, y: 0.8 },
    colors: ['#27272A', '#3F3F46'],
    zIndex: 1000,
    scalar: 0.8
  });
};

// Export all confetti functions
export {
  confetti as defaultConfetti
};
