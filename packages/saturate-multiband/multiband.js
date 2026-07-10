// Multiband saturation — Linkwitz-Riley split, per-band drive/character, flat sum
// (FabFilter Saturn class).
import crossover from '@audio/eq-crossover'
import tube from '@audio/saturate-tube'
import { step, state } from '@audio/biquad'

export default function multiband (data, { freqs = [200, 2000], bands, order = 4, fs = 44100 } = {}) {
	let sos = crossover(freqs, order, fs)
	let out = new Float64Array(data.length)
	for (let b = 0; b < sos.length; b++) {
		let band = Float32Array.from(data)
		for (let sec of sos[b]) {
			let st = state()
			for (let i = 0; i < band.length; i++) band[i] = step(sec, st, band[i])
		}
		let params = Array.isArray(bands) ? bands[b] : bands
		if (params) tube(band, { fs, ...params })
		for (let i = 0; i < out.length; i++) out[i] += band[i]
	}
	for (let i = 0; i < data.length; i++) data[i] = out[i]
	return data
}
