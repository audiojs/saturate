// Waveshaper — normalized tanh (default) or custom transfer curve, oversampled.
import { shape } from './shape.js'

export default function waveshaper (data, { drive = 2, curve, fs = 44100, oversample = 4, mix = 1 } = {}) {
	let norm = Math.tanh(drive)
	let fn = curve || (x => Math.tanh(drive * x) / norm)
	return shape(data, fn, { fs, oversample, mix })
}
