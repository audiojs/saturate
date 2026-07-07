# @audio/saturate

> Saturation — harmonic enrichment, distinct from hard distortion (`@audio/effect-distortion`). All planned.

| Package | What |
|---|---|
| `@audio/saturate-tape` | tape — HF compression, low bump |
| `@audio/saturate-tube` | tube — asymmetric, even harmonics |
| `@audio/saturate-transistor` | console — odd harmonics |
| `@audio/saturate-waveshaper` | arbitrary/Chebyshev curves |
| `@audio/saturate-multiband` | per-band drive (Saturn class) |

Industry parity: Ableton Saturator/Dynamic Tube/Roar, FabFilter Saturn, Soundtoys Decapitator, Waves NLS. Quality bar: oversampled nonlinearities (no naive aliasing waveshapers) — that is why these ship as stubs until done right.
