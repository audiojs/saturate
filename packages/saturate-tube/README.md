# @audio/saturate-tube [![npm](https://img.shields.io/npm/v/@audio/saturate-tube)](https://www.npmjs.com/package/@audio/saturate-tube) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Tube saturation — asymmetric biased tanh, even-harmonic signature

```
npm install @audio/saturate-tube
```

```js
import tube from '@audio/saturate-tube'
```

Valve/tube-style saturation: a DC-compensated, asymmetric `tanh` transfer (`bias` shifts the curve off-center). The asymmetry is what generates even harmonics — the "warm" 2nd-harmonic tube signature — versus the odd-only symmetric curves in `transistor`/`waveshaper`. Oversampled (windowed-sinc up → shape → windowed-sinc down) to keep the extra harmonics from aliasing.

```js
tube(data, { drive: 3, fs: 44100 })
tube(data, { drive: 2, bias: 0.4, mix: 0.6 })
```

| Param | Default | |
|---|---|---|
| `drive` | `2` | pre-gain into the biased tanh curve |
| `bias` | `0.25` | 0..1 — asymmetry (DC-compensated); higher = more even-harmonic content |
| `fs` | `44100` | sample rate |
| `oversample` | `4` | oversample factor; `1` disables oversampling (naive, aliased) |
| `mix` | `1` | 0..1 — wet/dry blend |

**Mutates `data` in place** and returns it (same array reference, not a copy). Even (2nd) harmonic energy measurably exceeds `transistor`'s at equal drive — verified in the family test suite via Goertzel analysis at 2nd/3rd harmonic bins.

This package's own host wrapper (`./audio` export, for chainable-host use) is `streaming: false` — the sinc-oversampled transfer needs whole-signal context; a per-block realtime path would need a streaming polyphase oversampler first.

**Use when:** warm, "tube-y" 2nd-harmonic coloration.<br>
**Not for:** odd-harmonic console character (use `transistor`) or HF-rolled tape character (use `tape`).

---

Part of the [@audio/saturate](https://github.com/audiojs/saturate) family.

MIT © [audiojs](https://github.com/audiojs)
