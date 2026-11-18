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

/** The one-pole's coefficient, its pole, for a warmth: 0.35 + 0.45·warmth. */
export function pole(warmth: number): number

/** A number as a host gives a processor its values: a 1-length array. */
export type Value = ArrayLike<number>

/** State of `stream`: the oversampler's input and output history and the one-pole's, for calls of up to the size it was made for. */
export interface TapeState { x: Float32Array; hi: Float32Array; y: Float32Array; dry: Float32Array; lp: Float64Array }

/** Samples the streaming form's output is late: the whole call's oversampler reads that far ahead. */
export declare const LATENCY: 20
/** Samples the oversampler's output still moves once its input stops, past LATENCY (the one-pole rings on). */
export declare const RING: 19

/** State for `stream`, for calls of up to `maxBlockSize` samples. */
export function state(maxBlockSize: number): TapeState

/**
 * Streaming form, the shaping oversampled 4×: `length` samples of `data` in place (default all), `state` carried from
 * call to call, the output LATENCY samples late; values read at each call. `lanes`: drive and mix for each sample, from
 * 0 and `stride`, in place of `values`' (the ./audio processor's glide). Returns `data`.
 */
export function stream(data: Float32Array, values: { drive: Value; warmth: Value; mix: Value }, state: TapeState, length?: number, lanes?: Float64Array, stride?: number): Float32Array
