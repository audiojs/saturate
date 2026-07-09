// Oversampled nonlinearity application (inlined family convention).
// Upsample (windowed-sinc) → per-sample transfer → decimate (windowed-sinc, anti-aliased),
// so waveshaping harmonics above Nyquist don't fold back as aliases.

import resample from '@audio/resample-sinc'

/**
 * Apply a memoryless transfer function with oversampling, in place.
 * @param {Float32Array} data
 * @param {(x:number)=>number} fn — transfer curve
 * @param {object} opts — { fs=44100, oversample=4 (1 disables), mix=1 }
 */
export function shape (data, fn, { fs = 44100, oversample = 4, mix = 1 } = {}) {
	if (oversample > 1) {
		let up = resample(data, { from: fs, to: fs * oversample })
		for (let i = 0; i < up.length; i++) up[i] = fn(up[i])
		let down = resample(up, { from: fs * oversample, to: fs })
		let n = Math.min(data.length, down.length)
		for (let i = 0; i < n; i++) data[i] = data[i] * (1 - mix) + down[i] * mix
	} else {
		for (let i = 0; i < data.length; i++) data[i] = data[i] * (1 - mix) + fn(data[i]) * mix
	}
	return data
}

/** one-pole lowpass in place (post-shaping tone rounding) */
export function onepole (data, coef) {
	let s = 0
	for (let i = 0; i < data.length; i++) s = data[i] = data[i] * (1 - coef) + s * coef
	return data
}
