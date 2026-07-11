/** Tube saturation — asymmetric biased tanh, even-harmonic signature. */
export interface TubeOptions {
  /** pre-gain into the biased tanh curve, default 2 */
  drive?: number
  /** 0..1, asymmetry (DC-compensated); higher = more even-harmonic content, default 0.25 */
  bias?: number
  /** sample rate in Hz, default 44100 */
  fs?: number
  /** oversample factor; 1 disables oversampling (naive, aliased), default 4 */
  oversample?: number
  /** 0..1, wet/dry blend, default 1 */
  mix?: number
}

/** Process a mono buffer in place; returns the same array. */
export default function tube(data: Float32Array, options?: TubeOptions): Float32Array
