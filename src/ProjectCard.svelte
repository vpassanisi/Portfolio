<script>
  import { fly } from "svelte/transition";
  import { quadInOut, quartInOut, expoInOut } from "svelte/easing";
  import { media } from "./stores/watchMedia.js";

  export let project;
  let hovering = false;
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
    height: 21rem;
  }
</style>

<div
  on:mouseenter={enter}
  on:mouseleave={leave}
  on:click={enter}
  style={`background: url(${project.background}) top center/cover no-repeat`}
  class="relative overflow-hidden w-full sm:w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5
  project-height border-4 border-black bg">
  <!-- <div class="inline-block bg-gray-900">
    <img class="h-12 w-12 m-2" src={project.baseIcon} alt="" />
  </div> -->
  <div
    class="absolute flex items-center justify-center bottom-0 bg-gray-900
    text-white w-full h-16 font-hairline text-xl">
    {project.title}
  </div>

  {#if hovering}
    <div
      transition:fly={{ duration: 550, easing: quartInOut, x: offset, opacity: 1 }}
      class="absolute bg-black-alpha-60 w-full h-full top-0 bottom-0 left-0
      right-0" />
    <!-- CSS only transitions -->
    <!-- <div
    style={!hovering ? `transform: translateX(${offset}px)` : ''}
    class="absolute bg-black-alpha-60 w-full h-full top-0 bottom-0 left-0
    right-0 transition-transform duration-200 ease-linear" /> -->
    <div
      transition:fly={{ duration: 750, easing: expoInOut, x: offset, opacity: 1 }}
      class=" absolute bg-white w-full h-full top-0 bottom-0 left-0 right-0 p-2">
      <!-- CSS only transitions -->
      <!-- <div
    style={!hovering ? `transform: translateX(${offset}px)` : ''}
    class="absolute bg-white w-full h-full top-0 bottom-0 left-0 right-0 p-2
    transition-transform duration-500 ease-in-out"> -->
      <div class="mt-4">
        <p class="font-bold">Built With:</p>
        <div class="flex flex-wrap bg-gray-400 rounded-md p-1">
          {#each project.technologies as tech}
            <a class="bg-black text-white rounded-md m-1 p-2" href={tech.link}>
              {tech.tech}
            </a>
          {/each}
        </div>
      </div>
      <div class="absolute top-0 right-0 p-2">
        <img class="h-8 w-8 " src={project.overlayIcon} alt="" />
      </div>
      <div
        class="absolute bottom-0 right-0 flex items-center justify-center
        text-white w-full block h-16 bg-gray-900">
        <a
          class="h-full w-3/4 bg-gray-900 hover:bg-gray-800 transition
          duration-500 ease-in-out flex items-center justify-center border-r"
          href={project.url}>
          GO TO PROJECT
        </a>
        <a
          class="h-full w-1/4 bg-gray-900 hover:bg-gray-800 transition
          duration-500 ease-in-out flex items-center justify-center"
          href={project.github}>
          <img
            class="h-12 w-12"
            src="./icons/GitHub-Mark-Light-64px.png"
            alt="" />
        </a>
      </div>
    </div>
  {/if}
</div>
