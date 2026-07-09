// atom manifest — multiband saturation (LR split → per-band tube drive → flat sum;
// FabFilter Saturn class). streaming: false: the split filters and the oversampled
// transfer both live inside one batch call. Scalar form drives all bands with one
// setting; per-band character takes an array argument — direct-import for that.

import multibandFn from './multiband.js'

export const multisat = (ctx) => (inputs, outputs, params) => {
	const inp = inputs[0], out = outputs[0]
	if (!inp || !inp.length) return
	const opts = {
		fs: ctx.sampleRate,
		freqs: [params.low[0], params.high[0]],
		bands: { drive: params.drive[0], mix: params.mix[0] },
	}
	for (let c = 0; c < inp.length; c++) {
		out[c].set(inp[c])
		multibandFn(out[c], opts)
	}
}
multisat.channels = 'any'
multisat.streaming = false
multisat.params = {
	low:   { type: 'number', min: 40, max: 1000, default: 200, unit: 'Hz', curve: 'log' },
	high:  { type: 'number', min: 1000, max: 12000, default: 2000, unit: 'Hz', curve: 'log' },
	drive: { type: 'number', min: 0.5, max: 10, default: 2 },
	mix:   { type: 'number', min: 0, max: 1, default: 1 },
}
