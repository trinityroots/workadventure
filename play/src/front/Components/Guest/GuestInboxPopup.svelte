<script lang="ts">
    import { answerGuestRequest, guestInboxStore } from "../../Services/guestApproval";

    const current = $derived($guestInboxStore[0]);

    function answer(approve: boolean) {
        if (current) {
            answerGuestRequest(current.id, approve).catch(() => undefined);
        }
    }
</script>

{#if current}
    <div
        class="pointer-events-auto fixed bottom-6 left-1/2 z-[310] w-[360px] max-w-[94vw] -translate-x-1/2 rounded-md border border-pop-yellow/60 bg-contrast/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,.55)] backdrop-blur-md"
        role="alertdialog"
        aria-label="A guest is at the door"
        data-testid="guest-inbox-popup"
    >
        <div class="font-mono text-sm font-bold uppercase tracking-wider text-pop-yellow">Someone is at the door</div>
        <p class="mt-2 text-sm text-white">
            <span class="font-bold">{current.guestName}</span>
            <span class="text-white/60">({current.guestEmail})</span>
            is at the door. Would you like to welcome them in?
        </p>
        <div class="mt-4 flex gap-2">
            <button
                type="button"
                class="flex-1 rounded bg-green-600 px-3 py-2 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-50"
                onclick={() => answer(true)}
            >
                Let them in
            </button>
            <button
                type="button"
                class="flex-1 rounded border border-white/25 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
                onclick={() => answer(false)}
            >
                Not now
            </button>
        </div>
        {#if $guestInboxStore.length > 1}
            <div class="mt-2 text-xs text-white/50">{$guestInboxStore.length - 1} more waiting</div>
        {/if}
    </div>
{/if}
