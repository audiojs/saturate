// atom manifest — tape saturation (tanh + even-harmonic bend + warmth one-pole).
// streaming: false per the family precedent (@audio/saturate-tube/audio): the
// sinc-oversampled transfer needs whole-signal context — per-block oversampling
// would seam at block edges.

import tapeFn from './tape.js'

export const tape = (ctx) => (inputs, outputs, params) => {
	const inp = inputs[0], out = outputs[0]
	if (!inp || !inp.length) return
	for (let c = 0; c < inp.length; c++) {
		out[c].set(inp[c])
		tapeFn(out[c], {
			drive: params.drive[0],
			warmth: params.warmth[0],
			mix: params.mix[0],
			fs: ctx.sampleRate,
		})
	}
}
tape.channels = 'any'
tape.streaming = false
tape.params = {
	drive:  { type: 'number', min: 0.5, max: 10, default: 1.5 },
	warmth: { type: 'number', min: 0, max: 1, default: 0.25 },
	mix:    { type: 'number', min: 0, max: 1, default: 1 },
}
