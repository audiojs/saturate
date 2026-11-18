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

/** A number as a host gives a processor its values: a 1-length array. */
export type Value = ArrayLike<number>

/** State of `stream`: three bands, each with its crossover sections and its tube stage, and the points designed for. */
export interface MultibandState {
  bands: { data: Float32Array; tube: import('@audio/saturate-tube').TubeState; c: Float64Array; z: Float64Array }[]
  at: Float64Array
}

/** Samples the streaming form's output is late: each band's tube stage reads that far ahead in the whole call. */
export declare const LATENCY: 31
/** Samples a band's oversampler still moves once its input stops, past LATENCY (the crossover rings on). */
export declare const RING: 31

/** State for `stream` at `fs` (default 44100), for calls of up to `maxBlockSize` samples. */
export function state(maxBlockSize: number, fs?: number): MultibandState

/**
 * Streaming form: three bands split at `low` and `high` by an order-4 Linkwitz-Riley crossover, each through
 * `@audio/saturate-tube`'s stream at `drive` and `mix` (bias 0.25); `length` samples of `data` in place (default all),
 * `state` carried from call to call, the output LATENCY samples late. Values read at each call; the crossover is
 * designed again when a point moves. `lanes`: each band's tube values for each sample, as `@audio/saturate-tube`'s
 * stream takes them (drive, bias and mix from 0, `stride` and 2·`stride`; the ./audio processor's glide). Returns
 * `data`.
 */
export function stream(data: Float32Array, values: { low: Value; high: Value; drive: Value; mix: Value }, state: MultibandState, length?: number, lanes?: Float64Array, stride?: number): Float32Array
