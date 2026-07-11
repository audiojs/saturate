/** Waveshaper — normalized tanh or custom curve, oversampled. */
export interface WaveshaperOptions {
  /** pre-gain into the tanh curve; ignored when `curve` is set, default 2 */
  drive?: number
  /** custom transfer function, applied at the oversampled rate; default normalized tanh(drive·x) */
  curve?: (x: number) => number
  /** sample rate in Hz, default 44100 */
  fs?: number
  /** oversample factor; 1 disables oversampling (naive, aliased), default 4 */
  oversample?: number
  /** 0..1, wet/dry blend, default 1 */
  mix?: number
}

/** Process a mono buffer in place; returns the same array. */
export default function waveshaper(data: Float32Array, options?: WaveshaperOptions): Float32Array
