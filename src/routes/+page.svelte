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

<div class="flex flex-wrap justify-center">
  <input
    class="pointer-events-auto absolute opacity-0"
    type="text"
    id="typinginput"
    bind:value={userInput}
    bind:this={inputElement}
  />

  {#each currentWords as word}
    <span class="m-1">{word}</span>
  {/each}
</div>

<p>Current input: {userInput}</p>
