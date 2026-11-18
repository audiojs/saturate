import test, { almost, ok, is } from 'tst'
import { readFileSync } from 'node:fs'
import { waveshaper, tube, transistor, tape, multiband } from './index.js'
import { tube as tubeAtom } from '@audio/saturate-tube/audio'
import { transistor as transistorAtom } from '@audio/saturate-transistor/audio'
import { waveshaper as waveshaperAtom } from '@audio/saturate-waveshaper/audio'
import { tape as tapeAtom } from '@audio/saturate-tape/audio'
import { multisat } from '@audio/saturate-multiband/audio'
import { pole } from '@audio/saturate-tape'
import crossover from '@audio/eq-crossover'

const fs = 44100

function sine (freq, n = fs, amp = 0.7, sr = fs) {
	let d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = amp * Math.sin(2 * Math.PI * freq * i / sr)
	return d
}
function goertzel (d, freq, sr = fs, from = 2048, to = d.length - 2048) {
	let w = 2 * Math.PI * freq / sr, cw = Math.cos(w)
	let s1 = 0, s2 = 0
	for (let i = from; i < to; i++) { let s0 = d[i] + 2 * cw * s1 - s2; s2 = s1; s1 = s0 }
	return Math.sqrt(Math.max(0, s1 * s1 + s2 * s2 - 2 * cw * s1 * s2)) / (to - from)
}

test('waveshaper — adds odd harmonics; mix=0 passthrough; bounded', () => {
	let d = sine(1000)
	waveshaper(d, { drive: 4, fs })
	ok(d.every(isFinite))
	ok(goertzel(d, 3000) > goertzel(d, 3000 - 137) * 5, '3rd harmonic present')
	let e = sine(1000), ref = Float32Array.from(e)
	waveshaper(e, { drive: 4, mix: 0, fs })
	let err = 0
	for (let i = 0; i < e.length; i++) err = Math.max(err, Math.abs(e[i] - ref[i]))
	ok(err < 1e-6, 'mix=0 untouched')
})

test('oversampling suppresses aliasing (10 kHz through hard drive)', () => {
	// 3rd harmonic of 10 kHz = 30 kHz → aliases to 14.1 kHz at 44.1k without oversampling
	let naive = sine(10000), os = sine(10000)
	waveshaper(naive, { drive: 6, oversample: 1, fs })
	waveshaper(os, { drive: 6, oversample: 4, fs })
	let aliasNaive = goertzel(naive, 44100 - 30000)
	let aliasOs = goertzel(os, 44100 - 30000)
	ok(aliasOs < aliasNaive * 0.15, `alias −${(20 * Math.log10(aliasNaive / aliasOs)).toFixed(1)} dB vs naive`)
})

test('tube is even-dominant, transistor odd-dominant', () => {
	let tb = sine(440), tr = sine(440)
	tube(tb, { drive: 3, fs })
	transistor(tr, { drive: 3, fs })
	ok(tb.every(isFinite) && tr.every(isFinite))
	let tbEven = goertzel(tb, 880), tbOdd = goertzel(tb, 1320)
	let trEven = goertzel(tr, 880), trOdd = goertzel(tr, 1320)
	ok(tbEven > trEven * 5, 'tube 2nd harmonic ≫ transistor 2nd')
	ok(trOdd > trEven * 5, 'transistor is odd-dominant')
	ok(tbEven > tbOdd * 0.2, 'tube has substantial even content')
})

test('tape — harmonics present, HF rolled off relative to LF', () => {
	let lo = sine(500), hi = sine(8000)
	let lo0 = goertzel(lo, 500), hi0 = goertzel(hi, 8000)
	tape(lo, { fs }); tape(hi, { fs })
	let loDb = 20 * Math.log10(goertzel(lo, 500) / lo0)
	let hiDb = 20 * Math.log10(goertzel(hi, 8000) / hi0)
	ok(hiDb < loDb - 3, `HF rolloff (${(loDb - hiDb).toFixed(1)} dB more loss at 8k)`)
	ok(lo.every(isFinite) && hi.every(isFinite))
})

test('multiband — drives only the targeted band', () => {
	let n = fs
	let d = new Float32Array(n)
	for (let i = 0; i < n; i++) d[i] = 0.35 * Math.sin(2 * Math.PI * 150 * i / fs) + 0.35 * Math.sin(2 * Math.PI * 5000 * i / fs)
	multiband(d, { freqs: [1000], fs, bands: [null, { drive: 5 }] })
	ok(d.every(isFinite))
	// harmonics of the driven 5 kHz band appear; the low band stays clean
	ok(goertzel(d, 10000) > goertzel(d, 300) * 2, 'driven band generates harmonics')
	almost(goertzel(d, 150) / 0.175, 1, 0.15, 'low band level preserved')
})

// seeded noise, with `pad` zeros on each side
function noise (n, seed = 1, pad = 0) {
	let d = new Float32Array(n + 2 * pad)
	for (let i = pad; i < pad + n; i++) d[i] = 0.5 * ((seed = (seed * 16807) % 2147483647) / 2147483647 * 2 - 1)
	return d
}
let seed = 3
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
// a manifest as a host runs it: a stub ctx, the channels in calls of `block` frames, each value a 1-length array;
// `at` moves the values to `then` from that frame on
function run (atom, x, { sr = fs, block = x[0].length, set = {}, at = Infinity, then = {} } = {}) {
	let value = (k, s) => Float32Array.of(s[k] ?? set[k] ?? atom.params[k].default), params = {}, later = {}
	for (let k in atom.params) params[k] = value(k, set), later[k] = value(k, then)
	let out = x.map(c => new Float32Array(c.length))
	let proc = atom({ sampleRate: sr, maxBlockSize: block, maxChannels: x.length, params })
	for (let i = 0, n; i < x[0].length; i += n) {
		n = Math.min(block, x[0].length - i, i < at ? at - i : block)
		proc([x.map(c => c.subarray(i, i + n))], [out.map(c => c.subarray(i, i + n))], i < at ? params : later)
	}
	return out
}
// each manifest with its kernel's whole call, as the manifest made it before it streamed
const WHOLE = [
	[tubeAtom, (d, p, sr) => tube(d, { drive: p.drive, bias: p.bias, mix: p.mix, fs: sr, oversample: 4 })],
	[transistorAtom, (d, p, sr) => transistor(d, { drive: p.drive, mix: p.mix, fs: sr })],
	[waveshaperAtom, (d, p, sr) => waveshaper(d, { drive: p.drive, mix: p.mix, fs: sr })],
	[tapeAtom, (d, p, sr) => tape(d, { drive: p.drive, warmth: p.warmth, mix: p.mix, fs: sr })],
	[multisat, (d, p, sr) => multiband(d, { fs: sr, freqs: [p.low, p.high], bands: { drive: p.drive, mix: p.mix } })],
]

test('streaming: each manifest is its kernel\'s whole call LATENCY samples late, bit for bit, in calls of any size', () => {
	// The whole call reads 20 samples ahead of each output, which a stream cannot: it is that late instead
	// (oversample.js). 64 zeros on each side keep the whole call's ends, where resample() divides by the taps it has,
	// off the signal; multisat's crossover rings into the zeros at the end, so its last 20 samples are left out. At
	// 16 kHz multisat's high point is past Nyquist, where a section passes or silences as eq-crossover's does
	for (let [atom, kernel] of WHOLE) {
		let L = atom.latency ?? 0, cut = atom === multisat ? 20 : 0, diff = 0
		for (let [k, sr] of [44100, 48000, 96000, 22050, 16000].entries()) {
			let set = {}
			for (let [name, s] of Object.entries(atom.params)) set[name] = Math.fround(k && k < 4 ? s.min + (s.max - s.min) * rand() : s.default)
			if (k === 4 && atom === multisat) set.high = 12000
			let x = [noise(2000, 2 * k + 1, 64), noise(2000, 2 * k + 2, 64)]
			let ref = x.map(c => kernel(Float32Array.from(c), set, sr))
			let src = x.map(c => { let d = new Float32Array(c.length + L); d.set(c); return d })
			for (let block of [1, 64, 127, 128, 1024]) {
				let y = run(atom, src, { sr, block, set })
				for (let c = 0; c < 2; c++) for (let i = 0; i < ref[c].length - cut; i++) if (!Object.is(y[c][i + L], ref[c][i])) diff++
			}
		}
		is(diff, 0, `${atom.name}: samples that differ`)
	}
})

test('streaming: an impulse moves the output no sooner than it enters, and last LATENCY + RING samples on', () => {
	// the decimator reaches 20 samples ahead and 19 back (oversample.js): once the input stops (at 101), the output
	// moves 19 samples past the latency, which the tail declares. (The sinc's zero crossings are not exactly 0 in
	// floating point, so where the output first moves depends on the transfer: never before the impulse)
	for (let atom of [tubeAtom, transistorAtom, waveshaperAtom]) {
		let x = new Float32Array(256), first = -1, last = -1
		x[100] = 0.5
		let y = run(atom, [x])[0], ring = atom.tail({ sampleRate: fs }) * fs
		for (let i = 0; i < y.length; i++) if (y[i] !== 0) { if (first < 0) first = i; last = i }
		ok(first >= 100, `${atom.name}: moves at ${first}, the impulse enters at 100`)
		is(last, 100 + atom.latency + ring, `${atom.name}: last moves LATENCY + ${ring} samples on`)
	}
})

test('tails: 60 dB below a noise burst within latency + tail, at the extremes of the ranges', () => {
	// the validator's measure: RMS over 64 frames of what the burst left, against 1/1000 of the burst's RMS
	let cases = [
		[tapeAtom, {}], [tapeAtom, { warmth: 1 }], [tapeAtom, { warmth: 0, drive: 10 }],
		[multisat, {}], [multisat, { low: 1000, high: 1000 }], [multisat, { low: 40, high: 12000, drive: 10 }],
		[multisat, { low: 40, high: 1000, mix: 0.5 }],
	]
	for (let sr of [44100, 96000]) for (let [atom, set] of cases) {
		let params = {}
		for (let k in atom.params) params[k] = Float32Array.of(set[k] ?? atom.params[k].default)
		let B = 4096, T = atom.tail({ sampleRate: sr, params }), end = B + atom.latency + Math.ceil(T * sr)
		let x = [noise(B, 5, 0), noise(B, 6, 0)].map(c => { let d = new Float32Array(end + 4096); d.set(c); return d })
		let y = run(atom, x, { sr, set, block: 128 }), floor = 1e-3 * Math.sqrt(x[0].subarray(0, B).reduce((s, v) => s + v * v, 0) / B), loud = 0
		for (let c = 0; c < 2; c++) for (let i = end; i + 64 <= y[c].length; i += 64) {
			let e = 0
			for (let j = i; j < i + 64; j++) e += y[c][j] * y[c][j]
			if (Math.sqrt(e / 64) > floor) loud++
		}
		is(loud, 0, `${atom.name} ${JSON.stringify(set)} at ${sr} Hz: windows above -60 dB past ${(T * 1000).toFixed(1)} ms`)
	}
})

test('live: a drive that jumps is glided over 32 samples, then in force 8 samples later, bit for bit', () => {
	// A value that jumps (no ramp, the call before it longer than 32 frames) is reached in a straight line over 32 samples
	// from the call that brings it (glide, in each audio.js): its first sample is still the old value. The oversampler
	// keeps the input as it came and 31 shaped samples at 4× the rate, 8 input samples' worth: so the output is the old
	// render through the call's first sample and the next (the decimator's newest tap, a zero of the sinc, weighs the
	// first glided sample by 1e-17), neither render from there, and the new render from 32 + 8 samples on
	for (let atom of [tubeAtom, transistorAtom, waveshaperAtom]) {
		let x = [noise(4096, 9)], C = 1500
		let a = run(atom, x, { block: 128, set: { drive: 2 } })[0], b = run(atom, x, { block: 128, set: { drive: 7.5 } })[0]
		let y = run(atom, x, { block: 128, set: { drive: 2 }, at: C, then: { drive: 7.5 } })[0], before = 0, between = 0, after = 0
		for (let i = 0; i <= C + 1; i++) if (y[i] !== a[i]) before++
		for (let i = C + 2; i < C + 40; i++) if (y[i] !== a[i] && y[i] !== b[i]) between++
		for (let i = C + 40; i < y.length; i++) if (y[i] !== b[i]) after++
		is(before, 0, `${atom.name}: drive 2 through the sample after the change`)
		is(between, 38, `${atom.name}: neither render over the 38 samples from there`)
		is(after, 0, `${atom.name}: drive 7.5 from 40 samples after it`)
	}
	// tape's one-pole and multisat's crossover keep their state across the change: there it shows from the change on
	for (let [atom, set, then] of [[tapeAtom, { warmth: 0.2 }, { warmth: 0.9 }], [multisat, { low: 200 }, { low: 600 }]]) {
		let x = [noise(4096, 11)], C = 1500
		let a = run(atom, x, { block: 128, set })[0], y = run(atom, x, { block: 128, set, at: C, then })[0], before = 0, after = 0
		for (let i = 0; i < C; i++) if (y[i] !== a[i]) before++
		for (let i = C; i < C + 256; i++) if (y[i] !== a[i]) after++
		ok(before === 0 && after > 200, `${atom.name}: ${JSON.stringify(set)} until the change, ${JSON.stringify(then)} after (${after} of 256 differ)`)
	}
})

test('the streaming oversampler is one text in every package that keeps a copy', () => {
	let copies = ['tape', 'transistor', 'tube', 'waveshaper'].map(p => readFileSync(new URL(`./packages/saturate-${p}/oversample.js`, import.meta.url), 'utf8'))
	ok(copies.every(t => t === copies[0]), 'saturate-tape, -transistor, -tube and -waveshaper')
})


// --- live values, moved by a host (contract 1.0: Parameters, `smoothing`; What a host owes, 3) ---

const ATOMS = { tube: tubeAtom, transistor: transistorAtom, waveshaper: waveshaperAtom, tape: tapeAtom, multisat }
const values = (m, set = {}) => Object.fromEntries(Object.keys(m.params).map(k => [k, Float32Array.of(set[k] ?? m.params[k].default)]))
// A host as contract 1.0 asks one to be: `params` from the start; at frame `at` the values `to`, each with `smoothing`
// reached by a linear ramp of that many seconds from the value in force (`ramp: false`: a jump); the call split at
// `at`, no call longer than 32 frames while a value moves, each call handed the values at its first frame as float32.
// audio's toStream hands a call the same. Otherwise calls of `block` frames, or of what `cut()` gives (1 to `block`)
function hosted (m, x, { params = {}, at = Infinity, to = {}, block = 128, cut, ramp = true, sampleRate = fs } = {}) {
	let n = x[0].length, live = values(m, params), out = x.map(() => new Float32Array(n)), len = {}
	let proc = m({ sampleRate, maxBlockSize: block, maxChannels: x.length, params: values(m, params) })
	for (let p in to) len[p] = ramp && m.params[p].smoothing > 0 ? Math.max(1, Math.round(m.params[p].smoothing * sampleRate)) : 0
	for (let i = 0, k; i < n; i += k) {
		k = Math.min(n - i, cut ? cut() : block)
		if (i < at && i + k > at) k = at - i
		for (let p in to) {
			let d = i - at, from = params[p] ?? m.params[p].default
			if (d < 0) continue
			if (d < len[p]) { live[p] = Float32Array.of(to[p] + (from - to[p]) * (1 - d / len[p])); k = Math.min(k, 32, at + len[p] - i) }
			else live[p] = Float32Array.of(to[p])
		}
		proc([x.map(c => c.subarray(i, i + k))], [out.map(c => c.subarray(i, i + k))], live)
	}
	return out
}
// the largest |second difference| of y over [a, b); the largest of |w[n+1] − w[n−1]| and |w[n]| there; the peak
const d2max = (y, a, b) => { let m = 0; for (let i = Math.max(1, a); i < Math.min(y.length - 1, b); i++) m = Math.max(m, Math.abs(y[i + 1] - 2 * y[i] + y[i - 1])); return m }
const turnOf = (w, a, b) => { let m = 0; for (let i = Math.max(1, a); i < Math.min(w.length - 1, b); i++) m = Math.max(m, Math.abs(w[i + 1] - w[i - 1]), Math.abs(w[i])); return m }
const peakOf = (y, a, b) => { let m = 0; for (let i = a; i < b; i++) m = Math.max(m, Math.abs(y[i])); return m }
const tone = (f, A, n) => Float32Array.from({ length: n }, (_, i) => A * Math.sin(2 * Math.PI * f * i / fs))

test('manifests: a value that scales the signal is glided: a host\'s ramp of it is one line, the same whatever the calls, the value itself after it', () => {
	// A host ramps a jump over the param's `smoothing` (0.02 s: N = 882 frames) in calls of 32 frames; the change on the
	// 128-frame grid and inside a call. The measure: the largest |second difference| from 4 samples before the change to
	// 4096 after, over the larger of the unchanged render's there and the changed one's 2048 before it. Derived, for an
	// output m·w plus a part the value leaves alone, m moving along a straight line of slope s from one frame to the next:
	// d2(m·w)[n] = m[n]·d2w[n] + (m[n+1] − m[n])·w[n+1] + (m[n−1] − m[n])·w[n−1], the first at most the larger steady
	// render's |d2| (linear in m, so largest at an end of the line), the rest s·|w[n+1] − w[n−1]| along it and s·|w[n ± 1]|
	// at a corner: measure ≤ steady + s·turn(w)/ref.
	// mix: y = dry + m·(wet − dry), dry and wet the renders at mix 0 and 1, s = |Δmix|/N; plus four float32 roundings of y.
	// drive and bias, at −60 dBFS where each curve is its slope at 0, a gain G of the value (each formula below is the
	// derivative of the curve its kernel draws, at 0): m = G(value)/G(from), w the unchanged render, s the largest step
	// of m between two frames of the host's line; margin 1.1 for what of the curve is not its slope at that level, and
	// tape's one-pole after the curve (it passes 220 Hz and 1 kHz at 0.984 at least at warmth 0.25).
	// From the glide's end (the ramp's N frames, then 32: it plays the host's line 32 frames late), the render at the new
	// value, bit for bit: mix at once, a curve's value after the oversampler's 8 samples; tape's drive feeds its one-pole,
	// which keeps the difference. Before the glide each was one step of the whole change (×31 to ×468 at 220 Hz)
	let n = fs * 3 / 4, N = Math.round(0.02 * fs), seed = 9, u = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296
	let tubeG = (d, b) => d / Math.cosh(d * b) ** 2 / Math.tanh(d * (1 + Math.abs(b)))
	const ROWS = [
		// processor, the change, the gain's law (or 'mix'), frames past the line before the render at the new value
		['tube', { drive: 7.625 }, s => tubeG(s.drive, s.bias), 8], ['tube', { bias: 0.75 }, s => tubeG(s.drive, s.bias), 8], ['tube', { mix: 0.75 }, 'mix', 0],
		['transistor', { drive: 7.625 }, s => s.drive * 1.5 / Math.max(1, s.drive * 0.75), 8], ['transistor', { mix: 0.75 }, 'mix', 0],
		['waveshaper', { drive: 7.625 }, s => s.drive / Math.tanh(s.drive), 8], ['waveshaper', { mix: 0.75 }, 'mix', 0],
		['tape', { drive: 7.625 }, s => s.drive / Math.tanh(s.drive), null], ['tape', { mix: 0.75 }, 'mix', 0],
		['multisat', { drive: 7.625 }, s => tubeG(s.drive, 0.25), 8], ['multisat', { mix: 0.75 }, 'mix', 0],
	]
	for (let [name, to, law, settle] of ROWS) for (let f of [220, 1000]) for (let at of [22016, 22063]) {
		let m = ATOMS[name], k = Object.keys(to)[0], base = { [k]: k === 'mix' ? 0.25 : k === 'bias' ? 0.25 : 2.875 }, label = `${name}.${k} ${base[k]} → ${to[k]}, ${f} Hz, at ${at}`
		let x = [tone(f, law === 'mix' ? 0.5 : 1e-3, n)], w0 = at - 4, w1 = at + 4096
		let a = hosted(m, x, { params: base })[0], b = hosted(m, x, { params: base, at, to })[0], c = hosted(m, x, { params: { ...base, ...to } })[0]
		let ref = Math.max(d2max(a, w0, w1), d2max(b, at - 2048, at - 4)), measure = d2max(b, w0, w1) / ref
		let steady = Math.max(d2max(a, w0, w1), d2max(c, w0, w1)) / ref, bound
		if (law === 'mix') {
			let dry = hosted(m, x, { params: { mix: 0 } })[0], wet = hosted(m, x, { params: { mix: 1 } })[0], v = wet.map((y, i) => y - dry[i])
			bound = steady + (Math.abs(to.mix - base.mix) / N * turnOf(v, w0, w1) + 4 * 2 ** -24 * peakOf(b, w0, w1)) / ref
		} else {
			let s = { ...Object.fromEntries(Object.entries(m.params).map(([p, d]) => [p, d.default])), ...base }, G = v => law({ ...s, [k]: Math.fround(v) }), most = 0
			for (let t = 0; t < N; t++) most = Math.max(most, Math.abs(G(base[k] + (to[k] - base[k]) * (t + 1) / N) - G(base[k] + (to[k] - base[k]) * t / N)))
			bound = 1.1 * (steady + most / G(base[k]) * turnOf(a, w0, w1) / ref)
		}
		ok(measure <= bound, `${label}: ×${measure.toFixed(2)}, derived ≤ ×${bound.toFixed(2)}`)
		if (settle != null) {
			let from = at + N + 32 + settle, off = 0
			for (let i = from; i < n; i++) if (!Object.is(b[i], c[i])) off++
			is(off, 0, `${label}: from ${from - at} frames after the change, the render at ${to[k]}`)
		}
		if (law !== 'mix' || at !== 22063 || f !== 220 || !(name === 'tube' || name === 'multisat')) continue
		// the same samples whatever the host's calls: blocks of 1, 32, 128 and random cuts (32 frames at most while it
		// moves). 1-frame calls give every frame's float32 value, longer ones float32 values 32 frames apart, joined in
		// doubles: the two lines part by a float32 ulp of the value at most (2^-23 of 0.75), and each render rounds once to
		// float32: within 2^-23·(0.75·max|wet − dry| + max|y|)
		let dry = hosted(m, x, { params: { mix: 0 } })[0], wet = hosted(m, x, { params: { mix: 1 } })[0], Wd = 0
		for (let i = 0; i < n; i++) Wd = Math.max(Wd, Math.abs(wet[i] - dry[i]))
		let ys = [1, 32, 128].map(block => hosted(m, x, { params: base, at, to, block })[0]).concat([hosted(m, x, { params: base, at, to, block: 128, cut: () => 1 + Math.floor(u() * 128) })[0]])
		let tol = 2 ** -23 * (0.75 * Wd + peakOf(ys[0], 0, n))
		for (let j = 1; j < ys.length; j++) {
			let far = 0
			for (let i = 0; i < n; i++) far = Math.max(far, Math.abs(ys[j][i] - ys[0][i]))
			ok(far <= tol, `${label}: ${['', 'blocks of 32', 'blocks of 128', 'random calls'][j]}: within ${far.toExponential(2)} of 1-frame calls (≤ ${tol.toExponential(2)})`)
		}
	}
})

test('manifests: a retune is smoothed: a host retunes a filter along its ramp, a small step a call', () => {
	// A running IIR whose coefficients change leaves a transient as large as the change times its state, to first order. A
	// host's ramp over N = 882 frames makes ⌈N/32⌉ changes in place of one; the largest is `share` of the whole (computed
	// here from the coefficients at the values the calls bring: @audio/eq-crossover's at order 4 for multisat, as its
	// stream designs them, and tape's one-pole pole), and each rings for the slowest pole's decay, τ = −1/ln r samples, r
	// the largest pole radius at either end, so the transients of calls 32 frames apart add up to at most 1/(1 − e^(−32/τ))
	// of one. A jump's transient depends on the signal's phase where it lands, and a ramp's calls land at many: the jump is
	// taken at its worst of 32 instants over a period. The ramped render's measure over the steady one's (the render at the
	// new value, or 1: a tone through a gain that the control moves one way is largest at an end) is then at most the
	// jump's × share × that overlap; margin 1.1 for the terms of second order (for multisat's low 200 → 1000 Hz at 220 Hz
	// the first-order figure meets the measure to two digits). multisat at −60 dBFS: each band's tube follows the
	// crossover, and at a louder level it compresses one large transient more than many small ones, which this linear
	// argument does not hold for (at 0.5 the ramp reads ×5.3 against a jump's ×36.8). low at 1 kHz is left out: its jump
	// reads ×1.4, its ramp ×1.030 against a bound of ×1.030, too near 1 to read either way. The measure as above
	let at = 22016, n = at + 4096 + 64, N = Math.round(0.02 * fs)
	let radius = ({ a1, a2 }) => { let d = a1 * a1 - 4 * a2; return d < 0 ? Math.sqrt(a2) : (Math.abs(a1) + Math.sqrt(d)) / 2 }
	let sections = (low, high) => crossover([Math.fround(low), Math.fround(high)], 4, fs).flat()
	const ROWS = [
		[multisat, 'low', 200, 1000, 1e-3, v => sections(v, 2000).flatMap(c => [c.b0, c.b1, c.b2, c.a1, c.a2]), v => Math.max(...sections(v, 2000).map(radius))],
		[multisat, 'high', 2000, 8000, 1e-3, v => sections(200, v).flatMap(c => [c.b0, c.b1, c.b2, c.a1, c.a2]), v => Math.max(...sections(200, v).map(radius))],
		[tapeAtom, 'warmth', 0.25, 0.75, 0.5, v => [pole(Math.fround(v))], v => pole(Math.fround(v))],
	]
	for (let [m, k, from, to, A, co, r] of ROWS) for (let f of k === 'low' ? [220] : [220, 1000]) {
		let x = [tone(f, A, n)], label = `${m.name}.${k} ${from} → ${to}, ${f} Hz`, a = hosted(m, x, { params: { [k]: from } })[0]
		let measure = (y, t) => Math.max(d2max(y, t - 4, t + 4096) / d2max(a, t - 4, t + 4096), 1), jump = 0, T = fs / f
		for (let j = 0; j < 32; j++) { let t = at - Math.round(j * T / 32); jump = Math.max(jump, measure(hosted(m, x, { params: { [k]: from }, at: t, to: { [k]: to }, ramp: false })[0], t)) }
		let ramped = measure(hosted(m, x, { params: { [k]: from }, at, to: { [k]: to } })[0], at), steady = measure(hosted(m, x, { params: { [k]: to } })[0], at)
		let first = co(from), last = co(to), whole = 0, most = 0
		for (let e = 0; e < first.length; e++) whole = Math.max(whole, Math.abs(last[e] - first[e]))
		for (let s = 1, was = first; s <= Math.ceil(N / 32); s++) {
			let now = co(to + (from - to) * (1 - Math.min(N, 32 * s) / N))
			for (let e = 0; e < now.length; e++) most = Math.max(most, Math.abs(now[e] - was[e]))
			was = now
		}
		let tau = -1 / Math.log(Math.max(r(from), r(to))), bound = steady + 1.1 * (jump - steady) * (most / whole) / (1 - Math.exp(-32 / tau))
		ok(ramped <= bound, `${label}: a jump ×${jump.toFixed(1)} at its worst, the ramp ×${ramped.toFixed(3)}, derived ≤ ×${bound.toFixed(3)}`)
	}
})

test('manifests: each live number is glided or a retune, each smoothed over 20 ms', () => {
	// glided: it scales the signal with nothing behind it (a curve has no state), so its jump was a step of the output;
	// a retune: a filter's coefficients, its state kept. One time, 20 ms, the dynamics and effect families' for theirs
	const CLASS = {
		glided: { tube: 'drive bias mix', transistor: 'drive mix', waveshaper: 'drive mix', tape: 'drive mix', multisat: 'drive mix' },
		retune: { tape: 'warmth', multisat: 'low high' },
	}
	for (let [name, m] of Object.entries(ATOMS)) for (let [k, s] of Object.entries(m.params)) {
		if (s.type !== 'number' || s.restart) continue
		let in_ = Object.keys(CLASS).filter(c => CLASS[c][name]?.split(' ').includes(k))
		is(in_.length, 1, `${name}.${k}: in one class (${in_.join(', ') || 'none'})`)
		is(s.smoothing, 0.02, `${name}.${k}: smoothed over 20 ms`)
	}
})

test('the glide is one text in every manifest that keeps a copy', () => {
	let copies = ['tube', 'transistor', 'waveshaper', 'tape', 'multiband'].map(p => { let s = readFileSync(new URL(`./packages/saturate-${p}/audio.js`, import.meta.url), 'utf8'), i = s.indexOf('// A value that scales the signal, glided'); return i < 0 ? null : s.slice(i) })
	ok(copies[0]?.includes('function glide (') && copies.every(t => t === copies[0]), 'saturate-tube, -transistor, -waveshaper, -tape and -multiband audio.js')
})
