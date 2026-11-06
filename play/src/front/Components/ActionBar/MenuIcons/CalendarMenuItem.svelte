<script lang="ts">
    import { get } from "svelte/store";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { IconCalendar } from "../../Icons";
    import { closeCalendarSidebar, isCalendarSidebarOpen, openCalendarSidebar } from "../../Calendar/sidebar";
    import { inputFormFocusStore } from "../../../Stores/UserInputStore";
    import LL from "../../../../i18n/i18n-svelte";

    function toggleCalendar() {
        if (isCalendarSidebarOpen()) closeCalendarSidebar();
        else openCalendarSidebar();
    }

    // The tooltip advertises L, so the key has to actually toggle the agenda.
    function onKeydown(event: KeyboardEvent) {
        if (event.key !== "l" || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
        if (get(inputFormFocusStore)) return;
        const target = event.target;
        if (
            target instanceof HTMLElement &&
            (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
        )
            return;
        event.preventDefault();
        toggleCalendar();
    }
</script>

<svelte:window onkeydown={onKeydown} />

<ActionBarButton
    onclick={toggleCalendar}
    classList="group/btn-calendar"
    tooltipTitle={$LL.actionbar.help.calendar.title()}
    desc={$LL.actionbar.help.calendar.desc()}
    dataTestId="calendar-button"
    disabledHelp={false}
    tooltipShortcuts={["l"]}
>
    <!-- Outline by default, a solid silhouette while hovered: same read as the chat and users buttons.
         The path carries its own stroke-width="2", so the rule has to target the path, not the svg. -->
    <IconCalendar class="text-white [&>path]:[stroke-width:1.5] h-6 w-6 group-hover/btn-calendar:hidden" />
    <svg
        class="hidden h-6 w-6 text-white group-hover/btn-calendar:block"
        viewBox="0 0 24 24"
        fill="currentColor"
        fill-rule="evenodd"
        aria-hidden="true"
    >
        <path
            d="M7 2h2v2h6V2h2v2h1a3 3 0 0 1 3 3v3H3V7a3 3 0 0 1 3-3h1V2ZM3 12h18v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7Z"
        />
    </svg>
</ActionBarButton>
