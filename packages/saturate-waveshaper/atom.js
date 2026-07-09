// atom manifest — normalized-tanh waveshaper (custom curve fn = direct import).
// streaming: false per the family precedent (@audio/saturate-tube/atom): the
// sinc-oversampled transfer needs whole-signal context — per-block oversampling
// would seam at block edges.

import waveshaperFn from './waveshaper.js'

export const waveshaper = (ctx) => (inputs, outputs, params) => {
	const inp = inputs[0], out = outputs[0]
	if (!inp || !inp.length) return
	for (let c = 0; c < inp.length; c++) {
		out[c].set(inp[c])
		waveshaperFn(out[c], {
			drive: params.drive[0],
			mix: params.mix[0],
			fs: ctx.sampleRate,
		})
	}
}
waveshaper.channels = 'any'
waveshaper.streaming = false
waveshaper.params = {
	drive: { type: 'number', min: 0.5, max: 10, default: 2 },
	mix:   { type: 'number', min: 0, max: 1, default: 1 },
}
