<script lang="ts">
    import ActionBarButton from "../ActionBarButton.svelte";
    import { IconCalendar } from "../../Icons";
    import { isActivatedStore, isCalendarVisibleStore } from "../../../Stores/CalendarStore";
    import { menuVisiblilityStore } from "../../../Stores/MenuStore";
    import LL from "../../../../i18n/i18n-svelte";

    function toggleCalendar() {
        if (!$isCalendarVisibleStore) {
            menuVisiblilityStore.set(false);
        }
        isCalendarVisibleStore.set(!$isCalendarVisibleStore);
    }
</script>

<ActionBarButton
    onclick={toggleCalendar}
    classList="group/btn-calendar"
    tooltipTitle={$LL.externalModule.calendar.title()}
    dataTestId="calendar-button"
    state={$isActivatedStore ? "normal" : "disabled"}
    disabledHelp={false}
>
    <IconCalendar />
</ActionBarButton>
