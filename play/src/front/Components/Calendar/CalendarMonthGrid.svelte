<script lang="ts">
    import type { CalendarEventInterface } from "@workadventure/shared-utils";
    import { untrack } from "svelte";
    import { SvelteDate, SvelteMap } from "svelte/reactivity";
    import Button from "../UI/Button.svelte";
    import { startOfDay } from "./agenda";

    interface Props {
        events: CalendarEventInterface[];
        selected: Date;
        onselect: (date: Date) => void;
    }

    let { events, selected, onselect }: Props = $props();

    // Seeded once from the incoming day: after that the grid navigates on its own.
    let cursor = new SvelteDate(
        untrack(() => selected.getFullYear()),
        untrack(() => selected.getMonth()),
        1,
    );
    let today = new SvelteDate(startOfDay(new Date()));

    let counts = $derived.by(() => {
        const map = new SvelteMap<number, number>();
        for (const event of events) {
            const key = startOfDay(event.start).getTime();
            map.set(key, (map.get(key) ?? 0) + 1);
        }
        return map;
    });

    // Six weeks of seven days keeps every month the same height, so the agenda below never jumps.
    let weeks = $derived.by(() => {
        const first = new SvelteDate(cursor.getFullYear(), cursor.getMonth(), 1);
        const start = new SvelteDate(first);
        start.setDate(first.getDate() - ((first.getDay() + 6) % 7));

        const days: { date: SvelteDate; inMonth: boolean; count: number; isToday: boolean; isSelected: boolean }[] = [];
        for (let index = 0; index < 42; index++) {
            const date = new SvelteDate(start);
            date.setDate(start.getDate() + index);
            const key = startOfDay(date).getTime();
            days.push({
                date,
                inMonth: date.getMonth() === cursor.getMonth(),
                count: counts.get(key) ?? 0,
                isToday: key === today.getTime(),
                isSelected: key === startOfDay(selected).getTime(),
            });
        }
        return days;
    });

    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    function shiftMonth(delta: number) {
        cursor.setFullYear(cursor.getFullYear(), cursor.getMonth() + delta, 1);
    }

    function goToday() {
        const now = new SvelteDate();
        today.setTime(startOfDay(now).getTime());
        cursor.setFullYear(now.getFullYear(), now.getMonth(), 1);
        onselect(now);
    }
</script>

<div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between gap-2">
        <Button variant="light" appearance="border" size="xs" class="m-0" onclick={() => shiftMonth(-1)}>‹</Button>
        <h4 class="m-0 text-sm font-semibold">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h4>
        <div class="flex items-center gap-1">
            <Button variant="light" appearance="border" size="xs" class="m-0" onclick={goToday}>Today</Button>
            <Button variant="light" appearance="border" size="xs" class="m-0" onclick={() => shiftMonth(1)}>›</Button>
        </div>
    </div>

    <div class="grid grid-cols-7 gap-0.5 text-center text-xxs uppercase text-contrast-200">
        {#each weekdays as weekday (weekday)}
            <span>{weekday}</span>
        {/each}
    </div>

    <div class="grid grid-cols-7 gap-0.5">
        {#each weeks as day (day.date.getTime())}
            <button
                type="button"
                class="relative flex h-8 items-center justify-center rounded-sm text-sm transition-colors
                    {day.isSelected
                    ? 'bg-secondary text-white'
                    : day.isToday
                      ? 'font-bold text-secondary'
                      : 'text-whitesmoke'}
                    {day.inMonth ? '' : 'opacity-35'}
                    {day.isSelected ? '' : 'hover:bg-white/10'}"
                onclick={() => onselect(day.date)}
            >
                {day.date.getDate()}
                {#if day.count > 0}
                    <span
                        class="absolute bottom-0.5 h-1 w-1 rounded-full {day.isSelected ? 'bg-white' : 'bg-secondary'}"
                    ></span>
                {/if}
            </button>
        {/each}
    </div>
</div>
