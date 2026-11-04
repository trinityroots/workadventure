import { readable } from "svelte/store";

const TICK_MS = 30_000;

/** Current time, refreshed twice a minute so countdowns and the now line stay current. */
export const now = readable(new Date(), (set) => {
    const interval = setInterval(() => set(new Date()), TICK_MS);
    return () => clearInterval(interval);
});
