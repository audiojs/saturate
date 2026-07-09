// atom manifest — transistor saturation (soft-clip cubic transfer, fuzz-face class).
// streaming: false per the family precedent (@audio/saturate-tube/atom): the
// sinc-oversampled transfer needs whole-signal context — per-block oversampling
// would seam at block edges.

import transistorFn from './transistor.js'

export const transistor = (ctx) => (inputs, outputs, params) => {
	const inp = inputs[0], out = outputs[0]
	if (!inp || !inp.length) return
	for (let c = 0; c < inp.length; c++) {
		out[c].set(inp[c])
		transistorFn(out[c], {
			drive: params.drive[0],
			mix: params.mix[0],
			fs: ctx.sampleRate,
		})
	}
}
transistor.channels = 'any'
transistor.streaming = false
transistor.params = {
	drive: { type: 'number', min: 0.5, max: 10, default: 2 },
	mix:   { type: 'number', min: 0, max: 1, default: 1 },
}
