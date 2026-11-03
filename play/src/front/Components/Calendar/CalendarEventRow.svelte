<script lang="ts">
    import type { CalendarEventInterface } from "@workadventure/shared-utils";
    import LL from "../../../i18n/i18n-svelte";
    import { formatDuration, formatTime, meetingPlace } from "./agenda";
    import CalendarJoinButton from "./CalendarJoinButton.svelte";
    import { IconStack2 } from "@wa-icons";

    interface Props {
        event: CalendarEventInterface;
        /** A long event, running alongside the meetings rather than competing with them. */
        long?: boolean;
        now: Date;
    }

    let { event, long = false, now }: Props = $props();

    let inProgress = $derived(event.start <= now && now < event.end);
    // Past meetings stay in the list (they are part of the day's record), just dimmed.
    let ended = $derived(event.end <= now);
    let place = $derived(meetingPlace(event));
    // How much of the meeting has run: in a list, a card's size says nothing of time, so the bar shows it.
    let elapsedPercent = $derived(
        ((now.getTime() - event.start.getTime()) / (event.end.getTime() - event.start.getTime())) * 100,
    );
</script>

<div class="relative border-b border-white/10 {ended ? 'opacity-60' : ''}">
    {#if inProgress}
        <div class="absolute bottom-0 left-0 h-0.5 bg-danger-600/60" style="width: {elapsedPercent}%"></div>
    {/if}

    <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-1 py-1.5">
        <span class="text-xs font-bold tabular-nums">
            {formatTime(event.start)}
        </span>
        <div class="flex min-w-0 flex-col">
            <span class="flex min-w-0 items-center gap-1.5">
                {#if long}
                    <IconStack2 class="h-3.5 w-3.5 shrink-0 text-contrast-200" aria-hidden="true" />
                {/if}
                <span class="truncate text-sm font-bold {ended ? 'line-through' : ''}">{event.title}</span>
            </span>
            <span class="text-xs text-contrast-200">
                {#if inProgress}
                    <span class="font-bold text-danger-600">{$LL.externalModule.calendar.inProgress()}</span>&nbsp;·
                {/if}
                {formatDuration(event)}{#if place}&nbsp;· {place}{/if}
            </span>
        </div>
        <CalendarJoinButton {event} />
    </div>
</div>
