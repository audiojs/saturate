// Tube/valve saturation — asymmetric transfer (biased tanh, DC-compensated):
// asymmetry generates even harmonics — the "warm" 2nd-harmonic tube signature.
import { shape } from './shape.js'
import { oversampler, up, down } from '@audio/resample-sinc'

// @audio/resample-sinc's 4× oversampler, on the arithmetic of shape()'s resampling: LATENCY, the samples the streaming
// form's output is late (the whole call reads that far ahead), and RING, the samples it moves past that once the input
// stops (for a transfer that takes 0 to 0)
export const { latency: LATENCY, ring: RING } = oversampler(4, 0)

export default function tube (data, { drive = 2, bias = 0.25, fs = 44100, oversample = 4, mix = 1 } = {}) {
	let norm = Math.tanh(drive * (1 + Math.abs(bias)))
	let dc = Math.tanh(drive * bias) / norm
	let fn = x => Math.tanh(drive * (x + bias)) / norm - dc
	return shape(data, fn, { fs, oversample, mix })
}

/** State for stream(): calls of up to `maxBlockSize` samples */
export const state = maxBlockSize => oversampler(4, maxBlockSize)

/**
 * Streaming form, oversampled 4×: `n` samples of `data` in place, `s` carried from call to call, the output LATENCY
 * samples late. `p` holds drive, bias (0.25 when absent) and mix as a host gives a processor its values, each a
 * 1-length array, read at each call. `lanes` (optional, a Float64Array): drive, bias and mix for each of the `n`
 * samples, from 0, `M` and 2·`M`, in place of p's, for values that move within the call (the ./audio processor's
 * glide); a sample's drive and bias shape its four samples at the higher rate. Without it the call runs on p's alone.
 */
export function stream (data, p, s, n = data.length, lanes, M = 0) {
	let drive = p.drive[0], bias = p.bias ? p.bias[0] : 0.25, mix = p.mix[0], hi = s.hi, dry = s.dry
	let norm = Math.tanh(drive * (1 + Math.abs(bias))), dc = Math.tanh(drive * bias) / norm
	up(s, data, n)
	if (lanes) for (let i = 0, j = 0; i < n; i++) {
		let d = lanes[i], b = lanes[M + i], nm = Math.tanh(d * (1 + Math.abs(b))), z = Math.tanh(d * b) / nm
		for (let e = j + 4; j < e; j++) hi[j] = Math.tanh(d * (hi[j] + b)) / nm - z
	}
	else for (let j = 0; j < 4 * n; j++) hi[j] = Math.tanh(drive * (hi[j] + bias)) / norm - dc
	down(s, data, n)
	if (lanes) for (let i = 0, k = 2 * M; i < n; i++) data[i] = dry[i] * (1 - lanes[k + i]) + data[i] * lanes[k + i]
	else for (let i = 0; i < n; i++) data[i] = dry[i] * (1 - mix) + data[i] * mix
	return data
}
