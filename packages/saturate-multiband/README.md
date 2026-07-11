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

**Use when:** driving one frequency region without smearing the others — bass warmth without top-end grit, or the reverse.<br>
**Not for:** a single full-band character (use `tube`/`transistor`/`tape`/`waveshaper` directly — cheaper, no crossover phase interaction).

---

Part of the [@audio/saturate](https://github.com/audiojs/saturate) family.

MIT © [audiojs](https://github.com/audiojs)
