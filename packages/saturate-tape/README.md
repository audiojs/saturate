# @audio/saturate-tape [![npm](https://img.shields.io/npm/v/@audio/saturate-tape)](https://www.npmjs.com/package/@audio/saturate-tape) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Tape saturation — tanh transfer + playback HF rolloff (simplified machine model)

```
npm install @audio/saturate-tape
```

```js
import tape from '@audio/saturate-tape'
```

Simplified tape-machine model: a mildly asymmetric `tanh`-plus-quadratic transfer (a milder even/odd blend than `tube`/`transistor`), followed by a one-pole low-pass standing in for playback-head HF loss (`warmth` sets the cutoff). Oversampled at the shaping stage (windowed-sinc up → shape → windowed-sinc down) to keep the extra harmonics from aliasing; the low-pass runs at the native rate afterward.

```js
tape(data, { drive: 2, warmth: 0.4, fs: 44100 })
tape(data, { drive: 1.5, mix: 0.7 })
```

| Param | Default | |
|---|---|---|
| `drive` | `1.5` | pre-gain into the tanh+quadratic curve |
| `warmth` | `0.25` | 0..1 — HF rolloff amount (higher = darker, more "tape") |
| `fs` | `44100` | sample rate |
| `oversample` | `4` | oversample factor for the shaping stage; `1` disables oversampling |
| `mix` | `1` | 0..1 — wet/dry blend of the *whole* processed signal (shaping + rolloff) against the untouched input |

**Mutates `data` in place** and returns it (same array reference, not a copy). HF content rolls off measurably more than LF content at equal drive (≥3 dB more loss at 8 kHz vs 500 Hz in the family test suite) — the rolloff, not just the nonlinearity, is what reads as "tape."

`stream(block, { drive: [2], warmth: [0.4], mix: [1] }, state(1024))` is the same model in calls of any size (up to the size given to `state`), the shaping oversampled 4×, the oversampler's and the one-pole's state carried from call to call. The whole call reads 20 samples ahead of each output; a stream cannot, so its output is `LATENCY` (20) samples late. Shifted back by `LATENCY` it is the whole call's output bit for bit, except near the ends of a whole signal (within 20 samples, and the one-pole carries the start's difference on, up to about 60 samples in). Values arrive as a host gives them to a processor, each a 1-length array, read at each call. The `./audio` processor runs it on each channel: latency 20 samples; tail the oversampler's 19 samples, then 60 dB of the one-pole of coefficient `pole(warmth)` = 0.35 + 0.45·warmth, ln(1000) / −ln(pole) samples; `drive`, `warmth` and `mix` live, each smoothed over 20 ms: `drive` and `mix` glided sample by sample along the host's ramp, 32 samples late, so a moved value is one line however the host cut its calls and a held one is the value itself, bit for bit (`lanes` after the length: drive and mix from 0 and `stride`); `warmth` retunes the one-pole at each call of the ramp.

**Use when:** darker, HF-rolled saturation — mix bus glue, vintage tape color.<br>
**Not for:** a bright, unfiltered harmonic signature (use `tube`/`transistor`/`waveshaper`, none of which touch the frequency response).

---

Part of the [@audio/saturate](https://github.com/audiojs/saturate) family.

MIT © [audiojs](https://github.com/audiojs)
