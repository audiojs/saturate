// atom manifest — multiband saturation (LR split → per-band tube drive → flat sum;
// FabFilter Saturn class). Streaming: the crossover keeps its state and each band's 4×
// oversampler carries its input from call to call, so the output is LATENCY samples late.
// low, high, drive and mix are live: the crossover is designed again when a point moves.
// Scalar form drives all bands with one setting; per-band character takes an array
// argument — direct-import for that.
// drive and mix scale each band with nothing behind them, so each is smoothed (20 ms) and
// glided sample by sample (glide, below): a host's ramp of it is one line, however the host
// cut its calls; held, the kernel runs on the value as it ran. low and high retune the
// crossover, its state kept: smoothed, each call of a host's ramp retunes it a step.
// mix blends each band's tube with that band's own input, so at mix 0 the output is the
// crossover's sum, not the input delayed: a dry path through the same crossover keeps the
// phase of the wet bands, so a partial mix does not comb (with the input delayed as the dry
// path, mix 0.5 at drive 0.5 would notch 26 dB at a 2 kHz point). The sum is flat with the
// points far apart (within 0.12 dB a decade apart, as at their defaults) and dips where the
// low and high bands overlap as the points come closer: 8 dB an octave apart.

import crossover from '@audio/eq-crossover'
import { step, state as section } from '@audio/biquad'
import { stream, state, LATENCY, RING } from './multiband.js'

export const multisat = (ctx) => {
	const st = [], M = ctx.maxBlockSize, g = new Float64Array(2 * GLIDE).fill(NaN), lanes = new Float64Array(3 * M)
	lanes.fill(0.25, M, 2 * M)   // each band's tube at its bias of 0.25, as the whole call drives it
	for (let c = 0; c < ctx.maxChannels; c++) st.push(state(M, ctx.sampleRate))
	return (inputs, outputs, params) => {
		const inp = inputs[0], out = outputs[0]
		if (!inp || !inp.length) return
		const n = inp[0].length, moving = glide(g, 0, params.drive, lanes, 0, n, 0) | glide(g, 1, params.mix, lanes, 2 * M, n, 0)
		for (let c = 0; c < inp.length; c++) {
			out[c].set(inp[c])
			stream(out[c], params, st[c], n, moving ? lanes : undefined, M)
		}
	}
}
multisat.channels = 'any'
multisat.latency = LATENCY
// a section's slower pole: the larger root of z² + a1·z + a2
const radius = ({ a1, a2 }) => { let d = a1 * a1 - 4 * a2; return d < 0 ? Math.sqrt(a2) : (Math.abs(a1) + Math.sqrt(d)) / 2 }
// How long the crossover rings, then the decimator's RING. A pole of radius r alone falls 60 dB in ln(1000) / -ln(r)
// samples (J. O. Smith, Introduction to Digital Filters, https://ccrma.stanford.edu/~jos/filters/: its response is
// r^n), but LR4's poles are double, (n + 1)·r^n, which takes half as long again, and the middle band's two pairs come
// together as low and high do. So each band's impulse response is run out, to 24 time constants -1 / ln(r) of the
// slowest pole (over the ranges at 8 to 192 kHz the ring ends within 16.1, with low and high both at 1000 Hz), and
// the last sample above 1/1000 of its peak taken
multisat.tail = ({ sampleRate, params }) => {
	let sos = crossover([params.low[0], params.high[0]], 4, sampleRate), N = 0, ring = 0
	for (let c of sos.flat()) N = Math.max(N, Math.ceil(-24 / Math.log(radius(c))))
	for (let band of sos) {
		let z = band.map(() => section()), peak = 0
		for (let i = 0; i < N; i++) {
			let y = i ? 0 : 1
			for (let k = 0; k < band.length; k++) y = step(band[k], z[k], y)
			peak = Math.max(peak, Math.abs(y))
			if (Math.abs(y) > 1e-3 * peak) ring = Math.max(ring, i)
		}
	}
	return (ring + RING) / sampleRate
}
multisat.params = {
	low:   { type: 'number', min: 40, max: 1000, default: 200, unit: 'Hz', curve: 'log', smoothing: 0.02 },
	high:  { type: 'number', min: 1000, max: 12000, default: 2000, unit: 'Hz', curve: 'log', smoothing: 0.02 },
	drive: { type: 'number', min: 0.5, max: 10, default: 2, smoothing: 0.02 },
	mix:   { type: 'number', min: 0, max: 1, default: 1, smoothing: 0.02 },
}

// A value that scales the signal, glided sample by sample so that a host's steps of it join into one line: the dynamics
// family's helper, copied (families share no code), one text in each manifest here that glides. A host hands each call
// the value at its first frame and, while a value moves (a `smoothing` ramp), calls with 32 frames at most (contract
// 1.0: Parameters, Time; What a host owes, 3). So the line through the values the calls bring, each at its call's first
// frame, is known 32 frames behind any call's first frame, however the host cut the calls; the glide plays it 32 frames
// late: the host's ramp itself, the same whether the host calls with 1, 32 or a mix of frames. A value that follows a
// call of more than 32 frames came with no ramp: it is reached in a straight line over 32 frames. The first call of an
// instance starts on its value, and a value held 32 frames is the value itself, so a value that does not move is bit
// for bit what it was before the glide existed.
// `g`: the memory, GLIDE slots a value from j·GLIDE (made NaN): the value the last call brought, where in the ring its
// first frame is, its frames, the frames the line had been at that value before it (64 once held and the ring all of
// it; counted to 63 at most, so that a long call after a move cannot reach 64 before the ring is made all of it), how
// many of `row`'s hold it, then the line, a frame a slot, in a ring of 64. `src`: the param's array. The line's values
// for this call's `n` frames go to `row` from `at`: as they are, or with `lin` 1 the gain e^(v·ln10/20) of a value in
// dB. Returns 1 while they move, 0 when every one is the value (then `row` holds it, filled once, and a caller may run
// its kernel on the value alone). Only arrays and whole numbers cross the call.
const GLIDE = 69
function glide (g, j, src, row, at, n, lin) {
	let o = j * GLIDE, r = o + 5, v = src[0], was = g[o]
	if (!(was === was)) { g[o] = v; g[o + 1] = 0; g[o + 2] = n; g[o + 3] = 0; g[o + 4] = 0 }
	else if (v !== was || g[o + 3] < 64) {
		let len = g[o + 2], L = len < 32 ? len : 32, w = (g[o + 1] + len) & 63, d = v - was, held = v === was ? Math.min(g[o + 3] + len, 63) : 0
		for (let q = 0; q < L; q++) g[r + ((w - L + q) & 63)] = was + d * q / L
		g[r + w] = v
		g[o] = v; g[o + 1] = w; g[o + 2] = n; g[o + 3] = held; g[o + 4] = 0
		if (held < 32) {
			for (let i = 0; i < n; i++) {
				let u = i < 32 ? g[r + ((w + i - 32) & 63)] : v
				row[at + i] = lin ? Math.exp(u * (Math.LN10 / 20)) : u
			}
			return 1
		}
	} else { g[o + 1] = (g[o + 1] + g[o + 2]) & 63; g[o + 2] = n }
	// held 32 frames: the ring made all of the value once (a move from it reads the line from there), the row filled
	// with it as far as no call since it was held has filled it; from then on a call only moves the ring's position
	if (g[o + 3] < 64) { for (let q = 0; q < 64; q++) g[r + q] = v; g[o + 3] = 64 }
	if (g[o + 4] < n) {
		let u = lin ? Math.exp(v * (Math.LN10 / 20)) : v
		for (let i = 0; i < n; i++) row[at + i] = u
		g[o + 4] = n
	}
	return 0
}
