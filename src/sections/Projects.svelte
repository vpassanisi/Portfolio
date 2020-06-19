<script>
  import { projects } from "../Data/projectsInfo.js";
  import ProjectCard from "../components/ProjectCard.svelte";
</script>

<section>
  <div
    class="flex flex-col items-center justify-center text-white text-6xl
    font-hairline tracking-wider">
    Projects
    <hr class="w-64 text-white mb-4" />
  </div>
  <div class="flex justify-center">
    <div class="flex flex-wrap max-w-screen-xl border p-4 w-full h-full">
      {#each projects as project, i}
        <ProjectCard {project} />
      {/each}
    </div>
  </div>

</section>
