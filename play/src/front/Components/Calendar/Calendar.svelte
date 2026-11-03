<script lang="ts">
    import { get } from "svelte/store";
    import { calendarEventsStore } from "../../Stores/CalendarStore";
    import LL from "../../../i18n/i18n-svelte";

    import Button from "../UI/Button.svelte";
    import { userIsConnected } from "../../Stores/MenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { externalSvelteComponentService } from "../../Stores/Utils/externalSvelteComponentService";
    import ExternalComponents from "../ExternalModules/ExternalComponents.svelte";
    import { refreshCalendar } from "../../Services/CalendarLoader";
    import { buildAgenda, formatDayName, startOfDay } from "./agenda";
    import CalendarEventRow from "./CalendarEventRow.svelte";
    import CalendarOverlapGroup from "./CalendarOverlapGroup.svelte";
    import CalendarMonthGrid from "./CalendarMonthGrid.svelte";
    import { IconRefresh } from "@wa-icons";

    // "in 5 minutes" and the now line go stale: refresh them twice a minute.
    let now = $state(new Date());
    $effect(() => {
        const interval = setInterval(() => (now = new Date()), 30_000);
        return () => clearInterval(interval);
    });

    // The month grid picks the day whose agenda is listed underneath.
    let selectedDay = $state(startOfDay(new Date()));
    let month = $state(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    let days = $derived(
        buildAgenda($calendarEventsStore.values(), selectedDay).filter(
            (day) => startOfDay(day.date).getTime() === selectedDay.getTime(),
        ),
    );
    let sections: HTMLElement[] = $state([]);

    function goToday() {
        const current = new Date();
        selectedDay = startOfDay(current);
        month = new Date(current.getFullYear(), current.getMonth(), 1);
    }

    function refresh() {
        refreshCalendar().catch(() => undefined);
    }

    function goToLoginPage() {
        analyticsClient.trackAdminEvent("auth.login_clicked");
        window.location.href = "/login";
    }
</script>

<div class="flex h-full min-h-0 flex-col gap-2 p-2 select-text">
    <header class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 flex-col">
            <h3 class="m-0 truncate text-sm normal-case leading-tight">
                {$LL.externalModule.calendar.title()}
            </h3>
            <span class="truncate text-xs text-contrast-200">
                {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            </span>
        </div>
        <div class="flex shrink-0 items-center gap-1">
            <Button size="xs" variant="light" appearance="border" class="m-0" onclick={goToday}>Today</Button>
            <button
                type="button"
                aria-label="Refresh calendar"
                data-testid="refreshCalendarButton"
                class="hover:bg-white/10 flex aspect-square h-7 w-7 items-center justify-center rounded !text-white"
                onclick={refresh}
            >
                <IconRefresh font-size="16" />
            </button>
        </div>
    </header>

    <div class="h-px bg-white/10" aria-hidden="true"></div>

    {#if !$userIsConnected && get(externalSvelteComponentService.getComponentsByZone("calendarButton")).size == 0}
        <Button variant="secondary" onclick={goToLoginPage}>{$LL.menu.profile.login()}</Button>
    {/if}
    {#if get(externalSvelteComponentService.getComponentsByZone("calendarButton")).size > 0}
        <div class="flex flex-col items-center justify-center">
            <ExternalComponents zone="calendarButton" />
        </div>
    {/if}

    <CalendarMonthGrid
        events={[...$calendarEventsStore.values()]}
        selected={selectedDay}
        {month}
        onmonth={(value) => (month = value)}
        onselect={(date) => (selectedDay = startOfDay(date))}
    />

    {#if days.length > 0}
        <div class="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
            {#each days as day, dayIndex (day.date.getTime())}
                <section bind:this={sections[dayIndex]} class="flex flex-col gap-1 pb-2">
                    <div class="flex flex-col gap-1 border-0 border-b border-solid border-white/10 py-1">
                        <div class="flex items-baseline justify-between gap-2">
                            <h4 class="m-0 font-title text-sm font-medium normal-case">
                                {formatDayName(day.date, now)}
                                <span class="font-main text-xs font-normal text-contrast-200">
                                    {day.date.toLocaleDateString(undefined, { day: "numeric", month: "long" })}
                                </span>
                            </h4>
                            <span class="whitespace-nowrap text-xs text-contrast-200">
                                {$LL.externalModule.calendar.meetingCount({ count: day.count })}
                            </span>
                        </div>
                        {#each day.allDay as event (event.id)}
                            <div class="flex items-center gap-2 rounded-sm bg-secondary-300/15 px-2 py-1 text-sm">
                                <span class="text-contrast-200">{$LL.externalModule.calendar.allDay()}</span>
                                <span class="truncate font-bold">{event.title}</span>
                            </div>
                        {/each}
                    </div>

                    <!-- Finished meetings stay in the list, muted; the ones in progress show how far along they are. -->
                    <div class="flex flex-col">
                        {#each day.items as item (item.kind === "overlap" ? `overlap-${item.events[0].id}` : item.event.id)}
                            {#if item.kind === "overlap"}
                                <CalendarOverlapGroup start={item.start} end={item.end} events={item.events} {now} />
                            {:else}
                                <CalendarEventRow event={item.event} long={item.kind === "long"} {now} />
                            {/if}
                        {/each}
                    </div>
                </section>
            {/each}
        </div>
    {:else if $userIsConnected}
        <p class="m-0 text-sm text-contrast-200">{$LL.externalModule.calendar.noMeetings()}</p>
    {/if}
</div>
