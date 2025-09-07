<script>
  import { onMount } from 'svelte';
  import { tick } from 'svelte';
  import { linear } from 'svelte/easing';
  import { Tween } from 'svelte/motion';
  import { RotateCw, Palette, Settings } from 'lucide-svelte';
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
  let currentTheme = $state('theme-light');
  let showPaletteMenu = $state(false);
  let currentTestMode = $state('time');
  let prevBreakpoint = window.innerWidth >= 640 ? 'sm-up' : 'below-sm';
  let selectedWordsCount = $state(25);
  let restartButton;
  let totalKeyStrokes = $state(0);
  let accuracy = $state(0);
  let currentWordlist = $state('english');
  let showSettingsMenu = $state(false);
  let isMouseActive = $state(true);
  let mouseIdleTimer;
  let isTouchDevice = $state(false);
  let isRestartButtonHidden = $derived(
    testPhase === 'running' && !isTouchDevice && !isMouseActive && !isRestartButtonFocused
  );
  let isRestartButtonFocused = $state(false);
  let wordsContainerElement;

  let mainFont = $state('Hack');
  let otherFont = $state('Hack');
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
    { id: 'theme-light', label: 'light' },
    { id: 'theme-dark', label: 'dark' },
    { id: 'theme-ink', label: 'ink' },
    { id: 'theme-abyss', label: 'abyss' },
    { id: 'theme-midnight-plum', label: 'midnight' },
    { id: 'theme-blank', label: 'blank' },
    { id: 'theme-forest-night', label: 'forest' },
    { id: 'theme-cloud', label: 'cloud' },
    { id: 'theme-slate-grey', label: 'slate' },
    { id: 'theme-eagle', label: 'eagle' },
    { id: 'theme-warm-graphite', label: 'graphite' },
    { id: 'theme-arctic-night', label: 'arctic' },
    { id: 'theme-morning-dew', label: 'dew' },
    { id: 'theme-violet-dark', label: 'violet' },
    { id: 'theme-desert-dusk', label: 'desert' },
    { id: 'theme-console', label: 'console' },
    { id: 'theme-peach', label: 'peach' },
    { id: 'theme-azure-mist', label: 'azure' }
  ];

  const fontFamilies = [
    'Atkinson Hyperlegible',
    'Boon',
    'Cascadia Mono',
    'Comfortaa',
    'Coming Soon',
    'Commit Mono',
    'Fira Code',
    'Geist',
    'Geist Mono',
    'Hack',
    'IBM Plex Mono',
    'IBM Plex Sans',
    'Inconsolata',
    'Itim',
    'JetBrains Mono',
    'Kanit',
    'Lalezar',
    'Lato',
    'Lexend Deca',
    'Merriweather',
    'Mononoki',
    'Montserrat',
    'Nunito',
    'Open Dyslexic',
    'Overpass Mono',
    'Oxygen',
    'Parkinsans',
    'Roboto Mono',
    'Roboto',
    'Sarabun',
    'Source Code Pro',
    'Titillium Web',
    'Ubuntu Mono',
    'Ubuntu',
    'Vazirmatn'
  ];

  const wordlists = [
    'english',
    'english1k',
    'english5k',
    'czech',
    'dutch',
    'finnish',
    'french',
    'german',
    'greek',
    'hungarian',
    'italian',
    'norwegian bokmal',
    'norwegian nynorsk',
    'polish',
    'portuguese',
    'romanian',
    'russian',
    'spanish',
    'swedish',
    'turkish',
    'ukrainian'
  ];

  const STORAGE_KEYS = {
    TEST_MODE: 'typingTest_currentTestMode',
    TIMER_DURATION: 'typingTest_timerDuration',
    WORDS_COUNT: 'typingTest_selectedWordsCount',
    CURRENT_THEME: 'typingTest_currentTheme',
    IS_CUSTOM_THEME: 'typingTest_isCustomTheme',
    CUSTOM_THEME_VARS: 'typingTest_customThemeVars',
    WORDLIST: 'typingTest_wordlist',
    MAIN_FONT: 'typingtest_mainFont',
    OTHER_FONT: 'typingtest_otherFont'
  };

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
    isTouchDevice =
      'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;

    // Load settings first
    loadSettings();

    // Fetch wordlist
    await fetchWordlist(false);
    words = allWords.words;
    prepareWords(words);

    // Use correct word count based on current test mode
    if (currentTestMode === 'time') {
      currentWords = getNextWords(500);
    } else {
      currentWords = getNextWords(selectedWordsCount);
    }

    // Pre-fill the charElements array with empty arrays so Svelte can bind to them.
    // We create an array of empty arrays, one for each word.
    prefillCharElements();

    await updateRowMetrics();

    inputElement.focus();

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('mousemove', handleMouseMove); // Add mousemove listener

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('mousemove', handleMouseMove); // Clean up listener
      clearTimeout(mouseIdleTimer); // Clean up timer on component destroy
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

  function saveSettings() {
    try {
      // Save basic settings
      localStorage.setItem(STORAGE_KEYS.TEST_MODE, currentTestMode);
      localStorage.setItem(STORAGE_KEYS.TIMER_DURATION, timerDuration.toString());
      localStorage.setItem(STORAGE_KEYS.WORDS_COUNT, selectedWordsCount.toString());
      localStorage.setItem(STORAGE_KEYS.CURRENT_THEME, currentTheme);
      localStorage.setItem(STORAGE_KEYS.IS_CUSTOM_THEME, isCustomTheme.toString());
      localStorage.setItem(STORAGE_KEYS.WORDLIST, currentWordlist);
      localStorage.setItem(STORAGE_KEYS.MAIN_FONT, mainFont);
      localStorage.setItem(STORAGE_KEYS.OTHER_FONT, otherFont);

      // Save custom theme variables if it's a custom theme
      if (isCustomTheme) {
        const customThemeVars = {
          caretColor,
          underlineColor,
          bgColor,
          textDefaultColor,
          textActiveColor,
          textCorrectColor,
          textIncorrectColor,
          bgHoverColor,
          textSelectedColor
        };
        localStorage.setItem(STORAGE_KEYS.CUSTOM_THEME_VARS, JSON.stringify(customThemeVars));
      }
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }

  function loadSettings() {
    try {
      // Load basic settings
      const savedTestMode = localStorage.getItem(STORAGE_KEYS.TEST_MODE);
      if (savedTestMode) currentTestMode = savedTestMode;

      const savedTimerDuration = localStorage.getItem(STORAGE_KEYS.TIMER_DURATION);
      if (savedTimerDuration) timerDuration = parseInt(savedTimerDuration);

      const savedWordsCount = localStorage.getItem(STORAGE_KEYS.WORDS_COUNT);
      if (savedWordsCount) selectedWordsCount = parseInt(savedWordsCount);

      const savedWordlist = localStorage.getItem(STORAGE_KEYS.WORDLIST);
      if (savedWordlist) currentWordlist = savedWordlist;

      const savedTheme = localStorage.getItem(STORAGE_KEYS.CURRENT_THEME);
      if (savedTheme) currentTheme = savedTheme;

      const savedMainFont = localStorage.getItem(STORAGE_KEYS.MAIN_FONT);
      if (savedMainFont) mainFont = savedMainFont;

      const savedOtherFont = localStorage.getItem(STORAGE_KEYS.OTHER_FONT);
      if (savedOtherFont) otherFont = savedOtherFont;

      handleFontChange(mainFont, '--font-family');
      handleFontChange(otherFont, '--font-family-secondary');

      const savedIsCustomTheme = localStorage.getItem(STORAGE_KEYS.IS_CUSTOM_THEME);
      if (savedIsCustomTheme) isCustomTheme = savedIsCustomTheme === 'true';

      // Load custom theme variables if it's a custom theme
      if (isCustomTheme) {
        const savedCustomThemeVars = localStorage.getItem(STORAGE_KEYS.CUSTOM_THEME_VARS);
        if (savedCustomThemeVars) {
          const customVars = JSON.parse(savedCustomThemeVars);

          // Apply the custom theme variables
          caretColor = customVars.caretColor || caretColor;
          underlineColor = customVars.underlineColor || underlineColor;
          bgColor = customVars.bgColor || bgColor;
          textDefaultColor = customVars.textDefaultColor || textDefaultColor;
          textActiveColor = customVars.textActiveColor || textActiveColor;
          textCorrectColor = customVars.textCorrectColor || textCorrectColor;
          textIncorrectColor = customVars.textIncorrectColor || textIncorrectColor;
          bgHoverColor = customVars.bgHoverColor || bgHoverColor;
          textSelectedColor = customVars.textSelectedColor || textSelectedColor;

          // Apply the custom CSS variables to the DOM
          applyCSSVariables();
        }
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
  }

  // New function to handle mouse movement
  function handleMouseMove() {
    clearTimeout(mouseIdleTimer);
    isMouseActive = true;
    mouseIdleTimer = setTimeout(() => {
      isMouseActive = false;
    }, 1000);
  }

  function applyCSSVariables() {
    const main = document.querySelector('main');
    if (!main) return;

    main.style.setProperty('--color-caret', caretColor);
    main.style.setProperty('--decoration-incorrect', underlineColor);
    main.style.setProperty('--color-bg', bgColor);
    main.style.setProperty('--color-text-default', textDefaultColor);
    main.style.setProperty('--color-text-active', textActiveColor);
    main.style.setProperty('--color-text-correct', textCorrectColor);
    main.style.setProperty('--color-text-incorrect', textIncorrectColor);
    main.style.setProperty('--color-bg-hover', bgHoverColor);
    main.style.setProperty('--color-text-selected', textSelectedColor);
  }

  async function fetchWordlist(changingWordList) {
    const currentWordlistFilename = currentWordlist.replace(/ /g, '_');
    const wordsResponse = await fetch(`/wordlists/${currentWordlistFilename}.json`);
    allWords = await wordsResponse.json();

    if (changingWordList) restartTest();
  }

  function prefillCharElements() {
    // 500 workaround
    charElements = Array(500)
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

    if (event.key.length === 1 && userInput.length < currentWord.length + 3) totalKeyStrokes++;

    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();

      if (userInput === '') {
        return;
      }

      wordCorrectness[activeWordIndex] = userInput === currentWord;
      typedWords[activeWordIndex] = userInput;
      userInput = '';

      if (currentTestMode === 'words') {
        if (activeWordIndex === currentWords.length - 1) {
          activeWordIndex++;
          endTest();
          return;
        }
      }

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
    const currentWord = currentWords[activeWordIndex];
    const onFinalWord = activeWordIndex === currentWords.length - 1;

    if (spaceHandledByKeydown) {
      // Reset flag and skip to avoid double handling space input
      spaceHandledByKeydown = false;
      return;
    }

    if (onFinalWord) {
      if (userInput === currentWord) {
        wordCorrectness[activeWordIndex] = true;
        typedWords[activeWordIndex] = userInput;
        userInput = '';
        activeWordIndex++;
        endTest();
        return;
      }
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
    if (!isTouchDevice) isRestartButtonHidden = true;
    showPaletteMenu = false;
    showSettingsMenu = false;
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
    // If a restart is already in progress, abort ending the test
    // This prevents the race condition where the timer ends the test
    // at the same moment the user clicks restart
    if (restarting) {
      return;
    }

    inputElement.disabled = true;
    calculateStats();
    testPhase = 'finished';
  }

  function calculateStats() {
    // Calculate correct characters from all completed words
    let totalCorrectChars = 0;

    for (let i = 0; i < activeWordIndex; i++) {
      // for each char in currentWords[i], if that is the same as typedWords[i]
      for (let j = 0; j < currentWords[i].length; j++) {
        if (currentWords[i][j] === typedWords[i][j]) {
          totalCorrectChars++;
        }
      }
      if (wordCorrectness[i]) totalCorrectChars++;
    }

    // Get correct chars in the latest word
    if (currentTestMode === 'time') {
      const activeWord = currentWords[activeWordIndex];
      for (let j = 0; j < activeWord.length; j++) {
        if (userInput[j] === activeWord[j]) {
          totalCorrectChars++;
        }
      }
    }

    if (currentTestMode === 'words') {
      totalCorrectChars--;
    }

    const missedChars = currentWords.slice(0, activeWordIndex).reduce((sum, w, i) => {
      const typed = typedWords[i] || '';
      return sum + Math.max(0, w.length - typed.length);
    }, 0);

    const adjustedKeyStrokes = totalKeyStrokes + missedChars;

    // Calculate elapsed time in minutes
    // In time mode: use the smaller of elapsed time or timer duration
    // In words mode: use actual elapsed time (don't cap it)
    const elapsedSeconds = (Date.now() - testStartTime) / 1000;
    const elapsedMinutes =
      currentTestMode === 'time'
        ? Math.min(elapsedSeconds, timerDuration) / 60
        : elapsedSeconds / 60;

    // Calculate WPM using the standard formula (a word is 5 characters)
    const grossWPM = totalCorrectChars / 5 / elapsedMinutes;

    wpm = Math.round(grossWPM);
    accuracy = Math.round((totalCorrectChars / adjustedKeyStrokes) * 100);
  }

  async function restartTest() {
    if (restarting) {
      return;
    }

    restarting = true;
    testPhase = 'waiting';

    wordsContainerElement.classList.remove('duration-150');
    wordsContainerElement.classList.add('duration-0');

    await new Promise((resolve) => setTimeout(resolve, 200));

    scrollOffset = 0;

    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    totalKeyStrokes = 0;
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

    // restore the animation class after the restart process
    //    is visually complete, so it's ready for the next test
    setTimeout(() => {
      if (wordsContainerElement) {
        wordsContainerElement.classList.remove('duration-0');
        wordsContainerElement.classList.add('duration-150');
      }
    }, 300);
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
    saveSettings();
  }

  function syncPaletteInputs() {
    const styles = getComputedStyle(document.querySelector('main'));

    // Helper to get and normalise a property
    const getAndNormalise = (varName) => {
      const value = styles.getPropertyValue(varName).trim();
      return value ? normaliseColorToHex(value) : '';
    };

    mainFont =
      styles.getPropertyValue('--font-family')?.replace(/['"]/g, '').split(',')[0]?.trim() ||
      'Hack';
    otherFont =
      styles
        .getPropertyValue('--font-family-secondary')
        ?.replace(/['"]/g, '')
        .split(',')[0]
        ?.trim() || 'Hack';

    // Use the helper for all color inputs
    caretColor = getAndNormalise('--color-caret');
    underlineColor = getAndNormalise('--decoration-incorrect');
    bgColor = getAndNormalise('--color-bg');
    textDefaultColor = getAndNormalise('--color-text-default');
    textActiveColor = getAndNormalise('--color-text-active');
    textCorrectColor = getAndNormalise('--color-text-correct');
    textIncorrectColor = getAndNormalise('--color-text-incorrect');
    bgHoverColor = getAndNormalise('--color-bg-hover');
    textSelectedColor = getAndNormalise('--color-text-selected');
  }

  function normaliseColorToHex(colorStr) {
    // Create a temporary element to apply the color to
    const tempDiv = document.createElement('div');
    tempDiv.style.color = colorStr;
    document.body.appendChild(tempDiv);

    // Get the computed color style, which will be in rgb(r, g, b) format
    const computedColor = window.getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);

    const rgb = computedColor.match(/\d+/g);
    if (!rgb) return '#000000';

    // Convert the RGB values to a hex string
    return `#${
      // Start the string with #
      parseInt(rgb[0]) // Convert the first value (red) to an integer
        .toString(16) // Convert to hexadecimal
        .padStart(2, '0') // Ensure it's 2 characters (e.g., '0f' not 'f')
    }${parseInt(rgb[1]).toString(16).padStart(2, '0')}${parseInt(rgb[2])
      .toString(16)
      .padStart(2, '0')}`;
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

  async function handleFontChange(fontName, cssVar) {
    try {
      // Wait for the font to be loaded and ready for use
      await document.fonts.load(`1em "${fontName}"`);

      // Once loaded, apply the new font by updating the CSS variable
      document.querySelector('main')?.style.setProperty(cssVar, `"${fontName}"`);
      saveSettings();
    } catch (error) {
      console.error(`Failed to load font: ${fontName}`, error);
      // You could add logic here to revert the selection if the font fails to load
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<main
  class={`flex min-h-screen flex-col items-center justify-center transition-colors duration-300
  ease-in-out ${hoveredTheme || currentTheme}`}
  style="background-color: var(--color-bg); font-family: var(--font-family-secondary);"
  class:cursor-none={isRestartButtonHidden}
  onclick={() => {
    showPaletteMenu = false;
    showSettingsMenu = false;
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
      transition-all duration-300 sm:max-h-140 sm:text-sm"
      style="color: var(--color-text-default); top: 50%; left: 50%; transform: translate(-50%, -50%); font-family: var(--font-family-secondary), monospace;"
      transition:fade={{ duration: 200 }}
      onclick={(e) => e.stopPropagation()}
    >
      <div class="font-bold">{paletteMenuTitle}</div>

      <div class="mb-6 flex flex-col justify-center space-y-4">
        <label class="flex items-center">
          <span class="mr-4 inline-block w-28">main font</span>
          <select
            bind:value={mainFont}
            onchange={() => handleFontChange(mainFont, '--font-family')}
            class="cursor-pointer rounded border bg-transparent px-3 py-1 text-[var(--color-text-default)]"
          >
            {#each fontFamilies as font, f (f)}
              <option value={font}>{font}</option>
            {/each}
          </select>
        </label>

        <label class="flex items-center">
          <span class="mr-4 inline-block w-28">other font</span>
          <select
            bind:value={otherFont}
            onchange={() => handleFontChange(otherFont, '--font-family-secondary')}
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
          <span class="mr-4 inline-block w-28">background</span>
          <input
            type="color"
            bind:value={bgColor}
            oninput={() => updateCssVar('--color-bg', bgColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">text</span>
          <input
            type="color"
            bind:value={textDefaultColor}
            oninput={() => updateCssVar('--color-text-default', textDefaultColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">active text</span>
          <input
            type="color"
            bind:value={textActiveColor}
            oninput={() => updateCssVar('--color-text-active', textActiveColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">correct text</span>
          <input
            type="color"
            bind:value={textCorrectColor}
            oninput={() => updateCssVar('--color-text-correct', textCorrectColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">incorrect Text</span>
          <input
            type="color"
            bind:value={textIncorrectColor}
            oninput={() => updateCssVar('--color-text-incorrect', textIncorrectColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">caret</span>
          <input
            type="color"
            bind:value={caretColor}
            oninput={() => updateCssVar('--color-caret', caretColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">underline</span>
          <input
            type="color"
            bind:value={underlineColor}
            oninput={() => updateCssVar('--decoration-incorrect', underlineColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">hover</span>
          <input
            type="color"
            bind:value={bgHoverColor}
            oninput={() => updateCssVar('--color-bg-hover', bgHoverColor)}
            class="cursor-pointer rounded border sm:border-none"
          />
        </label>

        <label class="flex items-center justify-between">
          <span class="mr-4 inline-block w-28">selected text</span>
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
            class="m-0 cursor-pointer rounded-lg p-3 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]"
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
              saveSettings();
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

  <!-- Setting Menu -->
  {#if showSettingsMenu}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute z-50 flex max-h-120 w-full max-w-md flex-col
      space-y-2 overflow-y-auto rounded-lg border bg-[var(--color-bg)] p-4 text-xs
      transition-all duration-300 sm:max-h-140 sm:text-sm"
      style="color: var(--color-text-default); top: 50%; left: 50%; transform: translate(-50%, -50%);"
      transition:fade={{ duration: 200 }}
      onclick={(e) => e.stopPropagation()}
    >
      <div class="pl-2 font-bold">word list</div>
      <div class="flex flex-col items-stretch space-y-2">
        {#each wordlists as wl, w (w)}
          <button
            class="cursor-pointer rounded-lg p-1 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]"
            class:text-[var(--color-text-selected)]={currentWordlist === wl}
            onclick={() => {
              showSettingsMenu = false;
              currentWordlist = wl;
              saveSettings();
              fetchWordlist(true);
              focusInput();
            }}
          >
            {wl}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="relative">
    <!-- Desktop Options -->
    <div
      class="absolute -top-[3.5em] flex items-center space-x-0.5 rounded-lg p-2 text-sm text-[var(--color-text-default)]
       transition-opacity duration-300 max-[350px]:text-xs sm:-top-[2.5em]
       sm:space-x-4 sm:text-2xl lg:space-x-10"
      style="left: 50%; transform: translateX(-50%);"
      class:opacity-0={testPhase === 'running' || testPhase === 'finished'}
      class:pointer-events-none={testPhase === 'running' || testPhase === 'finished'}
    >
      <button
        class="cursor-pointer rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]"
        onclick={(e) => {
          e.stopPropagation(); // Calls event.stopPropagation(), preventing the event reaching the next element
          resetTabOrder();
          if (showSettingsMenu) focusInput();
          showSettingsMenu = !showSettingsMenu;
          showPaletteMenu = false;
        }}
      >
        <Settings class="h-4 w-4 sm:h-6 sm:w-6" />
      </button>
      <button
        class="cursor-pointer rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]"
        onclick={(e) => {
          e.stopPropagation(); // Calls event.stopPropagation(), preventing the event reaching the next element
          resetTabOrder();
          if (showPaletteMenu) focusInput();
          showPaletteMenu = !showPaletteMenu;
          showSettingsMenu = false;
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
            saveSettings();
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
            saveSettings();
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
              saveSettings();
              resetTabOrder();
              focusInput();
            }}
            onmousedown={(e) => e.preventDefault()}
          >
            {time}
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
                saveSettings();
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
      class="pointer-events-none absolute -top-[1.7em] left-[1.65em] p-2 text-xl transition-opacity
       duration-300 sm:-top-[1.5em] sm:left-[0.85em] sm:text-4xl"
      style="color: var(--color-text-default);"
      class:opacity-0={testPhase !== 'finished'}
    >
      <span class="mr-5 md:mr-7"
        ><span class=" text-[var(--color-text-correct)]">{wpm}</span> wpm</span
      ><span class="text-[var(--color-text-correct)]">{accuracy}%</span> acc
    </div>

    <div
      class="pointer-events-none absolute -top-[-8.2em] left-[1.8em] p-2 text-lg transition-opacity duration-300
       sm:-top-[-7.4em] sm:left-[1.4em] sm:text-2xl"
      style="color: var(--color-text-correct);"
      class:opacity-0={testPhase !== 'finished'}
    >
      test type
      <div class="text-[var(--color-text-default)]">
        <div>{currentWordlist}</div>
        {#if currentTestMode === 'time'}
          <div>time {timerDuration}</div>
        {:else}
          <div>words {selectedWordsCount}</div>
        {/if}
      </div>
    </div>

    <div
      class="no-ligatures relative mx-8 overflow-hidden text-2xl transition-opacity sm:text-4xl lg:max-w-325"
      style:max-height={maxRowHeight}
      style:min-height={maxRowHeight}
      style="font-family: var(--font-family);"
      class:cursor-text={!isRestartButtonHidden}
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
        oncopy={(e) => e.preventDefault()}
        oncut={(e) => e.preventDefault()}
        onpaste={(e) => e.preventDefault()}
        ondragstart={(e) => e.preventDefault()}
        ondrop={(e) => e.preventDefault()}
        ondragover={(e) => e.preventDefault()}
        oncontextmenu={(e) => e.preventDefault()}
      />

      <div
        id="words-container"
        bind:this={wordsContainerElement}
        class="flex flex-wrap justify-start gap-x-2.5 p-2 transition-transform duration-150 ease-in-out sm:gap-x-5"
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
        {#each { length: 15 }}
          <div class="invisible">asdf</div>
        {/each}
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
      class="absolute top-[10em] flex cursor-pointer rounded-lg p-2 duration-300
      hover:[background-color:var(--color-bg-hover)] sm:top-[11.75em]"
      class:opacity-0={isRestartButtonHidden}
      style="color: var(--color-text-default); left: 50%; transform: translateX(-50%);"
      onclick={restartTest}
      onfocus={() => (isRestartButtonFocused = true)}
      onblur={() => (isRestartButtonFocused = false)}
      tabindex="0"
      onmousedown={(e) => e.preventDefault()}
    >
      <RotateCw class="h-6 w-6 sm:h-7 sm:w-7" />
    </button>
  </div>
</main>
