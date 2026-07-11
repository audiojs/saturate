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

**Use when:** darker, HF-rolled saturation — mix bus glue, vintage tape color.<br>
**Not for:** a bright, unfiltered harmonic signature (use `tube`/`transistor`/`waveshaper`, none of which touch the frequency response).

---

Part of the [@audio/saturate](https://github.com/audiojs/saturate) family.

MIT © [audiojs](https://github.com/audiojs)
