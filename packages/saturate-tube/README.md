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

```js
import { stream, state, LATENCY } from '@audio/saturate-tube'
let s = state(1024)                                               // calls of up to 1024 samples
stream(block, { drive: [3], bias: [0.25], mix: [1] }, s)        // each call, in place
```

`stream` is the same transfer in calls of any size, oversampled 4×, its state carried from call to call. The whole call reads 20 samples ahead of each output; a stream cannot, so its output is `LATENCY` (20) samples late, and moves `RING` (19) samples past that once its input stops. Shifted back by `LATENCY` it is the whole call's output bit for bit, except within 20 samples of the ends of a whole signal, where the whole call's resampler divides by the taps it has and a stream hears silence. Values arrive as a host gives them to a processor, each a 1-length array, read at each call.

The `./audio` processor runs `stream` on each channel: latency 20 samples, tail 19 samples, `drive`, `bias` and `mix` live: each declares `smoothing` (20 ms) and is glided sample by sample along the host's ramp, 32 samples late, so a moved value is one line however the host cut its calls and a held one is the value itself, bit for bit. `stream` takes those per-sample values as `lanes` after the length, a `Float64Array` of drive, bias and mix from 0, `stride` and 2·`stride`.

**Use when:** warm, "tube-y" 2nd-harmonic coloration.<br>
**Not for:** odd-harmonic console character (use `transistor`) or HF-rolled tape character (use `tape`).

---

Part of the [@audio/saturate](https://github.com/audiojs/saturate) family.

MIT © [audiojs](https://github.com/audiojs)
