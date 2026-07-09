// Tape saturation — simplified machine model: tanh transfer with gentle post HF
// rolloff (playback-head loss). Even/odd blend milder than tube/transistor.
import { shape, onepole } from './shape.js'

export default function tape (data, { drive = 1.5, warmth = 0.25, fs = 44100, oversample = 4, mix = 1 } = {}) {
	let dry = mix < 1 ? Float32Array.from(data) : null
	let norm = Math.tanh(drive)
	shape(data, x => Math.tanh(drive * x + 0.08 * drive * x * x) / norm, { fs, oversample, mix: 1 })
	onepole(data, 0.35 + 0.45 * warmth)
	if (dry) for (let i = 0; i < data.length; i++) data[i] = dry[i] * (1 - mix) + data[i] * mix
	return data
}
