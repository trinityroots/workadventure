import { navChat } from "../../Chat/Stores/ChatStore";
import { chatVisibilityStore } from "../../Stores/ChatStore";
import Inventory from "./Inventory.svelte";

export function openInventorySidebar(): void {
    navChat.switchToCustomComponent(Inventory);
    chatVisibilityStore.set(true);
}
