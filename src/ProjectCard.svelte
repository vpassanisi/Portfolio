<script>
  import { fly } from "svelte/transition";
  import { quadInOut, quartInOut, expoInOut } from "svelte/easing";
  import { media } from "./stores/watchMedia.js";

  export let project;
  let hovering;
  let offset;
  const bg = project.background;

  $: if ($media.xl) {
    offset = -510;
  } else if ($media.lg) {
    offset = -320;
  } else if ($media.md) {
    offset = -350;
  } else if ($media.sm) {
    offset = -380;
  } else {
    offset = -625;
  }

  function enter() {
    hovering = true;
  }

  function leave() {
    hovering = false;
  }
</script>

<style>
  .project-height {
    height: 20rem;
  }
</style>

<div
  on:mouseenter={enter}
  on:touchstart={enter}
  on:mouseleave={leave}
  on:touchend={leave}
  style={`background: url(${project.background}) top center/cover no-repeat`}
  class="relative overflow-hidden w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5
  project-height border-2 border-black bg">
  <!-- <div class="inline-block bg-gray-900">
    <img class="h-12 w-12 m-2" src={project.baseIcon} alt="" />
  </div> -->
  <div
    class="absolute flex items-center justify-center bottom-0 bg-gray-900
    text-white w-full h-12 font-hairline text-xl">
    {project.title}
  </div>

  {#if hovering}
    <div
      transition:fly={{ duration: 550, easing: quartInOut, x: offset, opacity: 1 }}
      class="absolute bg-blue-gray-700 w-full h-full top-0 bottom-0 left-0
      right-0" />
    <div
      transition:fly={{ duration: 750, easing: expoInOut, x: offset, opacity: 1 }}
      class="absolute bg-blue-gray-50 w-full h-full top-0 bottom-0 left-0
      right-0 p-2">
      <div class="mt-8">
        <p class="font-bold">Build With:</p>
        <div class="flex flex-wrap bg-gray-400 rounded-md">
          {#each project.technologies as tech}
            <div class="bg-black text-white rounded-md m-1 p-2">
              {tech.tech}
            </div>
          {/each}
        </div>
      </div>
      <div class="absolute top-0 right-0 p-2">
        <img class="h-12 w-12 " src={project.overlayIcon} alt="" />
      </div>
      <div
        class="absolute bottom-0 right-0 flex items-center justify-center
        bg-gray-900 text-white w-full block h-12">
        GO TO PROJECT
      </div>

      <a
        class="absolute top-0 bottom-0 left-0 right-0 h-full w-full z-10"
        href={project.url}>
        {''}
      </a>
    </div>
  {/if}
</div>
