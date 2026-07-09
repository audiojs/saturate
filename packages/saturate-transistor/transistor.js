// Transistor/console saturation — odd-symmetric cubic soft clip:
// pure odd harmonics (3rd-dominant), the solid-state/console color.
import { shape } from './shape.js'

export default function transistor (data, { drive = 2, fs = 44100, oversample = 4, mix = 1 } = {}) {
	let fn = x => {
		let v = drive * x
		let y = v >= 1 ? 2 / 3 : v <= -1 ? -2 / 3 : v - v * v * v / 3
		return y * 1.5 / Math.max(1, drive * 0.75)
	}
	return shape(data, fn, { fs, oversample, mix })
}
