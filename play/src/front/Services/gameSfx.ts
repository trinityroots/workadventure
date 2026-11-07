export type SfxName = "click" | "fanfare" | "npcPop" | "ding" | "hit" | "coin" | "wave";

interface Tone {
    freq: number;
    dur: number;
    at?: number;
    glideTo?: number;
    type?: OscillatorType;
    vol?: number;
}

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
    if (typeof AudioContext === "undefined") return null;
    try {
        if (!ctx) ctx = new AudioContext();
        if (ctx.state === "suspended") ctx.resume().catch(() => undefined);
        return ctx;
    } catch {
        return null;
    }
}

function tone(c: AudioContext, spec: Tone): void {
    const start = c.currentTime + (spec.at ?? 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = spec.type ?? "square";
    osc.frequency.setValueAtTime(spec.freq, start);
    if (spec.glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(spec.glideTo, start + spec.dur);
    const vol = spec.vol ?? 0.12;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.dur);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + spec.dur + 0.02);
}

const SOUNDS: Record<SfxName, Tone[]> = {
    click: [{ freq: 1100, dur: 0.04, vol: 0.06 }],
    npcPop: [{ freq: 700, glideTo: 320, dur: 0.09, type: "sine", vol: 0.14 }],
    ding: [{ freq: 988, dur: 0.22, type: "sine", vol: 0.12 }],
    coin: [
        { freq: 988, dur: 0.07, vol: 0.12 },
        { freq: 1319, dur: 0.12, at: 0.07, vol: 0.12 },
    ],
    hit: [{ freq: 160, glideTo: 70, dur: 0.09, type: "sawtooth", vol: 0.16 }],
    wave: [
        { freq: 740, dur: 0.05, type: "sine", vol: 0.12 },
        { freq: 988, dur: 0.06, at: 0.07, type: "sine", vol: 0.12 },
    ],
    fanfare: [
        { freq: 523, dur: 0.09, vol: 0.12 },
        { freq: 659, dur: 0.09, at: 0.09, vol: 0.12 },
        { freq: 784, dur: 0.09, at: 0.18, vol: 0.12 },
        { freq: 1047, dur: 0.28, at: 0.27, vol: 0.12 },
    ],
};

/** Play a synthesized chiptune effect; a no-op where WebAudio is unavailable. */
export function playSfx(name: SfxName): void {
    try {
        const c = audio();
        if (!c) return;
        for (const spec of SOUNDS[name]) tone(c, spec);
    } catch {
        // Sound is decoration; never let it break the action.
    }
}
