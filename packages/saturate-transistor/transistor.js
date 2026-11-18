// Transistor/console saturation — odd-symmetric cubic soft clip:
// pure odd harmonics (3rd-dominant), the solid-state/console color.
import { shape } from './shape.js'
import { oversampler, up, down } from '@audio/resample-sinc'

// @audio/resample-sinc's 4× oversampler, on the arithmetic of shape()'s resampling: LATENCY, the samples the streaming
// form's output is late (the whole call reads that far ahead), and RING, the samples it moves past that once the input
// stops (for a transfer that takes 0 to 0)
export const { latency: LATENCY, ring: RING } = oversampler(4, 0)

export default function transistor (data, { drive = 2, fs = 44100, oversample = 4, mix = 1 } = {}) {
	let fn = x => {
		let v = drive * x
		let y = v >= 1 ? 2 / 3 : v <= -1 ? -2 / 3 : v - v * v * v / 3
		return y * 1.5 / Math.max(1, drive * 0.75)
	}
	return shape(data, fn, { fs, oversample, mix })
}

/** State for stream(): calls of up to `maxBlockSize` samples */
export const state = maxBlockSize => oversampler(4, maxBlockSize)

/**
 * Streaming form, oversampled 4×: `n` samples of `data` in place, `s` carried from call to call, the output LATENCY
 * samples late. `p` holds drive and mix as a host gives a processor its values, each a 1-length array, read at
 * each call. `lanes` (optional, a Float64Array): drive and mix for each of the `n` samples, from 0 and from `M`, in
 * place of p's, for values that move within the call (the ./audio processor's glide); a sample's drive shapes its four
 * samples at the higher rate. Without it the call runs on p's alone.
 */
export function stream (data, p, s, n = data.length, lanes, M = 0) {
	let drive = p.drive[0], mix = p.mix[0], g = Math.max(1, drive * 0.75), hi = s.hi, dry = s.dry
	up(s, data, n)
	if (lanes) for (let i = 0, j = 0; i < n; i++) {
		let d = lanes[i], k = Math.max(1, d * 0.75)
		for (let e = j + 4; j < e; j++) {
			let v = d * hi[j]
			let y = v >= 1 ? 2 / 3 : v <= -1 ? -2 / 3 : v - v * v * v / 3
			hi[j] = y * 1.5 / k
		}
	}
	else for (let j = 0; j < 4 * n; j++) {
		let v = drive * hi[j]
		let y = v >= 1 ? 2 / 3 : v <= -1 ? -2 / 3 : v - v * v * v / 3
		hi[j] = y * 1.5 / g
	}
	down(s, data, n)
	if (lanes) for (let i = 0; i < n; i++) data[i] = dry[i] * (1 - lanes[M + i]) + data[i] * lanes[M + i]
	else for (let i = 0; i < n; i++) data[i] = dry[i] * (1 - mix) + data[i] * mix
	return data
}
