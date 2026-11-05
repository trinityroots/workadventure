<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { profileAvailable, resolveProfileUrl } from "../../Stores/MenuStore";
    import { iframeListener } from "../../Api/IframeListener";

    let profileIframe: HTMLIFrameElement;
    let profileSrc = "";
    let registered = false;

    onMount(() => {
        if ($profileAvailable) {
            resolveProfileUrl()
                .then((url) => (profileSrc = url))
                .catch(() => (profileSrc = ""));
        }
    });

    $: if (!registered && profileIframe && profileSrc) {
        iframeListener.registerIframe(profileIframe);
        registered = true;
    }

    onDestroy(() => {
        if (registered && profileIframe) iframeListener.unregisterIframe(profileIframe);
    });
</script>

<div class="customize-main">
    <div class="content">
        <section class="centered-column w-full m-auto resizing-text">
            {#if $profileAvailable && profileSrc}
                <iframe bind:this={profileIframe} title="profile" src={profileSrc} class="w-full h-dvh border-0"
                ></iframe>
            {/if}
        </section>
    </div>
</div>
