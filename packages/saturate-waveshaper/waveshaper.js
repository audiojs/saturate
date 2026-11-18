// Waveshaper — normalized tanh (default) or custom transfer curve, oversampled.
import { shape } from './shape.js'
import { oversampler, up, down } from './oversample.js'
export { LATENCY, RING } from './oversample.js'

export default function waveshaper (data, { drive = 2, curve, fs = 44100, oversample = 4, mix = 1 } = {}) {
	let norm = Math.tanh(drive)
	let fn = curve || (x => Math.tanh(drive * x) / norm)
	return shape(data, fn, { fs, oversample, mix })
}

/** State for stream(): calls of up to `maxBlockSize` samples */
export const state = oversampler

/**
 * Streaming form, oversampled 4×: `n` samples of `data` in place, `s` carried from call to call, the output LATENCY
 * samples late. `p` holds drive and mix as a host gives a processor its values, each a 1-length array, and an
 * optional `curve` function, read at each call. `lanes` (optional, a Float64Array): drive and mix for each of the `n`
 * samples, from 0 and from `M`, in place of p's, for values that move within the call (the ./audio processor's glide);
 * a sample's drive shapes its four samples at the higher rate (a `curve` takes none). Without it the call runs on p's.
 */
export function stream (data, p, s, n = data.length, lanes, M = 0) {
	let drive = p.drive[0], mix = p.mix[0], curve = p.curve, norm = Math.tanh(drive), hi = s.hi, dry = s.dry
	up(s, data, n)
	if (curve) for (let j = 0; j < 4 * n; j++) hi[j] = curve(hi[j])
	else if (lanes) for (let i = 0, j = 0; i < n; i++) {
		let d = lanes[i], nm = Math.tanh(d)
		for (let e = j + 4; j < e; j++) hi[j] = Math.tanh(d * hi[j]) / nm
	}
	else for (let j = 0; j < 4 * n; j++) hi[j] = Math.tanh(drive * hi[j]) / norm
	down(s, data, n)
	if (lanes) for (let i = 0; i < n; i++) data[i] = dry[i] * (1 - lanes[M + i]) + data[i] * lanes[M + i]
	else for (let i = 0; i < n; i++) data[i] = dry[i] * (1 - mix) + data[i] * mix
	return data
}
