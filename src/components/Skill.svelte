<script>
  export let skill;

  let hover = false;
</script>

<a
  href={skill.link}
  on:mouseenter={() => (hover = true)}
  on:mouseleave={() => (hover = false)}
  class="w-40 min-w-40 m-4 border rounded shadow p-4 bg-dark-gray-700
  transitions-colors duration-300 ease-in-out hover:bg-dark-gray-600">
  <div class="text-white font-hairline text-2xl mb-2 text-center">
    {skill.name}
  </div>
  <div class="flex items-center justify-center">
    <img
      class={`h-16 transition-transform duration-300 ease-in-out transform ${hover ? 'scale-110' : ''}`}
      src={skill.icon}
      alt="" />
  </div>
</a>
