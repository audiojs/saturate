// Multiband saturation — Linkwitz-Riley split, per-band drive/character, flat sum
// (FabFilter Saturn class).
import crossover from '@audio/eq-crossover'
import tube, { stream as tubeStream, state as tubeState } from '@audio/saturate-tube'
import { step, state as section } from '@audio/biquad'
export { LATENCY, RING } from '@audio/saturate-tube'

export default function multiband (data, { freqs = [200, 2000], bands, order = 4, fs = 44100 } = {}) {
	let sos = crossover(freqs, order, fs)
	let out = new Float64Array(data.length)
	for (let b = 0; b < sos.length; b++) {
		let band = Float32Array.from(data)
		for (let sec of sos[b]) {
			let st = section()
			for (let i = 0; i < band.length; i++) band[i] = step(sec, st, band[i])
		}
		let params = Array.isArray(bands) ? bands[b] : bands
		if (params) tube(band, { fs, ...params })
		for (let i = 0; i < out.length; i++) out[i] += band[i]
	}
	for (let i = 0; i < data.length; i++) data[i] = out[i]
	return data
}

/** State for stream() at `fs`: calls of up to `maxBlockSize` samples */
export function state (maxBlockSize, fs = 44100) {
	let bands = []
	for (let b = 0; b < 3; b++) bands.push({
		data: new Float32Array(maxBlockSize), tube: tubeState(maxBlockSize),
		c: new Float64Array(20), z: new Float64Array(8),   // up to four sections: b0 b1 b2 a1 a2 each, two accumulators each
	})
	return { bands, at: Float64Array.of(fs, NaN, NaN) }   // the rate, and the points the coefficients are for
}

/**
 * Streaming form, three bands split at `low` and `high` by the crossover of order 4 (LR4), each through
 * @audio/saturate-tube's stream: `n` samples of `data` in place, `s` carried from call to call, the output LATENCY
 * samples late. `p` holds low, high, drive and mix as a host gives a processor its values, each a 1-length array,
 * read at each call; the crossover is designed again when a point moves. `lanes` (optional): each band's tube values
 * for each of the `n` samples, as @audio/saturate-tube's stream takes them (drive, bias and mix from 0, `M` and 2·`M`),
 * for values that move within the call (the ./audio processor's glide).
 */
export function stream (data, p, s, n = data.length, lanes, M = 0) {
	let at = s.at, B = s.bands
	if (at[1] !== p.low[0] || at[2] !== p.high[0]) {
		at[1] = p.low[0]
		at[2] = p.high[0]
		design(s)
	}
	for (let b = 0; b < B.length; b++) {
		let x = B[b].data, c = B[b].c, z = B[b].z, m = b === 0 || b === B.length - 1 ? 2 : 4
		for (let i = 0; i < n; i++) {
			let v = data[i]
			for (let k = 0; k < m; k++) {
				let y = c[5 * k] * v + z[2 * k]
				z[2 * k] = c[5 * k + 1] * v - c[5 * k + 3] * y + z[2 * k + 1]
				z[2 * k + 1] = c[5 * k + 2] * v - c[5 * k + 4] * y
				v = Math.fround(y)
			}
			x[i] = v
		}
		tubeStream(x, p, B[b].tube, n, lanes, M)
	}
	for (let i = 0; i < n; i++) {
		let v = 0
		for (let b = 0; b < B.length; b++) v += B[b].data[i]
		data[i] = v
	}
	return data
}

// The crossover in place, as @audio/eq-crossover designs it at order 4: a band's high pass at its lower point, then its
// low pass at its upper one
function design (s) {
	let N = s.at.length - 1
	for (let b = 0; b <= N; b++) {
		let c = s.bands[b].c, k = 0
		if (b > 0) k = lr4(c, k, s.at, b, true)
		if (b < N) lr4(c, k, s.at, b + 1, false)
	}
}

// LR4 at the point at[j] into c from k: two equal second-order Butterworth sections, by digital-filter's bilinear
// design (core/transform.js polesSos, its pole at θ = π/4), the same arithmetic; past the rate's edges a section
// passes or silences, as there. Returns where the next section goes
function lr4 (c, k, at, j, hp) {
	let fs = at[0], fc = at[j], b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0
	if (fc <= 0 || fc >= fs / 2) b0 = (hp ? fc <= 0 : fc >= fs / 2) ? 1 : 0
	else {
		let theta = Math.PI * 1 / 4, sigma = -Math.sin(theta), omega = Math.cos(theta)
		let C = 1 / Math.tan(Math.PI * fc / fs), pmag2 = sigma * sigma + omega * omega, bs = -2 * sigma
		if (hp) {
			let B1 = bs / pmag2, B0 = 1 / pmag2, A = C * C + B1 * C + B0
			b0 = C * C / A; b1 = -2 * C * C / A; b2 = C * C / A; a1 = 2 * (B0 - C * C) / A; a2 = (C * C - B1 * C + B0) / A
		} else {
			let A = C * C + bs * C + pmag2
			b0 = pmag2 / A; b1 = 2 * pmag2 / A; b2 = pmag2 / A; a1 = 2 * (pmag2 - C * C) / A; a2 = (C * C - bs * C + pmag2) / A
		}
	}
	for (let r = 0; r < 2; r++, k += 5) { c[k] = b0; c[k + 1] = b1; c[k + 2] = b2; c[k + 3] = a1; c[k + 4] = a2 }
	return k
}
