<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type { Snippet } from "svelte";
    import { playSfx } from "../../Services/gameSfx";

    interface Props {
        title: string;
        headerExtra?: Snippet;
        children: Snippet;
        onClose: () => void;
        testid: string;
        widthClass?: string;
    }

    let { title, headerExtra, children, onClose, testid, widthClass = "w-[360px]" }: Props = $props();

    onMount(() => playSfx("open"));
    onDestroy(() => playSfx("close"));
</script>

<div
    class="pointer-events-auto fixed right-3 top-24 z-[310] flex max-h-[82vh] {widthClass} max-w-[94vw] flex-col rounded-lg border border-white/15 bg-contrast/95 shadow-[0_0_0_1px_rgba(0,0,0,.45),0_18px_50px_rgba(0,0,0,.55)] backdrop-blur-md"
    role="dialog"
    aria-label={title}
    data-testid={testid}
>
    <header class="flex items-center gap-2 rounded-t-lg border-b border-white/10 bg-contrast-1000 px-3 py-2">
        <span class="min-w-0 flex-1 truncate font-mono text-xs font-bold uppercase tracking-widest text-pop-yellow">
            {title}
        </span>
        {@render headerExtra?.()}
        <button
            type="button"
            class="rounded border border-pop-red/50 bg-pop-red/20 px-1.5 py-0.5 text-xs text-white hover:bg-pop-red/40"
            aria-label="Close"
            onclick={onClose}
        >
            ✕
        </button>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-3 no-scroll-bar">
        {@render children()}
    </div>
</div>
