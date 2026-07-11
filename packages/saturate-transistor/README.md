# @audio/saturate-transistor [![npm](https://img.shields.io/npm/v/@audio/saturate-transistor)](https://www.npmjs.com/package/@audio/saturate-transistor) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Transistor/console saturation — odd-symmetric cubic, 3rd-harmonic dominant

```
npm install @audio/saturate-transistor
```

```js
import transistor from '@audio/saturate-transistor'
```

Solid-state/console-style saturation: an odd-symmetric cubic soft clip (`v − v³/3`, hard-limited past `±1`). Odd symmetry means only odd harmonics (3rd-dominant) appear — no DC shift, no even-harmonic warmth, the "console" color as distinct from tube's asymmetric even-harmonic signature. Oversampled (windowed-sinc up → shape → windowed-sinc down) to keep the extra harmonics from aliasing.

```js
transistor(data, { drive: 3, fs: 44100 })
transistor(data, { drive: 6, mix: 0.5 })
```

| Param | Default | |
|---|---|---|
| `drive` | `2` | pre-gain into the cubic soft-clip curve |
| `fs` | `44100` | sample rate |
| `oversample` | `4` | oversample factor; `1` disables oversampling (naive, aliased) |
| `mix` | `1` | 0..1 — wet/dry blend |

**Mutates `data` in place** and returns it (same array reference, not a copy). 3rd-harmonic energy measurably exceeds 2nd-harmonic at equal drive (odd-dominant) — verified in the family test suite via Goertzel analysis.

**Use when:** solid-state/console-style "grit" and edge.<br>
**Not for:** warm even-harmonic tube color (use `tube`) or a plain normalized tanh (use `waveshaper`).

---

Part of the [@audio/saturate](https://github.com/audiojs/saturate) family.

MIT © [audiojs](https://github.com/audiojs)
