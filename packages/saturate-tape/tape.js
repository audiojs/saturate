// Tape saturation — simplified machine model: tanh transfer with gentle post HF
// rolloff (playback-head loss). Even/odd blend milder than tube/transistor.
import { shape, onepole } from './shape.js'
import { oversampler, up, down } from './oversample.js'
export { LATENCY, RING } from './oversample.js'

/** The one-pole's coefficient, its pole: higher warmth, a lower cutoff */
export const pole = warmth => 0.35 + 0.45 * warmth

export default function tape (data, { drive = 1.5, warmth = 0.25, fs = 44100, oversample = 4, mix = 1 } = {}) {
	let dry = mix < 1 ? Float32Array.from(data) : null
	let norm = Math.tanh(drive)
	shape(data, x => Math.tanh(drive * x + 0.08 * drive * x * x) / norm, { fs, oversample, mix: 1 })
	onepole(data, pole(warmth))
	if (dry) for (let i = 0; i < data.length; i++) data[i] = dry[i] * (1 - mix) + data[i] * mix
	return data
}

/** State for stream(): calls of up to `maxBlockSize` samples, the oversampler's and the one-pole's */
export function state (maxBlockSize) {
	let s = oversampler(maxBlockSize)
	s.lp = new Float64Array(1)
	return s
}

/**
 * Streaming form, the shaping oversampled 4×: `n` samples of `data` in place, `s` carried from call to call, the
 * output LATENCY samples late. `p` holds drive, warmth and mix as a host gives a processor its values, each a
 * 1-length array, read at each call. `lanes` (optional, a Float64Array): drive and mix for each of the `n` samples,
 * from 0 and from `M`, in place of p's, for values that move within the call (the ./audio processor's glide); a
 * sample's drive shapes its four samples at the higher rate. Without it the call runs on p's alone.
 */
export function stream (data, p, s, n = data.length, lanes, M = 0) {
	let drive = p.drive[0], mix = p.mix[0], norm = Math.tanh(drive), coef = pole(p.warmth[0]), hi = s.hi, dry = s.dry, lp = s.lp[0]
	up(s, data, n)
	if (lanes) for (let i = 0, j = 0; i < n; i++) {
		let d = lanes[i], nm = Math.tanh(d)
		for (let e = j + 4; j < e; j++) { let x = hi[j]; hi[j] = Math.tanh(d * x + 0.08 * d * x * x) / nm }
	}
	else for (let j = 0; j < 4 * n; j++) { let x = hi[j]; hi[j] = Math.tanh(drive * x + 0.08 * drive * x * x) / norm }
	down(s, data, n)
	for (let i = 0; i < n; i++) {
		lp = data[i] = data[i] * (1 - coef) + lp * coef
		let m = lanes ? lanes[M + i] : mix
		if (m < 1) data[i] = dry[i] * (1 - m) + data[i] * m
	}
	s.lp[0] = lp
	return data
}
