<script lang="ts">
    import { onDestroy } from "svelte";
    import type { Snippet } from "svelte";
    import { playSfx } from "../../Services/gameSfx";
    import { npcRoleIconHtml } from "../../Phaser/Components/npcRoleIcons";

    onDestroy(() => playSfx("close"));

    interface Props {
        icon: string;
        title: string;
        subtitle?: string;
        headerExtra?: Snippet;
        children: Snippet;
        onClose: () => void;
        testid: string;
    }

    let { icon, title, subtitle, headerExtra, children, onClose, testid }: Props = $props();

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") onClose();
    }
</script>

<svelte:window onkeydown={onKeyDown} />

<div
    class="pointer-events-auto fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4"
    data-testid={testid}
>
    <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        class="flex max-h-[86vh] w-[400px] max-w-[94vw] flex-col overflow-hidden rounded-xl border border-white/15 bg-contrast/95 shadow-[0_0_0_1px_rgba(0,0,0,.4),0_18px_50px_rgba(0,0,0,.55)] backdrop-blur-md"
    >
        <header class="flex items-center gap-2 border-b border-white/10 bg-black/25 px-3 py-2">
            <span
                class="flex h-7 w-7 items-center justify-center rounded border border-pop-yellow/50 bg-black/40 text-pop-yellow"
                aria-hidden="true"
            >
                <!-- Icon markup comes from the fixed npcRoleIcons table, never from user input. -->
                {@html npcRoleIconHtml(icon, 16)}<!-- eslint-disable-line svelte/no-at-html-tags -->
            </span>
            <div class="min-w-0 flex-1">
                <div class="truncate font-mono text-sm font-bold uppercase tracking-wider text-pop-yellow">
                    {title}
                </div>
                {#if subtitle}
                    <div class="truncate font-mono text-[11px] italic text-white/55">{subtitle}</div>
                {/if}
            </div>
            {@render headerExtra?.()}
            <button
                type="button"
                class="rounded border border-white/15 px-1.5 py-0.5 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Close"
                onclick={onClose}
            >
                ✕
            </button>
        </header>

        {@render children()}
    </div>
</div>
