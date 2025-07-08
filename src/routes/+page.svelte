<script>
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import { linear } from 'svelte/easing';
  import { Tween } from 'svelte/motion';
  import { RotateCw, Palette } from 'lucide-svelte';
  import { fade } from 'svelte/transition';

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
  let currentTheme = $state('theme-dark');
  let showPaletteMenu = $state(false);
  let currentTestMode = $state('time');
  let prevBreakpoint = window.innerWidth >= 640 ? 'sm-up' : 'below-sm';
  let selectedWordsCount = $state(25);
  let restartButton;

  let mainFont = $state('JetBrains Mono');
  let otherFont = $state('JetBrains Mono');
  let caretColor = $state('');
  let underlineColor = $state('');
  let bgColor = $state('');
  let textDefaultColor = $state('');
  let textActiveColor = $state('');
  let textCorrectColor = $state('');
  let textIncorrectColor = $state('');
  let bgHoverColor = $state('');
  let textSelectedColor = $state('');

  let hoveredTheme = $state(null);
  let customCssBackup = {};
  let isCustomTheme = $state(false);

  let paletteMenuTitle = $derived(getThemeLabel(hoveredTheme ?? currentTheme));

  const cssVars = [
    '--font-family',
    '--font-family-secondary',
    '--color-bg',
    '--color-text-default',
    '--color-text-active',
    '--color-text-correct',
    '--color-text-incorrect',
    '--color-caret',
    '--decoration-incorrect',
    '--color-bg-hover',
    '--color-text-selected'
  ];

  const themePresets = [
    { id: 'theme-dark', label: 'Dark' },
    { id: 'theme-light', label: 'Light' },
    { id: 'theme-solarized-dark', label: 'Solarized Dark' },
    { id: 'theme-solarized-light', label: 'Solarized Light' },
    { id: 'theme-nord', label: 'Nord' },
    { id: 'theme-gruvbox', label: 'Gruvbox' },
    { id: 'theme-monokai', label: 'Monokai' },
    { id: 'theme-tokyo-night', label: 'Tokyo Night' },
    { id: 'theme-one-light', label: 'One Light' },
    { id: 'theme-cobalt2', label: 'Cobalt2' },
    { id: 'theme-synthwave', label: 'Synthwave' },
    { id: 'theme-cyberpunk', label: 'Cyberpunk' },
    { id: 'theme-dracula', label: 'Dracula' },
    { id: 'theme-material-ocean', label: 'Material Ocean' },
    { id: 'theme-night-owl', label: 'Night Owl' },
    { id: 'theme-shades-of-purple', label: 'Shades of Purple' },
    { id: 'theme-ayu-dark', label: 'Ayu Dark' },
    { id: 'theme-ayu-mirage', label: 'Ayu Mirage' },
    { id: 'theme-ayu-light', label: 'Ayu Light' },
    { id: 'theme-zenburn', label: 'Zenburn' },
    { id: 'theme-tomorrow', label: 'Tomorrow' },
    { id: 'theme-tomorrow-night', label: 'Tomorrow Night' },
    { id: 'theme-tomorrow-night-bright', label: 'Tomorrow Night Bright' },
    { id: 'theme-tomorrow-night-eighties', label: 'Tomorrow Night Eighties' },
    { id: 'theme-oceanic-next', label: 'Oceanic Next' },
    { id: 'theme-flatland', label: 'Flatland' },
    { id: 'theme-seth', label: 'Seth' },
    { id: 'theme-panda', label: 'Panda' },
    { id: 'theme-spacemacs', label: 'Spacemacs' },
    { id: 'theme-code-dark', label: 'Code Dark' },
    { id: 'theme-andromeda', label: 'Andromeda' },
    { id: 'theme-material-darker', label: 'Material Darker' }
  ];

  const fontFamilies = [
    'JetBrains Mono',
    'DM Mono',
    'Fira Mono',
    'Inter',
    'Merriweather',
    'Montserrat',
    'Oswald',
    'Outfit',
    'Playfair Display',
    'Source Sans Pro'
  ];

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
    const wordsResponse = await fetch('/wordlists/english200.json');
    allWords = await wordsResponse.json();

    words = allWords.words;
    prepareWords(words);

    currentWords = getNextWords(500);

    // Pre-fill the charElements array with empty arrays so Svelte can bind to them.
    // We create an array of empty arrays, one for each word.
    prefillCharElements();

    await updateRowMetrics();

    inputElement.focus();

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  });

  $effect(() => {
    if (showPaletteMenu) {
      syncPaletteInputs();
    }

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

    const currentBreakpoint = window.innerWidth >= 640 ? 'sm-up' : 'below-sm';

    if (currentBreakpoint !== prevBreakpoint) {
      prevBreakpoint = currentBreakpoint;
      updateRowMetrics(); // only recalculate on breakpoint boundary
    }
  }

  function handleKeydown(event) {
    const currentWord = currentWords[activeWordIndex];

    if (testPhase !== 'running') {
      // Only printable keys can start a test
      if (
        event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        event.key !== ' ' &&
        event.code !== 'Space'
      ) {
        startTest(currentTestMode);
      }
    }

    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();

      if (userInput === '') {
        return;
      }

      if (currentTestMode === 'words') {
        if (activeWordIndex === currentWords.length - 1) {
          endTest();
          return;
        }
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
    } else if (userInput.length > currentWord.length + 2 && event.key.length === 1) {
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

  function startTest(testMode) {
    testPhase = 'running';
    showPaletteMenu = false;
    testStartTime = Date.now();

    if (testMode === 'time') {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - testStartTime) / 1000);
        timeRemaining = timerDuration - elapsed;

        if (timeRemaining <= 0) {
          clearInterval(interval);
          endTest();
        }
      }, 1000);
    }
  }

  function endTest() {
    inputElement.disabled = true;
    wpm = calculateWPM();
    testPhase = 'finished';
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

    if (currentTestMode === 'time') currentWords = getNextWords(500);
    else currentWords = getNextWords(selectedWordsCount);

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

  function updateCssVar(varName, value) {
    isCustomTheme = true;
    document.querySelector('main')?.style.setProperty(varName, value);
  }

  function syncPaletteInputs() {
    const styles = getComputedStyle(document.querySelector('main'));

    mainFont =
      styles.getPropertyValue('--font-family')?.replace(/['"]/g, '').split(',')[0]?.trim() ||
      'JetBrains Mono';
    otherFont =
      styles
        .getPropertyValue('--font-family-secondary')
        ?.replace(/['"]/g, '')
        .split(',')[0]
        ?.trim() || 'JetBrains Mono';
    caretColor = styles.getPropertyValue('--color-caret').trim();
    underlineColor = styles.getPropertyValue('--decoration-incorrect').trim();
    bgColor = styles.getPropertyValue('--color-bg').trim();
    textDefaultColor = styles.getPropertyValue('--color-text-default').trim();
    textActiveColor = styles.getPropertyValue('--color-text-active').trim();
    textCorrectColor = styles.getPropertyValue('--color-text-correct').trim();
    textIncorrectColor = styles.getPropertyValue('--color-text-incorrect').trim();
    bgHoverColor = styles.getPropertyValue('--color-bg-hover').trim();
    textSelectedColor = styles.getPropertyValue('--color-text-selected').trim();
  }

  function getThemeLabel(themeId) {
    if (!hoveredTheme && isCustomTheme === true) {
      return 'Custom';
    }

    const theme = themePresets.find((preset) => preset.id === themeId);
    return theme ? theme.label : themeId;
  }

  async function updateRowMetrics() {
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
  }

  async function resetTabOrder() {
    restartButton?.focus();
    await tick(); // or use setTimeout(() => restartBtn.blur(), 0);
    restartButton?.blur();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<main
  class={`flex min-h-screen flex-col items-center justify-center transition-colors duration-300 ease-in-out ${hoveredTheme || currentTheme}`}
  style="background-color: var(--color-bg); font-family: var(--font-family-secondary);"
  onclick={() => {
    showPaletteMenu = false;
    focusInput();
  }}
>
  <!-- Palette Menu -->
  {#if showPaletteMenu}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute z-50 flex max-h-120 w-full max-w-md flex-col
      space-y-2 overflow-y-auto rounded-lg border bg-[var(--color-bg)] p-4 text-xs
      transition-all duration-300 sm:max-h-screen sm:text-sm"
      style="color: var(--color-text-default); top: 50%; left: 50%; transform: translate(-50%, -50%);"
      transition:fade={{ duration: 200 }}
      onclick={(e) => e.stopPropagation()}
    >
      <div>{paletteMenuTitle}</div>

      <div class="mb-6 flex flex-col justify-center space-y-4">
        <label class="flex items-center">
          <span class="mr-4 inline-block w-28">Main Font</span>
          <select
            bind:value={mainFont}
            onchange={() => updateCssVar('--font-family', `"${mainFont}"`)}
            class="cursor-pointer rounded border bg-transparent px-3 py-1 text-[var(--color-text-default)]"
          >
            {#each fontFamilies as font, f (f)}
              <option value={font}>{font}</option>
            {/each}
          </select>
        </label>

        <label class="flex items-center">
          <span class="mr-4 inline-block w-28">Other Font</span>
          <select
            bind:value={otherFont}
            onchange={() => updateCssVar('--font-family-secondary', `"${otherFont}"`)}
            class="cursor-pointer rounded border bg-transparent px-3 py-1 text-[var(--color-text-default)]"
          >
            {#each fontFamilies as font, f (f)}
              <option value={font}>{font}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="grid grid-cols-2 gap-x-6 gap-y-4">
        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">Background</span>
          <input
            type="color"
            bind:value={bgColor}
            oninput={() => updateCssVar('--color-bg', bgColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">Text</span>
          <input
            type="color"
            bind:value={textDefaultColor}
            oninput={() => updateCssVar('--color-text-default', textDefaultColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">Active Text</span>
          <input
            type="color"
            bind:value={textActiveColor}
            oninput={() => updateCssVar('--color-text-active', textActiveColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">Correct Text</span>
          <input
            type="color"
            bind:value={textCorrectColor}
            oninput={() => updateCssVar('--color-text-correct', textCorrectColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">Incorrect Text</span>
          <input
            type="color"
            bind:value={textIncorrectColor}
            oninput={() => updateCssVar('--color-text-incorrect', textIncorrectColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">Caret</span>
          <input
            type="color"
            bind:value={caretColor}
            oninput={() => updateCssVar('--color-caret', caretColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">Underline</span>
          <input
            type="color"
            bind:value={underlineColor}
            oninput={() => updateCssVar('--decoration-incorrect', underlineColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">Hover</span>
          <input
            type="color"
            bind:value={bgHoverColor}
            oninput={() => updateCssVar('--color-bg-hover', bgHoverColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">Selected Text</span>
          <input
            type="color"
            bind:value={textSelectedColor}
            oninput={() => updateCssVar('--color-text-selected', textSelectedColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>
      </div>

      <div class="auto flex flex-wrap">
        {#each themePresets as theme, t (t)}
          <button
            class="cursor-pointer rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]"
            class:text-[var(--color-text-selected)]={currentTheme === theme.id && !isCustomTheme}
            onmouseenter={async () => {
              const main = document.querySelector('main');
              hoveredTheme = theme.id;

              // Save all custom styles so we can restore them later
              customCssBackup = {};
              cssVars.forEach((v) => {
                const value = main.style.getPropertyValue(v);
                if (value) {
                  customCssBackup[v] = value;
                  main.style.removeProperty(v); // Remove so class styles can take effect
                }
              });

              await tick(); // Wait for DOM to update with the new theme class
              syncPaletteInputs(); // update the input fields to match the preview
            }}
            onmouseleave={async () => {
              hoveredTheme = null;
              const main = document.querySelector('main');

              // Restore previous inline custom styles
              Object.entries(customCssBackup).forEach(([key, value]) => {
                main.style.setProperty(key, value);
              });

              await tick();
              syncPaletteInputs(); // update inputs back to current theme values
            }}
            onclick={async () => {
              isCustomTheme = false;
              showPaletteMenu = false;
              currentTheme = theme.id;
              hoveredTheme = null;
              customCssBackup = {};

              const main = document.querySelector('main');
              cssVars.forEach((v) => main?.style.removeProperty(v));

              // Wait to let the theme class apply
              await tick();

              // Update the input fields to reflect current theme values
              syncPaletteInputs();

              focusInput();
            }}
            onmousedown={(e) => e.preventDefault()}
          >
            {theme.label}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="relative">
    <!-- Desktop Options -->
    <div
      class="absolute -top-[3.5em] flex items-center space-x-0.5 rounded-lg p-2 text-base
       text-[var(--color-text-default)] transition-opacity duration-300 sm:-top-[2.5em]
       sm:space-x-3 sm:text-2xl md:space-x-10"
      style="left: 50%; transform: translateX(-50%);"
      class:opacity-0={testPhase === 'running' || testPhase === 'finished'}
      class:pointer-events-none={testPhase === 'running' || testPhase === 'finished'}
    >
      <button
        class="cursor-pointer rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]"
        onclick={(e) => {
          e.stopPropagation(); // Calls event.stopPropagation(), preventing the event reaching the next element
          resetTabOrder();
          if (showPaletteMenu) focusInput();
          showPaletteMenu = !showPaletteMenu;
        }}
      >
        <Palette class="h-4 w-4 sm:h-6 sm:w-6" />
      </button>
      <div>|</div>
      <button
        class="cursor-pointer rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]"
        class:text-[var(--color-text-selected)]={currentTestMode === 'time'}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => {
          if (currentTestMode !== 'time') {
            currentTestMode = 'time';
            restartTest();
          }
          resetTabOrder();
          focusInput();
        }}
      >
        time
      </button>
      <button
        class="cursor-pointer rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]"
        class:text-[var(--color-text-selected)]={currentTestMode === 'words'}
        onmousedown={(e) => e.preventDefault()}
        onclick={() => {
          if (currentTestMode !== 'words') {
            currentTestMode = 'words';
            restartTest();
          }
          resetTabOrder();
          focusInput();
        }}
      >
        words
      </button>
      <div>|</div>
      {#if currentTestMode === 'time'}
        {#each [15, 30, 60] as time, t (t)}
          <button
            class="cursor-pointer rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]"
            class:text-[var(--color-text-selected)]={timerDuration === time}
            onclick={() => {
              timerDuration = time;
              resetTabOrder();
              focusInput();
            }}
            onmousedown={(e) => e.preventDefault()}
          >
            {time}<span class="text-[0.85em]">s</span>
          </button>
        {/each}
      {/if}

      {#if currentTestMode === 'words'}
        {#each [10, 25, 50, 100] as wordCount, w (w)}
          <button
            class="cursor-pointer rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]"
            class:text-[var(--color-text-selected)]={selectedWordsCount === wordCount}
            onclick={() => {
              if (selectedWordsCount !== wordCount) {
                selectedWordsCount = wordCount;
                restartTest();
              }
              resetTabOrder();
              focusInput();
            }}
            onmousedown={(e) => e.preventDefault()}
          >
            {wordCount}
          </button>
        {/each}
      {/if}
    </div>

    <div
      class="pointer-events-none absolute -top-[1.75em] left-[1.3em] p-2 text-2xl transition-opacity duration-300 sm:-top-[1.5em] sm:left-[0.85em] sm:text-4xl"
      style="color: var(--color-text-default);"
      class:opacity-0={currentTestMode !== 'time' || testPhase !== 'running'}
      ontransitionend={() => (timeRemaining = timerDuration)}
    >
      {timeRemaining}
    </div>

    <div
      class="pointer-events-none absolute -top-[1.75em] left-[1.3em] p-2 text-2xl transition-opacity duration-300 sm:-top-[1.5em] sm:left-[0.85em] sm:text-4xl"
      style="color: var(--color-text-default);"
      class:opacity-0={currentTestMode !== 'words' || testPhase !== 'running'}
    >
      {activeWordIndex}/{currentWords.length}
    </div>

    <div
      class="pointer-events-none absolute -top-[1.7em] left-[1.3em] p-2 text-2xl transition-opacity duration-300 sm:-top-[1.5em] sm:left-[0.85em] sm:text-4xl"
      style="color: var(--color-text-default);"
      class:opacity-0={testPhase !== 'finished'}
    >
      {wpm} wpm
    </div>

    <div
      class="no-ligatures relative mx-8 cursor-text overflow-hidden text-2xl transition-opacity sm:text-4xl lg:max-w-325"
      style:max-height={maxRowHeight}
      style:min-height={maxRowHeight}
      style="font-family: var(--font-family);"
      onclick={focusInput}
      onkeydown={handleContainerKeyDown}
      role="button"
      tabindex="0"
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
        class="flex flex-wrap justify-start gap-x-2.5 p-2 transition-transform duration-150 ease-in-out sm:gap-x-4"
        style:row-gap="{rowGap}px"
        style:transform="translateY({scrollOffset}px)"
      >
        {#each currentWords as word, i (i)}
          {@const isCompleted = i < activeWordIndex}
          {@const isActive = i === activeWordIndex}
          {@const isWordCorrect = i in wordCorrectness ? wordCorrectness[i] : true}
          {@const inputForThisWord = isCompleted ? typedWords[i] : isActive ? userInput : ''}

          <div class:underline-incorrect={!isWordCorrect && isCompleted}>
            {#if isCompleted || isActive}
              {#each word as char, j (j)}
                {@const isTyped = j < (inputForThisWord?.length || 0)}
                {@const isCorrect = isTyped && inputForThisWord[j] === char}
                <span
                  style="color: {isTyped && isCorrect
                    ? 'var(--color-text-correct)'
                    : isTyped && !isCorrect
                      ? 'var(--color-text-incorrect)'
                      : isCompleted && !isTyped
                        ? 'var(--color-text-default)'
                        : 'var(--color-text-active)'};"
                  bind:this={charElements[i][j]}
                >
                  {char}
                </span>
              {/each}{#each inputForThisWord?.length > word.length ? inputForThisWord.slice(word.length) : '' as extraChar, k (k)}
                <span
                  style="color: var(--color-text-incorrect);"
                  bind:this={charElements[i][word.length + k]}
                >
                  {extraChar}
                </span>
              {/each}
            {:else}
              <span style="color: var(--color-text-default);">{word}</span>
            {/if}
          </div>
        {/each}
        <!-- Workaround to make words mode words left align when set to 10 -->
        <div class="invisible">asdf</div>
        <div class="invisible">asdf</div>
        <div class="invisible">asdf</div>
        <div class="invisible">asdf</div>
        <div class="invisible">asdf</div>
        <div class="invisible">asdf</div>
        <div class="invisible">asdf</div>
        <div class="invisible">asdf</div>
        <div class="invisible">asdf</div>
        <div class="invisible">asdf</div>
        <div class="invisible">asdf</div>
        <div class="invisible">asdf</div>
      </div>

      <div
        class="absolute w-[3px] rounded-sm {testPhase === 'waiting' && isFocused
          ? 'blink-caret'
          : ''}"
        style:top="{caretPosition.current.top}px"
        style:left="{caretPosition.current.left}px"
        style:height="{caretPosition.current.height}px"
        style="background-color: var(--color-caret);"
        class:hidden={!isFocused}
      ></div>
    </div>

    <button
      bind:this={restartButton}
      class="absolute top-[10em] flex cursor-pointer rounded-lg p-2 duration-300 hover:[background-color:var(--color-bg-hover)] sm:top-[11.75em]"
      style="color: var(--color-text-default); left: 50%; transform: translateX(-50%);"
      onclick={restartTest}
      tabindex="0"
      onmousedown={(e) => e.preventDefault()}
    >
      <RotateCw class="h-6 w-6 sm:h-7 sm:w-7" />
    </button>
  </div>
</main>
