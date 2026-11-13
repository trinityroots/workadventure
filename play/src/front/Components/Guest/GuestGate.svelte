<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import {
        fetchGuestHosts,
        fetchGuestStatus,
        sendGuestRequest,
        storeAuthToken,
        type GuestHost,
    } from "../../Services/guestApproval";

    type Stage = "loading" | "name" | "pick" | "waiting" | "declined" | "expired";

    const STATUS_POLL_MS = 2000;

    let stage: Stage = $state("loading");
    let guestName = $state("");
    let hosts: GuestHost[] = $state([]);
    let chosen: GuestHost | undefined = $state();
    let message = $state("");
    let busy = $state(false);
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
        }
        pollTimer = undefined;
    }

    async function checkStatus() {
        try {
            const result = await fetchGuestStatus();
            if (result.status === "approved" && result.authToken) {
                stopPolling();
                storeAuthToken(result.authToken);
                window.location.reload();
            } else if (result.status === "declined" || result.status === "expired") {
                stopPolling();
                stage = result.status;
            } else {
                stage = "waiting";
            }
        } catch {
            // No request yet (or a network hiccup while waiting): keep the current screen.
            if (stage === "loading") {
                stage = "name";
            }
        }
    }

    function startPolling() {
        stopPolling();
        pollTimer = setInterval(() => {
            checkStatus().catch(() => undefined);
        }, STATUS_POLL_MS);
    }

    async function loadHosts() {
        busy = true;
        message = "";
        try {
            hosts = await fetchGuestHosts();
            stage = "pick";
        } catch {
            message = "We could not load the team members. Please try again.";
        } finally {
            busy = false;
        }
    }

    async function choose(host: GuestHost) {
        busy = true;
        message = "";
        try {
            const result = await sendGuestRequest(host.id, guestName.trim());
            if (result === "sent" || result === "already_pending") {
                chosen = host;
                stage = "waiting";
                startPolling();
            } else if (result === "host_offline") {
                message = `${host.name} is no longer online. Please choose someone else.`;
                await loadHosts();
            } else {
                message = "We could not send your request. Please check your name and try again.";
            }
        } catch {
            message = "We could not send your request. Please try again.";
        } finally {
            busy = false;
        }
    }

    onMount(async () => {
        await checkStatus();
        if (stage === "waiting") {
            startPolling();
        }
    });

    onDestroy(stopPolling);
</script>

<div class="flex h-dvh w-dvw items-center justify-center bg-contrast p-4 text-white" data-testid="guest-gate">
    <div class="w-[420px] max-w-full rounded-md border border-white/15 bg-black/30 p-6 shadow-xl">
        <h1 class="font-mono text-lg font-bold uppercase tracking-wider text-pop-yellow">Welcome, guest</h1>

        {#if stage === "loading"}
            <p class="mt-4 text-sm text-white/70">Loading…</p>
        {:else if stage === "name"}
            <p class="mt-4 text-sm text-white/80">What should we call you?</p>
            <input
                class="mt-3 w-full rounded border border-white/25 bg-black/40 px-3 py-2 text-white outline-none focus:border-pop-yellow"
                type="text"
                maxlength="40"
                placeholder="Your name"
                bind:value={guestName}
                onkeydown={(event) => event.key === "Enter" && guestName.trim() && loadHosts()}
            />
            <button
                type="button"
                class="mt-4 w-full rounded bg-pop-yellow px-3 py-2 text-sm font-bold text-black disabled:opacity-40"
                disabled={busy || guestName.trim() === ""}
                onclick={loadHosts}
            >
                Continue
            </button>
        {:else if stage === "pick"}
            <p class="mt-4 text-sm text-white/80">Who would you like to visit, {guestName.trim()}?</p>
            {#if hosts.length === 0}
                <p class="mt-3 text-sm text-white/60">No team member is online right now.</p>
            {:else}
                <ul class="mt-3 flex max-h-[40dvh] flex-col gap-2 overflow-y-auto">
                    {#each hosts as host (host.id)}
                        <li>
                            <button
                                type="button"
                                class="w-full rounded border border-white/20 px-3 py-2 text-left text-sm hover:border-pop-yellow hover:bg-white/10 disabled:opacity-50"
                                disabled={busy}
                                onclick={() => choose(host)}
                            >
                                {host.name}
                            </button>
                        </li>
                    {/each}
                </ul>
            {/if}
            <button
                type="button"
                class="mt-4 w-full rounded border border-white/25 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
                disabled={busy}
                onclick={loadHosts}
            >
                Refresh the list
            </button>
        {:else if stage === "waiting"}
            <p class="mt-4 text-sm text-white/80">
                Waiting for {chosen ? chosen.name : "a team member"} to welcome you in…
            </p>
            <p class="mt-2 text-xs text-white/50">This page updates by itself. Please keep it open.</p>
        {:else if stage === "declined"}
            <p class="mt-4 text-sm text-white/80">
                {chosen ? chosen.name : "The team member"} cannot let you in right now.
            </p>
            <button
                type="button"
                class="mt-4 w-full rounded bg-pop-yellow px-3 py-2 text-sm font-bold text-black"
                onclick={loadHosts}
            >
                Choose someone else
            </button>
        {:else if stage === "expired"}
            <p class="mt-4 text-sm text-white/80">
                {chosen ? chosen.name : "The team member"} did not answer in time.
            </p>
            <button
                type="button"
                class="mt-4 w-full rounded bg-pop-yellow px-3 py-2 text-sm font-bold text-black"
                onclick={loadHosts}
            >
                Choose someone else
            </button>
        {/if}

        {#if message}
            <p class="mt-3 text-sm text-red-300" role="alert">{message}</p>
        {/if}
    </div>
</div>
