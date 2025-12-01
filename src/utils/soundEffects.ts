/**
 * Sound Effects Utility
 * 
 * Premium subtle sounds using Web Audio API
 * No external files needed - generated programmatically
 */

// Check if sounds are enabled in settings
export const areSoundsEnabled = (): boolean => {
  try {
    const settings = localStorage.getItem('vault_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.soundEffectsEnabled ?? false; // Default OFF
    }
  } catch {
    // Ignore errors
  }
  return false;
};

// Audio context singleton
let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (!areSoundsEnabled()) return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioContext;
};

/**
 * Soft Click Sound
 * Short, subtle click for button presses
 */
export const playClickSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Short, high-frequency tick
    oscillator.frequency.setValueAtTime(1800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.02);
    
    oscillator.type = 'sine';

    // Quick fade out
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  } catch {
    // Silently fail if audio doesn't work
  }
};

/**
 * Success Chime
 * Pleasant two-tone chime for successful actions
 */
export const playSuccessSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // First tone (lower)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.1, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    // Second tone (higher) - slightly delayed
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.25);
  } catch {
    // Silently fail
  }
};

/**
 * Lock Sound
 * Satisfying mechanical lock sound
 */
export const playLockSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Low "clunk" sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    // Low frequency thunk
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);
    osc.type = 'sine';

    // Low-pass filter for warmth
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);

    // Quick attack, medium decay
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);

    // Add a subtle click on top
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.frequency.setValueAtTime(2500, ctx.currentTime);
    click.type = 'sine';
    clickGain.gain.setValueAtTime(0.05, ctx.currentTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
    click.start(ctx.currentTime);
    click.stop(ctx.currentTime + 0.02);
  } catch {
    // Silently fail
  }
};

/**
 * Unlock Sound
 * Lighter version of lock sound
 */
export const playUnlockSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Rising tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.08);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch {
    // Silently fail
  }
};

/**
 * Error/Warning Sound
 * Subtle low tone for errors
 */
export const playErrorSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Two quick low tones
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.setValueAtTime(0.001, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.1, ctx.currentTime + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // Silently fail
  }
};

/**
 * Copy Sound
 * Quick subtle confirmation
 */
export const playCopySound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // Silently fail
  }
};

/**
 * Delete Sound
 * Subtle swoosh down
 */
export const playDeleteSound = (): void => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Descending tone
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.12);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Silently fail
  }
};

