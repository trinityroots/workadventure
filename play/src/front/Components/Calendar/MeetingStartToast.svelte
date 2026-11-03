<script lang="ts">
    import { SvelteSet } from "svelte/reactivity";
    import { fly } from "svelte/transition";
    import { calendarEventsStore } from "../../Stores/CalendarStore";
    import LL from "../../../i18n/i18n-svelte";
    import Button from "../UI/Button.svelte";
    import { formatTime, meetingPlace } from "./agenda";
    import CalendarJoinButton from "./CalendarJoinButton.svelte";
    import { meetingStartToast } from "./MeetingStartToast";
    import { IconCalendar, IconX } from "@wa-icons";

    // "Starting now" goes stale: refresh it twice a minute.
    let now = $state(new Date());
    $effect(() => {
        const interval = setInterval(() => (now = new Date()), 30_000);
        return () => clearInterval(interval);
    });

    const dismissed = new SvelteSet<string>();
    let event = $derived(meetingStartToast($calendarEventsStore.values(), now, dismissed));

    function dismiss() {
        if (event) dismissed.add(event.id);
    }
</script>

{#if event}
    {@const started = event.start <= now}
    <section
        aria-label={$LL.externalModule.calendar.reminder()}
        class="pointer-events-auto flex w-96 max-w-[calc(100vw-1rem)] flex-col gap-3.5 rounded-lg border border-solid border-white/10 bg-contrast/90 p-4 text-white shadow-dark backdrop-blur"
        in:fly={{ x: 100, duration: 250 }}
        out:fly={{ x: 100, duration: 200 }}
    >
        <div class="flex items-start gap-3">
            <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md {started
                    ? 'bg-danger-600/20 text-danger-600'
                    : 'bg-secondary/25 text-secondary-300'}"
            >
                <IconCalendar class="h-6 w-6" aria-hidden="true" />
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-1">
                <span class="truncate text-lg font-bold leading-tight">{event.title}</span>
                <span class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-contrast-200">
                    <span class="whitespace-nowrap font-bold {started ? 'text-danger-600' : 'text-white'}">
                        {started ? $LL.externalModule.calendar.startsNow() : formatTime(event.start)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span class="truncate">{meetingPlace(event) ?? $LL.externalModule.calendar.noLink()}</span>
                </span>
            </div>
            <Button
                variant="light"
                appearance="ghost"
                size="sm"
                square
                class="-me-1.5 -mt-1.5 shrink-0"
                aria-label={$LL.externalModule.calendar.dismissReminder()}
                onclick={dismiss}
            >
                {#snippet icon()}<IconX class="h-4 w-4" />{/snippet}
            </Button>
        </div>
        <CalendarJoinButton {event} prominent class="m-0 w-full" onjoin={dismiss} />
    </section>
{/if}
