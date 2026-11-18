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

/** A number as a host gives a processor its values: a 1-length array. */
export type Value = ArrayLike<number>

/** State of `stream`: the oversampler's input and output history, for calls of up to the size it was made for. */
export interface WaveshaperState { x: Float32Array; hi: Float32Array; y: Float32Array; dry: Float32Array }

/** Samples the streaming form's output is late: the whole call's oversampler reads that far ahead. */
export declare const LATENCY: 20
/** Samples the streaming form's output still moves once its input stops, past LATENCY (for a curve taking 0 to 0). */
export declare const RING: 19

/** State for `stream`, for calls of up to `maxBlockSize` samples. */
export function state(maxBlockSize: number): WaveshaperState

/**
 * Streaming form, oversampled 4×: `length` samples of `data` in place (default all), `state` carried from call to
 * call, the output LATENCY samples late; values (and `curve`, in place of drive) read at each call. `lanes`: drive and
 * mix for each sample, from 0 and `stride`, in place of `values`' (the ./audio processor's glide). Returns `data`.
 */
export function stream(data: Float32Array, values: { drive: Value; mix: Value; curve?: (x: number) => number }, state: WaveshaperState, length?: number, lanes?: Float64Array, stride?: number): Float32Array
