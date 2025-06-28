<script>
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import { Tween } from 'svelte/motion';

  let words = [];
  let currentIndex = 0;
  let currentWords = $state([]);
  let inputElement;
  let userInput = $state('');
  let activeWordIndex = $state(0);
  let typedWords = $state([]);
  let wordCorrectness = $state([]);
  let charElements = $state([]);
  let windowSize = $state({ width: window.innerWidth, height: window.innerHeight });
  let maxRowHeight = $state('');
  let rowCount = $state(3);
  let rowGap = $state(20);

  // Svelte tween for smooth caret animation
  const caretPosition = new Tween(
    { top: 0, left: 0, height: 0 },
    {
      duration: 80
    }
  );

  onMount(async () => {
    const wordsResponse = await fetch('/english1k.json');
    const allWords = await wordsResponse.json();

    words = allWords.words;
    prepareWords(words);

    currentWords = getNextWords(100);

    // Pre-fill the charElements array with empty arrays so Svelte can bind to them.
    // We create an array of empty arrays, one for each word.
    charElements = Array(currentWords.length)
      .fill(0)
      .map(() => []);

    // Set initial caret position correctly after mount using tick()
    await tick();

    const initialChar = charElements[0]?.[0];
    if (initialChar) {
      // Get the parent div of the first character, which is our word div
      const rowElement = initialChar.parentElement;

      if (rowElement) {
        const rowHeight = rowElement.offsetHeight; // This is the true height of one line of words
        const buffer = 10;

        // Calculate the total height of rows plus n-1  gaps between them
        maxRowHeight = `${rowHeight * rowCount + rowGap * (rowCount - 1) + buffer}px`;
      }

      caretPosition.set({
        top: initialChar.offsetTop,
        left: initialChar.offsetLeft - 2,
        height: initialChar.offsetHeight
      });
    }

    inputElement.focus();

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  });

  $effect(() => {
    // Effect dependencies
    const wordIndex = activeWordIndex;
    const charIndex = userInput.length;
    // Reference windowSize so that effect runs on window resize
    JSON.stringify(windowSize);

    // Clean up
    if (charElements[wordIndex]) {
      const currentWord = currentWords[wordIndex] || '';
      const requiredLength = Math.max(currentWord.length, userInput.length);

      if (charElements[wordIndex].length > requiredLength) {
        charElements[wordIndex].length = requiredLength;
      }
    }

    if (!charElements[wordIndex] || currentWords.length === 0) {
      // Update the tween's target value using the .target property
      caretPosition.target = { top: 0, left: 0, height: 0 };
      return;
    }

    const wordElements = charElements[wordIndex];

    // We are at the end of the word
    if (charIndex >= wordElements.length) {
      const lastCharElement = wordElements[wordElements.length - 1];
      if (!lastCharElement) {
        caretPosition.target = { top: 0, left: 0, height: 0 };
        return;
      }
      caretPosition.target = {
        top: lastCharElement.offsetTop,
        left: lastCharElement.offsetLeft + lastCharElement.offsetWidth,
        height: lastCharElement.offsetHeight
      };
      return;
    }

    const targetCharElement = wordElements[charIndex];

    // if (!targetCharElement?.parentElement) {
    //   return;
    // }

    // We are not at the end of the word, set caret to be right behind current char
    caretPosition.target = {
      top: targetCharElement.offsetTop,
      left: targetCharElement.offsetLeft - 2,
      height: targetCharElement.offsetHeight
    };
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

  function handleWindowResize() {
    windowSize = { width: window.innerWidth, height: window.innerHeight };
  }

  function handleKeydown(event) {
    const currentWord = currentWords[activeWordIndex];

    if (event.key === ' ') {
      event.preventDefault();

      if (userInput === '') {
        return;
      }

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
    } else if (userInput.length > currentWord.length + 2) {
      event.preventDefault();
    }
  }

  function focusInput() {
    inputElement?.focus();
  }

  // Makes the container act like a button so keyboard users can use Enter or Space to focus the input.
  function handleContainerKeyDown(event) {
    // Trigger the focus if the user presses Enter or Space on the container
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); // Prevent space from scrolling the page
      focusInput();
    }
  }
</script>

<main class="flex min-h-screen flex-col items-center justify-center bg-gray-100">
  <div
    class="relative mx-8 flex cursor-text flex-wrap justify-center gap-x-4 overflow-hidden lg:mx-48"
    style:max-height={maxRowHeight}
    style:row-gap="{rowGap}px"
    onclick={focusInput}
    onkeydown={handleContainerKeyDown}
    role="button"
    tabindex="0"
  >
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
        class:underline={!isWordCorrect && isCompleted}
        class:decoration-red-500={!isWordCorrect}
        class:decoration-3={!isWordCorrect}
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
              bind:this={charElements[i][j]}
            >
              {char}
            </span>
          {/each}{#each inputForThisWord.length > word.length ? inputForThisWord.slice(word.length) : '' as extraChar, k (k)}
            <span class="text-4xl text-red-500" bind:this={charElements[i][word.length + k]}>
              {extraChar}
            </span>
          {/each}
        {:else}
          <span class="text-4xl text-gray-400">{word}</span>
        {/if}
      </div>
    {/each}

    <div
      class="absolute w-1 animate-pulse rounded-sm bg-gray-600"
      style:top="{caretPosition.current.top}px"
      style:left="{caretPosition.current.left}px"
      style:height="{caretPosition.current.height}px"
    ></div>
  </div>

  <!-- <p>activeWordIndex: {activeWordIndex} ({currentWords[activeWordIndex]})</p>
  <p>userInput: {userInput}</p>
  <p>typedWords: {typedWords}</p> -->
</main>
