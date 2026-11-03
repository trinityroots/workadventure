<script lang="ts">
    import type { CalendarEventInterface } from "@workadventure/shared-utils";
    import LL from "../../../i18n/i18n-svelte";
    import { formatDuration, formatTime, meetingPlace } from "./agenda";
    import CalendarJoinButton from "./CalendarJoinButton.svelte";
    import { IconChevronUp, IconStack2 } from "@wa-icons";

    interface Props {
        event: CalendarEventInterface;
        /** A long event, running alongside the meetings rather than competing with them. */
        long?: boolean;
        now: Date;
    }

    let { event, long = false, now }: Props = $props();

    let expanded = $state(false);
    let inProgress = $derived(event.start <= now && now < event.end);
    // Past meetings stay in the list (they are part of the day's record), just dimmed.
    let ended = $derived(event.end <= now);
    let place = $derived(meetingPlace(event));
    // How much of the meeting has run: in a list, a card's size says nothing of time, so the bar shows it.
    let elapsedPercent = $derived(
        ((now.getTime() - event.start.getTime()) / (event.end.getTime() - event.start.getTime())) * 100,
    );
</script>

<div
    class="relative overflow-hidden rounded-md border {long ? 'border-dashed' : 'border-solid bg-white/5'} {inProgress
        ? 'border-danger-600/60'
        : 'border-white/10'} {ended ? 'opacity-60' : ''}"
>
    {#if inProgress}
        <div class="absolute bottom-0 left-0 h-0.5 bg-danger-600/60" style="width: {elapsedPercent}%"></div>
    {/if}

    <div class="grid grid-cols-[3rem_minmax(0,1fr)_auto_auto] items-center gap-2.5 p-2.5">
        <div class="flex flex-col tabular-nums leading-tight">
            <span class="text-sm font-bold">{formatTime(event.start)}</span>
            <span class="text-xs text-contrast-200">{formatTime(event.end)}</span>
        </div>
        <button
            type="button"
            class="flex min-w-0 flex-col items-start gap-0.5 text-left"
            aria-expanded={expanded}
            aria-label={event.title}
            onclick={() => (expanded = !expanded)}
        >
            <span class="flex min-w-0 items-center gap-1.5">
                {#if long}
                    <IconStack2 class="h-4 w-4 shrink-0 text-contrast-200" aria-hidden="true" />
                {/if}
                <span class="truncate">{event.title}</span>
            </span>
            <span class="text-xs text-contrast-200">
                {#if inProgress}
                    <span class="font-bold text-danger-600">{$LL.externalModule.calendar.inProgress()}</span>&nbsp;·
                {/if}
                {formatDuration(event)}{#if event.resource?.onlineMeeting?.isWorkAdventure}&nbsp;· WorkAdventure{/if}
            </span>
        </button>
        <CalendarJoinButton {event} />
        <button
            type="button"
            class="hover:bg-white/10 flex h-7 w-7 items-center justify-center rounded !text-white"
            aria-expanded={expanded}
            aria-label={event.title}
            onclick={() => (expanded = !expanded)}
        >
            <IconChevronUp class="h-4 w-4 transition-transform {expanded ? '' : 'rotate-180'}" />
        </button>
    </div>

    {#if expanded}
        <div class="flex flex-col gap-2 border-t border-white/10 px-2.5 pb-2.5 pt-2">
            <CalendarJoinButton {event} prominent labelled />
            {#if place}
                <span class="text-xs text-contrast-200">{place}</span>
            {/if}
            {#if event.description}
                <p class="m-0 whitespace-pre-wrap text-xs opacity-80">{event.description}</p>
            {/if}
        </div>
    {/if}
</div>
