/** Transistor/console saturation — odd-symmetric cubic, 3rd-harmonic dominant. */
export interface TransistorOptions {
  /** pre-gain into the cubic soft-clip curve, default 2 */
  drive?: number
  /** sample rate in Hz, default 44100 */
  fs?: number
  /** oversample factor; 1 disables oversampling (naive, aliased), default 4 */
  oversample?: number
  /** 0..1, wet/dry blend, default 1 */
  mix?: number
}

/** Process a mono buffer in place; returns the same array. */
export default function transistor(data: Float32Array, options?: TransistorOptions): Float32Array
