// audio-module manifest — tube saturation. streaming: false — the sinc-oversampled
// transfer needs whole-signal context (per-block oversampling would seam at edges);
// realtime targets need a streaming polyphase oversampler first.

import tubeFn from './tube.js'

export const tube = (ctx) => (inputs, outputs, params) => {
	const inp = inputs[0], out = outputs[0]
	if (!inp || !inp.length) return
	for (let c = 0; c < inp.length; c++) {
		out[c].set(inp[c])
		tubeFn(out[c], {
			drive: params.drive[0],
			bias: params.bias[0],
			mix: params.mix[0],
			fs: ctx.sampleRate,
			oversample: 4,
		})
	}
}
tube.channels = 'any'
tube.streaming = false
tube.params = {
	drive: { type: 'number', min: 0.5, max: 10, default: 2 },
	bias:  { type: 'number', min: 0, max: 1, default: 0.25 },
	mix:   { type: 'number', min: 0, max: 1, default: 1 },
}
