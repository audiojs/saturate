# @audio/saturate

> Saturation — harmonic enrichment, distinct from hard distortion (`@audio/effect-distortion`).

`@audio/effect-distortion` is raw/aliased grunge (fuzz, bitcrush, clip); `@audio/saturate-*` is normalized, oversampled nonlinear shaping meant to sit transparently in a mix.

| Package | What |
|---|---|
| `@audio/saturate-tape` | tape — HF compression, low bump |
| `@audio/saturate-tube` | tube — asymmetric, even harmonics |
| `@audio/saturate-transistor` | console — odd harmonics |
| `@audio/saturate-waveshaper` | arbitrary/Chebyshev curves |
| `@audio/saturate-multiband` | per-band drive (Saturn class) |

Industry parity: Ableton Saturator/Dynamic Tube/Roar, FabFilter Saturn, Soundtoys Decapitator, Waves NLS. Quality bar: oversampled nonlinearities (no naive aliasing waveshapers).
