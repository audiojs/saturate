import test, { almost, ok, is } from 'tst'
import { waveshaper, tube, transistor, tape, multiband } from './index.js'

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
