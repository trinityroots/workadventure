<script lang="ts">
    import type { CalendarEventInterface } from "@workadventure/shared-utils";
    import { SvelteDate, SvelteMap } from "svelte/reactivity";
    import { startOfDay } from "./agenda";
    import { IconChevronLeft, IconChevronRight } from "@wa-icons";

    interface Props {
        events: CalendarEventInterface[];
        selected: Date;
        month: Date;
        onmonth: (month: Date) => void;
        onselect: (date: Date) => void;
    }

    let { events, selected, month, onmonth, onselect }: Props = $props();

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
        const first = new SvelteDate(month.getFullYear(), month.getMonth(), 1);
        const start = new SvelteDate(first);
        start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
        const todayKey = startOfDay(new SvelteDate()).getTime();

        const days: { date: SvelteDate; inMonth: boolean; count: number; isToday: boolean; isSelected: boolean }[] = [];
        for (let index = 0; index < 42; index++) {
            const date = new SvelteDate(start);
            date.setDate(start.getDate() + index);
            const key = startOfDay(date).getTime();
            days.push({
                date,
                inMonth: date.getMonth() === month.getMonth(),
                count: counts.get(key) ?? 0,
                isToday: key === todayKey,
                isSelected: key === startOfDay(selected).getTime(),
            });
        }
        return days;
    });

    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    function shiftMonth(delta: number) {
        onmonth(new SvelteDate(month.getFullYear(), month.getMonth() + delta, 1));
    }
</script>

<div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-center gap-1.5">
        <button
            type="button"
            aria-label="Previous month"
            class="hover:bg-white/10 flex h-7 w-7 items-center justify-center rounded-full !text-white"
            onclick={() => shiftMonth(-1)}
        >
            <IconChevronLeft class="h-4 w-4" />
        </button>
        <h4 class="m-0 min-w-40 text-center text-sm font-semibold">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </h4>
        <button
            type="button"
            aria-label="Next month"
            class="hover:bg-white/10 flex h-7 w-7 items-center justify-center rounded-full !text-white"
            onclick={() => shiftMonth(1)}
        >
            <IconChevronRight class="h-4 w-4" />
        </button>
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
                aria-current={day.isToday ? "date" : undefined}
                aria-pressed={day.isSelected}
                aria-label={day.date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                class="relative flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors
                    {day.isSelected
                    ? 'bg-secondary font-bold text-white'
                    : day.isToday
                      ? 'font-bold text-secondary ring-2 ring-inset ring-secondary'
                      : 'text-whitesmoke hover:bg-white/10'}
                    {day.inMonth ? '' : 'opacity-35'}"
                onclick={() => onselect(day.date)}
            >
                <span>{day.date.getDate()}</span>
                {#if day.count > 0}
                    <span class="flex gap-0.5" aria-hidden="true">
                        {#each [0, 1, 2].slice(0, Math.min(day.count, 3)) as dot (dot)}
                            <span class="h-1 w-1 rounded-full {day.isSelected ? 'bg-white' : 'bg-light-blue'}"></span>
                        {/each}
                    </span>
                {/if}
            </button>
        {/each}
    </div>
</div>
