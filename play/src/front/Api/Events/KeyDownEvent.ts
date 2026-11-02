import { z } from "zod";

export const isKeyDownEvent = z.object({
    key: z.string(),
    code: z.string(),
    repeat: z.boolean(),
});

/**
 * A message sent from the game to an iFrame when the player presses a key while
 * the game canvas keeps focus, so map scripts can bind hotkeys without stealing focus.
 */
export type KeyDownEvent = z.infer<typeof isKeyDownEvent>;

export type KeyDownEventCallback = (event: KeyDownEvent) => void;
