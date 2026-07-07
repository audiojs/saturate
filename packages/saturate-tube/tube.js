// Tube/valve saturation — asymmetric transfer (biased tanh, DC-compensated):
// asymmetry generates even harmonics — the "warm" 2nd-harmonic tube signature.
import { shape } from '@audio/saturate-core'

export default function tube (data, { drive = 2, bias = 0.25, fs = 44100, oversample = 4, mix = 1 } = {}) {
	let norm = Math.tanh(drive * (1 + Math.abs(bias)))
	let dc = Math.tanh(drive * bias) / norm
	let fn = x => Math.tanh(drive * (x + bias)) / norm - dc
	return shape(data, fn, { fs, oversample, mix })
}
