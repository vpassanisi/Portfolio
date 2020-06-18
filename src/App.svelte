<script>
  import Tailwindcss from "./Tailwindcss.svelte";
  import Landing from "./sections/Landing.svelte";
  import Projects from "./sections/Projects.svelte";
  import Snippets from "./sections/Snippets.svelte";
  import Skills from "./sections/Skills.svelte";
</script>

<Tailwindcss />
<main class="w-screen max-w-full">
  <Landing />
  <Skills />
  <Projects />
  <Snippets />
</main>
