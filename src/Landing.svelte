<script>
  import { fade, scale } from "svelte/transition";
  import { quartInOut } from "svelte/easing";
  import { onMount } from "svelte";

  let show = false;

  onMount(() => {
    setTimeout(() => (show = true), 1000);
  });
</script>

<style>
  .background {
    background: url("/Portfolio-bg-2.jpg") center center/cover no-repeat;
  }
</style>

<section class="w-full h-screen bg-black overflow-hidden">
  {#if show}
    <div in:fade={{ duration: 300 }} class="background w-full h-full">
      <div
        transition:scale={{ delay: 200, duration: 2000, start: 1.2 }}
        class="w-full h-full">
        <div
          in:fade={{ delay: 200, duration: 2000, easing: quartInOut }}
          class="bg-black-alpha-60 flex flex-col items-center justify-center
          w-full h-full">
          <div class="text-center text-white font-hairline text-5xl">
            Vincent Passanisi
          </div>
        </div>
      </div>
    </div>
  {/if}
</section>
