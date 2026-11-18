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

/** A number as a host gives a processor its values: a 1-length array. */
export type Value = ArrayLike<number>

/** State of `stream`: @audio/resample-sinc's 4× oversampler, its input and output history, for calls of up to the size it was made for. */
export type TubeState = import('@audio/resample-sinc').Oversampler

/** Samples the streaming form's output is late: the whole call's oversampler reads that far ahead. */
export declare const LATENCY: 31
/** Samples the streaming form's output still moves once its input stops, past LATENCY. */
export declare const RING: 31

/** State for `stream`, for calls of up to `maxBlockSize` samples. */
export function state(maxBlockSize: number): TubeState

/**
 * Streaming form, oversampled 4×: `length` samples of `data` in place (default all), `state` carried from call to
 * call, the output LATENCY samples late; values read at each call, bias 0.25 when absent. `lanes`: drive, bias and mix
 * for each sample, from 0, `stride` and 2·`stride`, in place of `values`' (the ./audio processor's glide). Returns
 * `data`.
 */
export function stream(data: Float32Array, values: { drive: Value; bias?: Value; mix: Value }, state: TubeState, length?: number, lanes?: Float64Array, stride?: number): Float32Array
