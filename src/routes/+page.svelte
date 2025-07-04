<script>
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import { linear, quadOut } from 'svelte/easing';
  import { Tween } from 'svelte/motion';

  let words = [];
  let allWords;
  let currentWords = $state([]);
  let inputElement = $state(null);
  let userInput = $state('');
  let activeWordIndex = $state(0);
  let typedWords = $state([]);
  let wordCorrectness = $state([]);
  let charElements = $state([]);
  let windowSize = $state({ width: window.innerWidth, height: window.innerHeight });
  let maxRowHeight = $state('');
  let rowCount = $state(3);
  let rowGap = $state(20);
  let rowHeight = $state(0);
  let scrollOffset = $state(0);
  let testStartTime = $state(0);
  let timerDuration = $state(30);
  let timeRemaining = $derived(timerDuration);
  let wpm = $state(0);
  let interval;
  let testPhase = $state('waiting');
  let restarting = $state(false);
  let isFocused = $state(true);
  let spaceHandledByKeydown = false;

  // Svelte tween for smooth caret animation
  const caretPosition = new Tween(
    { top: 0, left: 0, height: 0 },
    {
      delay: 0,
      easing: linear,
      duration: 65
    }
  );

  onMount(async () => {
    const wordsResponse = await fetch('/english200.json');
    allWords = await wordsResponse.json();

    words = allWords.words;
    prepareWords(words);

    currentWords = getNextWords(500);

    // Pre-fill the charElements array with empty arrays so Svelte can bind to them.
    // We create an array of empty arrays, one for each word.
    prefillCharElements();

    // Set initial caret position correctly after mount using tick()
    await tick();

    const initialChar = charElements[0]?.[0];
    if (initialChar) {
      // Get the parent div of the first character, which is our word div
      const rowElement = initialChar.parentElement;

      if (rowElement) {
        rowHeight = rowElement.offsetHeight; // This is the true height of one line of words
        const buffer = 10;

        // Calculate the total height of rows plus n-1 gaps between them

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

    if (!charElements[wordIndex]?.[0] || rowHeight === 0) {
      scrollOffset = 0; // Reset scroll
      caretPosition.target = { top: 0, left: 0, height: 0 };
      return;
    }

    const activeWordElement = charElements[wordIndex][0].parentElement;
    if (!activeWordElement) return;

    // Calculate scroll offset
    const activeRowIndex = Math.floor(activeWordElement.offsetTop / (rowHeight + rowGap));
    let newScrollOffset = 0;
    if (activeRowIndex >= 2) {
      newScrollOffset = -((activeRowIndex - 1) * (rowHeight + rowGap));
    }
    scrollOffset = newScrollOffset; // Update the scroll state variable

    // Calculate caret position, using the newScrollOffset
    const wordElements = charElements[wordIndex];

    if (charIndex >= wordElements.length) {
      const lastCharElement = wordElements[wordElements.length - 1];
      if (!lastCharElement) return;
      caretPosition.target = {
        top: lastCharElement.offsetTop + newScrollOffset,
        left: lastCharElement.offsetLeft + lastCharElement.offsetWidth,
        height: lastCharElement.offsetHeight
      };
      return;
    }

    const targetCharElement = wordElements[charIndex];
    if (!targetCharElement?.parentElement) return;
    caretPosition.target = {
      top: targetCharElement.offsetTop + newScrollOffset,
      left: targetCharElement.offsetLeft - 2,
      height: targetCharElement.offsetHeight
    };
  });

  function prefillCharElements() {
    charElements = Array(currentWords.length)
      .fill(0)
      .map(() => []);
  }

  function prepareWords(wordsArray) {
    words = shuffleArray([...wordsArray]);
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function getNextWords(n) {
    if (words.length === 0) {
      return [];
    }

    const newWordList = [];

    // Keep track of the last word we added to the list
    let lastWord = null;

    for (let i = 0; i < n; i++) {
      let nextWord;

      // This loop will continue until we find a word that is different from the last one
      do {
        const randomIndex = Math.floor(Math.random() * words.length);
        nextWord = words[randomIndex];
      } while (nextWord === lastWord && words.length > 1);

      newWordList.push(nextWord);
      lastWord = nextWord;
    }

    return newWordList;
  }

  function handleWindowResize() {
    windowSize = { width: window.innerWidth, height: window.innerHeight };
  }

  function handleKeydown(event) {
    const currentWord = currentWords[activeWordIndex];

    if (testPhase !== 'running') {
      // Only printable keys can start a test
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        startTest();
      }
    }

    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();

      if (userInput === '') {
        return;
      }

      wordCorrectness[activeWordIndex] = userInput === currentWord;

      typedWords[activeWordIndex] = userInput;
      userInput = '';
      activeWordIndex++;

      spaceHandledByKeydown = true; // mark space handled here
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

  function handleInput(e) {
    const value = e.target.value;

    if (spaceHandledByKeydown) {
      // Reset flag and skip to avoid double handling space input
      spaceHandledByKeydown = false;
      return;
    }

    if (value.endsWith(' ')) {
      // Get the word content without the space
      const wordContent = value.slice(0, -1);

      // Don't advance on empty word
      if (wordContent === '') return;

      const currentWord = currentWords[activeWordIndex];
      wordCorrectness[activeWordIndex] = wordContent === currentWord;
      typedWords[activeWordIndex] = wordContent;
      userInput = '';
      activeWordIndex++;
    }
  }

  function startTest() {
    testPhase = 'running';
    testStartTime = Date.now();

    interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
      timeRemaining = timerDuration - elapsed;

      if (timeRemaining <= 0) {
        clearInterval(interval);
        inputElement.disabled = true;
        wpm = calculateWPM();
        testPhase = 'finished';
      }
    }, 1000);
  }

  function calculateWPM() {
    // Calculate correct characters from all completed words
    let totalCorrectChars = 0;
    for (let i = 0; i < activeWordIndex; i++) {
      if (wordCorrectness[i] === true) {
        totalCorrectChars += currentWords[i].length + 1;
      }
    }

    // Add correct characters from the final active word (the one the user was typing when the test ended)
    const activeWord = currentWords[activeWordIndex];
    if (activeWord) {
      for (let i = 0; i < userInput.length; i++) {
        if (userInput[i] === activeWord[i]) {
          totalCorrectChars++;
        }
      }
    }

    // Calculate WPM using the standard formula (a word is 5 characters)
    // We use the actual elapsed time for accuracy, but cap it at the test duration.
    const elapsedSeconds = (Date.now() - testStartTime) / 1000;
    const elapsedMinutes = Math.min(elapsedSeconds, timerDuration) / 60;

    const grossWPM = totalCorrectChars / 5 / elapsedMinutes;

    return Math.round(grossWPM);
  }

  async function restartTest() {
    restarting = true;
    testPhase = 'waiting';
    scrollOffset = 0;
    // Wait 200ms to let words box div opacity reach 0
    await new Promise((resolve) => setTimeout(resolve, 200));
    // We get large negative value sometimes without this
    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    inputElement.disabled = false;
    words = allWords.words;
    prepareWords(words);
    currentWords = getNextWords(500);
    activeWordIndex = 0;
    userInput = '';
    wordCorrectness = [];
    typedWords = [];
    timeRemaining = timerDuration;
    focusInput();
    restarting = false;
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
  <div class="relative">
    <div
      class="absolute flex space-x-10 rounded-lg bg-gray-100 p-2 text-2xl text-gray-400 transition-opacity duration-300"
      style="top: -2.5em; left: 50%; transform: translateX(-50%);"
      class:opacity-0={testPhase === 'running' || testPhase === 'finished'}
      class:pointer-events-none={testPhase === 'running' || testPhase === 'finished'}
    >
      <button
        onclick={() => {
          timerDuration = 15;
          focusInput();
        }}
        onmousedown={(e) => e.preventDefault()}
        class="cursor-pointer rounded-lg p-2 transition-colors duration-300 hover:bg-gray-300"
        class:text-gray-700={timerDuration === 15}>15<span class="text-[0.85em]">s</span></button
      >
      <button
        onclick={() => {
          timerDuration = 30;
          focusInput();
        }}
        onmousedown={(e) => e.preventDefault()}
        class="cursor-pointer rounded-lg p-2 transition-colors duration-300 hover:bg-gray-300"
        class:text-gray-700={timerDuration === 30}>30<span class="text-[0.85em]">s</span></button
      >
      <button
        onclick={() => {
          timerDuration = 60;
          focusInput();
        }}
        onmousedown={(e) => e.preventDefault()}
        class="cursor-pointer rounded-lg p-2 transition-colors duration-150 hover:bg-gray-300"
        class:text-gray-700={timerDuration === 60}>60<span class="text-[0.85em]">s</span></button
      >
    </div>

    <div
      class="pointer-events-none absolute p-2 text-4xl text-gray-400 transition-opacity duration-300"
      style="top: -1.5em; left: 0.85em;"
      class:opacity-0={testPhase !== 'running'}
      ontransitionend={() => (timeRemaining = timerDuration)}
    >
      {timeRemaining}
    </div>

    <div
      class="pointer-events-none absolute p-2 text-4xl text-gray-400 transition-opacity duration-300"
      style="top: -1.4em; left: 0.85em;"
      class:opacity-0={testPhase !== 'finished'}
    >
      {wpm} wpm
    </div>

    <div
      class="no-ligatures relative mx-8 cursor-text overflow-hidden text-4xl transition-opacity lg:max-w-325"
      style:max-height={maxRowHeight}
      onclick={focusInput}
      onkeydown={handleContainerKeyDown}
      role="button"
      tabindex="0"
      class:blur-[1.5px]={!isFocused || testPhase === 'finished'}
      class:opacity-0={restarting}
      onmousedown={(e) => e.preventDefault()}
    >
      <input
        autocapitalize="off"
        autocorrect="off"
        autocomplete="off"
        spellcheck="false"
        class="pointer-events-auto absolute opacity-0"
        type="text"
        id="typinginput"
        bind:value={userInput}
        bind:this={inputElement}
        onkeydown={handleKeydown}
        oninput={handleInput}
        onfocus={() => (isFocused = true)}
        onblur={() => (isFocused = false)}
      />

      <div
        id="words-container"
        class="flex flex-wrap justify-start gap-x-4 p-2 transition-transform duration-150 ease-in-out"
        style:row-gap="{rowGap}px"
        style:transform="translateY({scrollOffset}px)"
      >
        {#each currentWords as word, i (i)}
          {@const isCompleted = i < activeWordIndex}
          {@const isActive = i === activeWordIndex}
          {@const isWordCorrect = i in wordCorrectness ? wordCorrectness[i] : true}
          {@const inputForThisWord = isCompleted ? typedWords[i] : isActive ? userInput : ''}

          <div
            class:underline={!isWordCorrect && isCompleted}
            class:decoration-red-500={!isWordCorrect}
            class:decoration-3={!isWordCorrect}
          >
            {#if isCompleted || isActive}
              {#each word as char, j (j)}
                {@const isTyped = j < (inputForThisWord?.length || 0)}
                {@const isCorrect = isTyped && inputForThisWord[j] === char}
                <span
                  class:text-green-500={isTyped && isCorrect}
                  class:text-red-500={isTyped && !isCorrect}
                  class:text-gray-500={!isTyped && isActive}
                  class:text-gray-400={isCompleted && !isTyped}
                  bind:this={charElements[i][j]}
                >
                  {char}
                </span>
              {/each}{#each inputForThisWord?.length > word.length ? inputForThisWord.slice(word.length) : '' as extraChar, k (k)}
                <span class="text-red-500" bind:this={charElements[i][word.length + k]}>
                  {extraChar}
                </span>
              {/each}
            {:else}
              <span class="text-gray-400">{word}</span>
            {/if}
          </div>
        {/each}
      </div>

      <div
        class="absolute w-1 rounded-sm bg-gray-600"
        style:top="{caretPosition.current.top}px"
        style:left="{caretPosition.current.left}px"
        style:height="{caretPosition.current.height}px"
        class:blink-caret={testPhase === 'waiting' && isFocused}
        class:hidden={!isFocused}
      ></div>
    </div>

    <button
      onclick={restartTest}
      class="absolute flex cursor-pointer rounded-lg bg-gray-100 p-2 text-sm duration-300 hover:bg-gray-300 md:space-x-10 md:text-2xl"
      style="top: 11rem; left: 50%; transform: translateX(-50%);"
      tabindex="0"
      onmousedown={(e) => e.preventDefault()}
    >
      <img src="/restart.svg" alt="restart icon" width="30" height="30" />
    </button>
  </div>
</main>
