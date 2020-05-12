<script>
  import { javascriptSnippets, goSnippets } from "./Data/snippetsInfo.js";
</script>

<section>
  <div
    class="flex flex-col items-center justify-center text-white text-6xl
    font-hairline tracking-wider mt-8">
    Code Snippets
    <hr class="w-1/3 text-white mb-4" />
  </div>
  <div class="flex justify-center">
    <div class="flex flex-col max-w-screen-xl border p-4 w-full h-full mb-8">

      <div class="text-white text-4xl font-hairline">Javascript</div>
      <div>
        {#each javascriptSnippets as snippet, i}
          <a
            href={snippet.link}
            target="_blank"
            class="flex flex-row text-white w-full sm:w-1/2 py-2 px-4
            bg-gray-900 hover:bg-yellow-400 hover:text-black transitions-colors
            duration-500 ease-in-put ml-4 m-2">
            {snippet.title}
          </a>
        {/each}
      </div>

      <div class="text-white text-4xl font-hairline">Golang</div>
      <div>
        {#each goSnippets as snippet, i}
          <a
            href={snippet.link}
            target="_blank"
            class="flex flex-row text-white w-full sm:w-1/2 p-2 bg-gray-900
            hover:bg-light-blue-300 transitions-colors duration-500 ease-in-put
            ml-4 m-2">
            {snippet.title}
          </a>
        {/each}
      </div>

    </div>
  </div>
</section>
