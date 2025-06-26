<script>
  import { onMount } from 'svelte';

  let words = [];
  let currentIndex = 0;
  let currentWords = $state([]);

  let inputElement;
  let userInput = $state('');

  onMount(async () => {
    const wordsResponse = await fetch('/english1k.json');
    const allWords = await wordsResponse.json();

    words = allWords.words;
    prepareWords(words);

    currentWords = getNextWords(100);

    inputElement.focus();
  });

  function prepareWords(wordsArray) {
    words = fisherYatesShuffle([...wordsArray]);
    currentIndex = 0;
  }

  function fisherYatesShuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function getNextWords(n) {
    if (currentIndex + n > words.length) {
      words = fisherYatesShuffle([...words]);
      currentIndex = 0;
    }

    const nextWords = words.slice(currentIndex, currentIndex + n);
    currentIndex += nextWords.length;
    return nextWords;
  }
</script>

<div class="mx-8 flex flex-wrap justify-center gap-x-4 lg:mx-48">
  <input
    class="pointer-events-auto absolute opacity-0"
    type="text"
    id="typinginput"
    bind:value={userInput}
    bind:this={inputElement}
  />

  {#each currentWords as word, i (i)}
    <div>
      {#each word as char, j (j)}
        <span class="text-4xl">{char}</span>
      {/each}
    </div>
  {/each}
</div>

<p>Current input: {userInput}</p>
