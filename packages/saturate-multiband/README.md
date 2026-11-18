# @audio/saturate-multiband [![npm](https://img.shields.io/npm/v/@audio/saturate-multiband)](https://www.npmjs.com/package/@audio/saturate-multiband) [![MIT](https://img.shields.io/badge/MIT-%E0%A5%90-white)](https://github.com/krishnized/license)

Multiband saturation — LR split + per-band tube drive (Saturn class)

```
npm install @audio/saturate-multiband
```

```js
import multiband from '@audio/saturate-multiband'
```

Linkwitz-Riley crossover splits the signal into bands, each band gets its own `@audio/saturate-tube` drive (or none), and the bands sum back flat (FabFilter Saturn class — drive the low end without smearing the highs, or vice versa). `bands` is either one options object applied to every band, or an array with one entry per band — `null`/`undefined` in the array means that band passes through the crossover split unsaturated but still summed back in.

```js
multiband(data, { freqs: [200, 2000], fs: 44100 })                          // 3 bands, no drive (crossover only)
multiband(data, { freqs: [1000], bands: [null, { drive: 5 }], fs: 44100 })  // drive only the high band
multiband(data, { freqs: [200, 2000], bands: { drive: 3 }, fs: 44100 })     // same drive on every band
```

| Param | Default | |
|---|---|---|
| `freqs` | `[200, 2000]` | crossover split points in Hz — `N` points produce `N+1` bands |
| `bands` | `undefined` (no drive) | one options object for every band, or an array of per-band options / `null` |
| `order` | `4` | Linkwitz-Riley crossover order |
| `fs` | `44100` | sample rate |

Each band's `@audio/saturate-tube` options accept its own `drive`/`bias`/`oversample` — pass them inside the per-band object, e.g. `{ drive: 5, bias: 0.3 }`.

**Mutates `data` in place** and returns it (same array reference, not a copy). No top-level `mix`: banded drive is applied per band via `bands`, and an unlisted/`null` band is the "0% wet" case for that band specifically.

`stream(block, { low: [200], high: [2000], drive: [3], mix: [1] }, state(1024, 44100))` is the `./audio` processor's form in calls of any size (up to the size given to `state`): three bands split at `low` and `high` by an order-4 Linkwitz-Riley crossover, each through `@audio/saturate-tube`'s `stream` at `drive` and `mix`, the crossover's and each band's oversampler's state carried from call to call. Its output is 20 samples (`LATENCY`) late; shifted back by that it is `multiband(data, { freqs: [low, high], bands: { drive, mix }, fs })` bit for bit, except within 20 samples of the ends of a whole signal. Values arrive as a host gives them to a processor, each a 1-length array, read at each call; the crossover is designed again when a point moves. At `mix` 0 the output is the crossover's sum, not the input delayed: each band blends its tube with that band's own input, so the dry path keeps the phase of the wet bands and a partial mix does not comb (a dry path of the input delayed by 20 would notch 26 dB at a 2 kHz point at mix 0.5 and drive 0.5). The sum is flat with the points far apart (within 0.12 dB a decade apart, as at their defaults) and dips where the low and high bands overlap as the points come closer: 1 dB at 500 and 2000 Hz, 8 dB an octave apart, 28 dB at 1000 and 1500 Hz. The `./audio` processor runs it on each channel: latency 20 samples, every parameter live and smoothed over 20 ms (`drive` and `mix` glided sample by sample along the host's ramp, 32 samples late, so a held value is the value itself, bit for bit, and `stream` takes them as `lanes` after the length, as `@audio/saturate-tube`'s does; `low` and `high` redesign the crossover at each call of the ramp), and a tail of how long the crossover rings at the points in force (each band's impulse response to 60 dB below its peak; the poles of LR4 are double, so their ring outlasts ln(1000) / −ln(r) by half again) plus the oversampler's 19 samples.

**Use when:** driving one frequency region without smearing the others — bass warmth without top-end grit, or the reverse.<br>
**Not for:** a single full-band character (use `tube`/`transistor`/`tape`/`waveshaper` directly — cheaper, no crossover phase interaction).

---

Part of the [@audio/saturate](https://github.com/audiojs/saturate) family.

MIT © [audiojs](https://github.com/audiojs)
