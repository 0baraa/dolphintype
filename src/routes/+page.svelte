<script>
  import { onMount } from 'svelte';

  let words = [];
  let currentIndex = 0;
  let currentWords = $state([]);

  let inputElement;
  let userInput = $state('');

  let activeWordIndex = $state(0);
  let typedWords = $state([]);
  let wordCorrectness = $state([]);

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

  function handleKeydown(event) {
    if (event.key === ' ') {
      event.preventDefault();

      if (userInput === '') {
        return;
      }

      const currentWord = currentWords[activeWordIndex];
      wordCorrectness[activeWordIndex] = userInput === currentWord;

      typedWords[activeWordIndex] = userInput;
      userInput = '';
      activeWordIndex++;
    } else if (event.key === 'Backspace') {
      const isPreviousWordCorrect = wordCorrectness[activeWordIndex - 1];
      if (activeWordIndex > 0 && userInput === '' && !isPreviousWordCorrect) {
        event.preventDefault();
        activeWordIndex--;
        userInput = typedWords[activeWordIndex];
      }
    }
  }
</script>

<main class="flex min-h-screen flex-col items-center justify-center bg-gray-100">
  <div class="mx-8 flex flex-wrap justify-center gap-x-4 lg:mx-48">
    <input
      class="pointer-events-auto absolute opacity-0"
      type="text"
      id="typinginput"
      bind:value={userInput}
      bind:this={inputElement}
      onkeydown={handleKeydown}
    />

    {#each currentWords as word, i (i)}
      {@const isCompleted = i < activeWordIndex}
      {@const isActive = i === activeWordIndex}
      {@const isWordCorrect = i in wordCorrectness ? wordCorrectness[i] : true}

      {@const inputForThisWord = isCompleted ? typedWords[i] : isActive ? userInput : ''}

      <div
        class:no-ligatures={true}
        class:underline={!isWordCorrect}
        class:decoration-red-500={!isWordCorrect}
        class:decoration-wavy={!isWordCorrect}
      >
        {#if isCompleted || isActive}
          {#each word as char, j (j)}
            {@const isTyped = j < (inputForThisWord?.length || 0)}
            {@const isCorrect = isTyped && inputForThisWord[j] === char}
            <span
              class="text-4xl"
              class:text-green-500={isTyped && isCorrect}
              class:text-red-500={isTyped && !isCorrect}
              class:text-gray-500={!isTyped && isActive}
              class:text-gray-400={isCompleted && !isTyped}
            >
              {char}
            </span>
          {/each}
          {@const extraChars =
            inputForThisWord.length > word.length ? inputForThisWord.slice(word.length) : ''}
          {#each extraChars as extraChar, k (k)}
            <span class="text-4xl text-red-500">
              {extraChar}
            </span>
          {/each}
        {:else}
          <span class="text-4xl text-gray-400">{word}</span>
        {/if}
      </div>
    {/each}
  </div>

  <p>activeWordIndex: {activeWordIndex} ({currentWords[activeWordIndex]})</p>
  <p>userInput: {userInput}</p>
  <p>typedWords: {typedWords}</p>
</main>
