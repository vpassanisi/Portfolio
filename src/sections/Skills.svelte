<script>
  import { tech } from "../Data/projectsInfo.js";
  import Skill from "../components/Skill.svelte";

  let skills = [];
  const list = [
    "JavaScript",
    "TypeScript",
    "React",
    "Vue",
    "Svelte",
    "Node",
    "Express",
    "Koa",
    "Webpack",
    "HTML",
    "CSS",
    "TailwindCSS",
    "MaterializeCSS",
    "Golang",
    "MongoDB",
    "GitHub"
  ];

  for (let i = 0; i < list.length; i++) {
    skills.push(tech[list[i]]);
  }
</script>

<section>

  <div
    class="flex flex-col items-center justify-center text-white text-6xl
    font-hairline tracking-wider">
    Skills
    <hr class="w-64 text-white mb-4" />
  </div>
  <div
    class="flex flex-wrap items-center justify-center max-w-screen-xl mx-auto">
    {#each skills as skill}
      <Skill {skill} />
    {/each}
  </div>

</section>
