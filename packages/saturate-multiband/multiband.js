// Multiband saturation — Linkwitz-Riley split, per-band drive/character, flat sum
// (FabFilter Saturn class).
import crossover from '@audio/eq-crossover'
import tube from '@audio/saturate-tube'

export default function multiband (data, { freqs = [200, 2000], bands, order = 4, fs = 44100 } = {}) {
	let sos = crossover(freqs, order, fs)
	let out = new Float64Array(data.length)
	for (let b = 0; b < sos.length; b++) {
		let band = Float32Array.from(data)
		for (let sec of sos[b]) {
			let x1 = 0, x2 = 0, y1 = 0, y2 = 0
			for (let i = 0; i < band.length; i++) {
				let x = band[i]
				let y = sec.b0 * x + sec.b1 * x1 + sec.b2 * x2 - sec.a1 * y1 - sec.a2 * y2
				x2 = x1; x1 = x; y2 = y1; y1 = band[i] = y
			}
		}
		let params = Array.isArray(bands) ? bands[b] : bands
		if (params) tube(band, { fs, ...params })
		for (let i = 0; i < out.length; i++) out[i] += band[i]
	}
	for (let i = 0; i < data.length; i++) data[i] = out[i]
	return data
}
