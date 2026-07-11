# @audio/saturate-waveshaper [![npm](https://img.shields.io/npm/v/@audio/saturate-waveshaper)](https://www.npmjs.com/package/@audio/saturate-waveshaper) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Waveshaper — normalized tanh or custom curve, oversampled

```
npm install @audio/saturate-waveshaper
```

```js
import waveshaper from '@audio/saturate-waveshaper'
```

Applies a memoryless transfer function to every sample — normalized `tanh(drive·x)` by default, or your own `curve` function. Oversampled (windowed-sinc up → shape → windowed-sinc down) so harmonics pushed above Nyquist by the nonlinearity fold back as inaudible energy instead of audible aliasing, not a naive per-sample waveshaper.

```js
waveshaper(data, { drive: 4, fs: 44100 })
waveshaper(data, { curve: x => x - x ** 3 / 3, fs: 44100 })  // custom transfer
```

| Param | Default | |
|---|---|---|
| `drive` | `2` | pre-gain into the tanh curve (ignored when `curve` is set) |
| `curve` | `x => tanh(drive·x)/tanh(drive)` | custom `(x: number) => number` transfer function, applied at the oversampled rate |
| `fs` | `44100` | sample rate |
| `oversample` | `4` | oversample factor; `1` disables oversampling (naive, aliased) |
| `mix` | `1` | 0..1 — wet/dry blend |

**Mutates `data` in place** and returns it (same array reference, not a copy). `mix: 0` is an exact passthrough — verified bit-close (`<1e-6`) in the family test suite.

**Use when:** you need a specific custom transfer curve, or a clean tanh baseline without a particular harmonic-symmetry signature.<br>
**Not for:** a specific circuit-modeled color — use `tube` (even harmonics), `transistor` (odd harmonics), or `tape` (HF-rolled tanh) for those.

---

Part of the [@audio/saturate](https://github.com/audiojs/saturate) family.

MIT © [audiojs](https://github.com/audiojs)
