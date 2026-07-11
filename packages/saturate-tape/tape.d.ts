/** Tape saturation — tanh transfer + playback HF rolloff (simplified machine model). */
export interface TapeOptions {
  /** pre-gain into the tanh+quadratic curve, default 1.5 */
  drive?: number
  /** 0..1, HF rolloff amount (higher = darker, more "tape"), default 0.25 */
  warmth?: number
  /** sample rate in Hz, default 44100 */
  fs?: number
  /** oversample factor for the shaping stage; 1 disables oversampling, default 4 */
  oversample?: number
  /** 0..1, wet/dry blend of the whole processed signal (shaping + rolloff), default 1 */
  mix?: number
}

/** Process a mono buffer in place; returns the same array. */
export default function tape(data: Float32Array, options?: TapeOptions): Float32Array
