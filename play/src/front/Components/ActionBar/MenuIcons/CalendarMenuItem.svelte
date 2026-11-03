<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import { IconCalendar } from "../../Icons";
    import { closeCalendarSidebar, isCalendarSidebarOpen, openCalendarSidebar } from "../../Calendar/sidebar";
    import LL from "../../../../i18n/i18n-svelte";

    function toggleCalendar() {
        if (isCalendarSidebarOpen()) closeCalendarSidebar();
        else openCalendarSidebar();
    }
</script>

<ActionBarButton
    onclick={toggleCalendar}
    classList="group/btn-calendar"
    tooltipTitle={$LL.externalModule.calendar.title()}
    dataTestId="calendar-button"
    disabledHelp={false}
>
    <!-- Outline by default, a solid silhouette while hovered: same read as the chat and users buttons. -->
    <IconCalendar class="h-6 w-6 group-hover/btn-calendar:hidden" />
    <svg
        class="hidden h-6 w-6 group-hover/btn-calendar:block"
        viewBox="0 0 24 24"
        fill="currentColor"
        fill-rule="evenodd"
        aria-hidden="true"
    >
        <path
            d="M7 2h2v3h6V2h2v3h1a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h1V2Zm0 10v5h10v-5H7Z"
        />
    </svg>
</ActionBarButton>
