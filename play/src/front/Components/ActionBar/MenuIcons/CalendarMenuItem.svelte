<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import { IconCalendar, IconCalendarFilled } from "../../Icons";
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
    <!-- Outline by default, solid while hovered: same read as the chat and users buttons. -->
    <IconCalendar class="h-6 w-6 group-hover/btn-calendar:hidden" />
    <IconCalendarFilled class="hidden h-6 w-6 group-hover/btn-calendar:block" />
</ActionBarButton>
