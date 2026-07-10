// Generated from the audio.js manifest (params metadata is the source of truth).
// Regenerate: node tools/dts.js in @audio/compile. Do not edit by hand.

/** Automatable number — scalar, `t => value` fn, or breakpoint curve {t, v} */
type Auto = number | ((t: number) => number) | { t: number[], v: number[] }
/** Per-block param values as delivered by hosts (numbers arrive as 1-length Float32Array) */
type Live = Record<string, Float32Array | string | boolean>
type Ctx = { sampleRate: number, maxBlockSize: number, maxChannels: number, currentTime: number, duration?: number, events?: readonly any[], emit?: (name: string, ...args: any[]) => void, [k: string]: unknown }
type Process = (inputs: Float32Array[][], outputs: Float32Array[][], params: Live) => void

/** Chainable-host options for 'multisat' */
export interface MultisatOptions {
  /** 40..1000 Hz (default 200) */
  "low"?: Auto
  /** 1000..12000 Hz (default 2000) */
  "high"?: Auto
  /** 0.5..10 (default 2) */
  "drive"?: Auto
  /** 0..1 (default 1) */
  "mix"?: Auto
  at?: number | string
  duration?: number | string
}

export declare const multisat: {
  (ctx: Ctx): Process
  channels: "any"
  streaming: false
  params: {
    /** 40..1000 Hz (default 200) */
    "low": { type: "number", default: 200 }
    /** 1000..12000 Hz (default 2000) */
    "high": { type: "number", default: 2000 }
    /** 0.5..10 (default 2) */
    "drive": { type: "number", default: 2 }
    /** 0..1 (default 1) */
    "mix": { type: "number", default: 1 }
  }
}
