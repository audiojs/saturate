/** Per-band `@audio/saturate-tube` drive; `null`/`undefined` leaves that band unsaturated. */
export type MultibandBandOptions = { drive?: number; bias?: number; oversample?: number; mix?: number } | null | undefined

/** Multiband saturation — Linkwitz-Riley split + per-band tube drive (Saturn class). */
export interface MultibandOptions {
  /** crossover split points in Hz; N points produce N+1 bands, default [200, 2000] */
  freqs?: number[]
  /** one options object applied to every band, or an array of per-band options/null, default undefined (no drive) */
  bands?: MultibandBandOptions | MultibandBandOptions[]
  /** Linkwitz-Riley crossover order, default 4 */
  order?: number
  /** sample rate in Hz, default 44100 */
  fs?: number
}

/** Process a mono buffer in place; returns the same array. */
export default function multiband(data: Float32Array, options?: MultibandOptions): Float32Array
