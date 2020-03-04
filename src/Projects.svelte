<script>
  import projects from "./Data/projectsInfo.js";
  import ProjectCard from "./ProjectCard.svelte";
</script>

<section>
  <div
    class="flex items-center justify-center text-white text-6xl font-hairline
    tracking-wider">
    Projects
  </div>
  <hr class="text-white" />
  <div class="flex flex-wrap">
    {#each projects as project, i}
      <ProjectCard {project} />
    {/each}
  </div>
</section>
