import { n as noop, k as sanitize_props, l as rest_props, m as fallback, o as ensure_array_like, q as spread_attributes, t as clsx, u as element, v as slot, w as bind_props, f as pop, p as push, x as spread_props, y as attr_class, h as escape_html, z as attr_style, A as attr, B as stringify } from "../../chunks/index.js";
import { t as source, u as render_effect, n as set, o as get } from "../../chunks/runtime.js";
import "clsx";
const now = () => Date.now();
const raf = {
  // don't access requestAnimationFrame eagerly outside method
  // this allows basic testing of user code without JSDOM
  // bunder will eval and remove ternary when the user's app is built
  tick: (
    /** @param {any} _ */
    (_) => noop()
  ),
  now: () => now(),
  tasks: /* @__PURE__ */ new Set()
};
function loop(callback) {
  let task;
  if (raf.tasks.size === 0) ;
  return {
    promise: new Promise((fulfill) => {
      raf.tasks.add(task = { c: callback, f: fulfill });
    }),
    abort() {
      raf.tasks.delete(task);
    }
  };
}
function linear(t) {
  return t;
}
function is_date(obj) {
  return Object.prototype.toString.call(obj) === "[object Date]";
}
function get_interpolator(a, b) {
  if (a === b || a !== a) return () => a;
  const type = typeof a;
  if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
    throw new Error("Cannot interpolate values of different type");
  }
  if (Array.isArray(a)) {
    const arr = (
      /** @type {Array<any>} */
      b.map((bi, i) => {
        return get_interpolator(
          /** @type {Array<any>} */
          a[i],
          bi
        );
      })
    );
    return (t) => arr.map((fn) => fn(t));
  }
  if (type === "object") {
    if (!a || !b) {
      throw new Error("Object cannot be null");
    }
    if (is_date(a) && is_date(b)) {
      const an = a.getTime();
      const bn = b.getTime();
      const delta = bn - an;
      return (t) => new Date(an + t * delta);
    }
    const keys = Object.keys(b);
    const interpolators = {};
    keys.forEach((key) => {
      interpolators[key] = get_interpolator(a[key], b[key]);
    });
    return (t) => {
      const result = {};
      keys.forEach((key) => {
        result[key] = interpolators[key](t);
      });
      return result;
    };
  }
  if (type === "number") {
    const delta = (
      /** @type {number} */
      b - /** @type {number} */
      a
    );
    return (t) => a + t * delta;
  }
  return () => b;
}
class Tween {
  #current;
  #target;
  /** @type {TweenedOptions<T>} */
  #defaults;
  /** @type {import('../internal/client/types').Task | null} */
  #task = null;
  /**
   * @param {T} value
   * @param {TweenedOptions<T>} options
   */
  constructor(value, options = {}) {
    this.#current = source(value);
    this.#target = source(value);
    this.#defaults = options;
  }
  /**
   * Create a tween whose value is bound to the return value of `fn`. This must be called
   * inside an effect root (for example, during component initialisation).
   *
   * ```svelte
   * <script>
   * 	import { Tween } from 'svelte/motion';
   *
   * 	let { number } = $props();
   *
   * 	const tween = Tween.of(() => number);
   * <\/script>
   * ```
   * @template U
   * @param {() => U} fn
   * @param {TweenedOptions<U>} [options]
   */
  static of(fn, options) {
    const tween = new Tween(fn(), options);
    render_effect(() => {
      tween.set(fn());
    });
    return tween;
  }
  /**
   * Sets `tween.target` to `value` and returns a `Promise` that resolves if and when `tween.current` catches up to it.
   *
   * If `options` are provided, they will override the tween's defaults.
   * @param {T} value
   * @param {TweenedOptions<T>} [options]
   * @returns
   */
  set(value, options) {
    set(this.#target, value);
    let {
      delay = 0,
      duration = 400,
      easing = linear,
      interpolate = get_interpolator
    } = { ...this.#defaults, ...options };
    if (duration === 0) {
      this.#task?.abort();
      set(this.#current, value);
      return Promise.resolve();
    }
    const start = raf.now() + delay;
    let fn;
    let started = false;
    let previous_task = this.#task;
    this.#task = loop((now2) => {
      if (now2 < start) {
        return true;
      }
      if (!started) {
        started = true;
        const prev = this.#current.v;
        fn = interpolate(prev, value);
        if (typeof duration === "function") {
          duration = duration(prev, value);
        }
        previous_task?.abort();
      }
      const elapsed = now2 - start;
      if (elapsed > /** @type {number} */
      duration) {
        set(this.#current, value);
        return false;
      }
      set(this.#current, fn(easing(elapsed / /** @type {number} */
      duration)));
      return true;
    });
    return this.#task.promise;
  }
  get current() {
    return get(this.#current);
  }
  get target() {
    return get(this.#target);
  }
  set target(v) {
    this.set(v);
  }
}
/**
 * @license lucide-svelte v0.525.0 - ISC
 *
 * ISC License
 * 
 * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.
 * 
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 * 
 */
const defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};
function Icon($$payload, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const $$restProps = rest_props($$sanitized_props, [
    "name",
    "color",
    "size",
    "strokeWidth",
    "absoluteStrokeWidth",
    "iconNode"
  ]);
  push();
  let name = fallback($$props["name"], void 0);
  let color = fallback($$props["color"], "currentColor");
  let size = fallback($$props["size"], 24);
  let strokeWidth = fallback($$props["strokeWidth"], 2);
  let absoluteStrokeWidth = fallback($$props["absoluteStrokeWidth"], false);
  let iconNode = fallback($$props["iconNode"], () => [], true);
  const mergeClasses = (...classes) => classes.filter((className, index, array) => {
    return Boolean(className) && array.indexOf(className) === index;
  }).join(" ");
  const each_array = ensure_array_like(iconNode);
  $$payload.out += `<svg${spread_attributes(
    {
      ...defaultAttributes,
      ...$$restProps,
      width: size,
      height: size,
      stroke: color,
      "stroke-width": absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
      class: clsx(mergeClasses("lucide-icon", "lucide", name ? `lucide-${name}` : "", $$sanitized_props.class))
    },
    null,
    void 0,
    void 0,
    3
  )}><!--[-->`;
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let [tag, attrs] = each_array[$$index];
    element($$payload, tag, () => {
      $$payload.out += `${spread_attributes({ ...attrs }, null, void 0, void 0, 3)}`;
    });
  }
  $$payload.out += `<!--]--><!---->`;
  slot($$payload, $$props, "default", {});
  $$payload.out += `<!----></svg>`;
  bind_props($$props, {
    name,
    color,
    size,
    strokeWidth,
    absoluteStrokeWidth,
    iconNode
  });
  pop();
}
function Palette($$payload, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "path",
      {
        "d": "M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"
      }
    ],
    [
      "circle",
      {
        "cx": "13.5",
        "cy": "6.5",
        "r": ".5",
        "fill": "currentColor"
      }
    ],
    [
      "circle",
      {
        "cx": "17.5",
        "cy": "10.5",
        "r": ".5",
        "fill": "currentColor"
      }
    ],
    [
      "circle",
      {
        "cx": "6.5",
        "cy": "12.5",
        "r": ".5",
        "fill": "currentColor"
      }
    ],
    [
      "circle",
      {
        "cx": "8.5",
        "cy": "7.5",
        "r": ".5",
        "fill": "currentColor"
      }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "palette" },
    $$sanitized_props,
    {
      iconNode,
      children: ($$payload2) => {
        $$payload2.out += `<!---->`;
        slot($$payload2, $$props, "default", {});
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    }
  ]));
}
function Rotate_cw($$payload, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "path",
      {
        "d": "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"
      }
    ],
    ["path", { "d": "M21 3v5h-5" }]
  ];
  Icon($$payload, spread_props([
    { name: "rotate-cw" },
    $$sanitized_props,
    {
      iconNode,
      children: ($$payload2) => {
        $$payload2.out += `<!---->`;
        slot($$payload2, $$props, "default", {});
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    }
  ]));
}
function Settings($$payload, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  const iconNode = [
    [
      "path",
      {
        "d": "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
      }
    ],
    [
      "circle",
      { "cx": "12", "cy": "12", "r": "3" }
    ]
  ];
  Icon($$payload, spread_props([
    { name: "settings" },
    $$sanitized_props,
    {
      iconNode,
      children: ($$payload2) => {
        $$payload2.out += `<!---->`;
        slot($$payload2, $$props, "default", {});
        $$payload2.out += `<!---->`;
      },
      $$slots: { default: true }
    }
  ]));
}
function _page($$payload, $$props) {
  push();
  let currentWords = [];
  let userInput = "";
  let activeWordIndex = 0;
  let typedWords = [];
  let wordCorrectness = [];
  let maxRowHeight = "";
  let rowGap = 20;
  let scrollOffset = 0;
  let timerDuration = 30;
  let timeRemaining = timerDuration;
  let wpm = 0;
  let testPhase = "waiting";
  let restarting = false;
  let currentTheme = "theme-dark";
  let currentTestMode = "time";
  let accuracy = 0;
  let currentWordlist = "english";
  getThemeLabel(currentTheme);
  const themePresets = [
    { id: "theme-dark", label: "dolphin dark" },
    { id: "theme-light", label: "dolphin light" },
    { id: "theme-ink", label: "ink" },
    { id: "theme-abyss", label: "abyss" },
    { id: "theme-midnight-plum", label: "midnight" },
    { id: "theme-blank", label: "blank" },
    { id: "theme-forest-night", label: "forest" },
    { id: "theme-cloud", label: "cloud" },
    { id: "theme-slate-grey", label: "slate" },
    { id: "theme-eagle", label: "eagle" },
    { id: "theme-warm-graphite", label: "graphite" },
    { id: "theme-arctic-night", label: "arctic" },
    { id: "theme-morning-dew", label: "morning dew" },
    { id: "theme-violet-dark", label: "violet" },
    { id: "theme-desert-dusk", label: "desert dusk" },
    { id: "theme-console", label: "console" },
    { id: "theme-peach", label: "peach" },
    { id: "theme-azure-mist", label: "azure" }
  ];
  const caretPosition = new Tween({ top: 0, left: 0, height: 0 }, { delay: 0, easing: linear, duration: 65 });
  function getThemeLabel(themeId) {
    const theme = themePresets.find((preset) => preset.id === themeId);
    return theme ? theme.label : themeId;
  }
  const each_array_6 = ensure_array_like(currentWords);
  $$payload.out += `<main${attr_class(`flex min-h-screen flex-col items-center justify-center transition-colors duration-300 ease-in-out ${currentTheme}`)} style="background-color: var(--color-bg); font-family: var(--font-family-secondary);">`;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--> <div class="relative"><div${attr_class("absolute -top-[3.5em] flex items-center space-x-0.5 rounded-lg p-2 text-sm text-[var(--color-text-default)] transition-opacity duration-300 max-[350px]:text-xs sm:-top-[2.5em] sm:space-x-3 sm:text-2xl md:space-x-10", void 0, {
    "opacity-0": testPhase === "finished",
    "pointer-events-none": testPhase === "finished"
  })} style="left: 50%; transform: translateX(-50%);"><button class="cursor-pointer rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]">`;
  Settings($$payload, { class: "h-4 w-4 sm:h-6 sm:w-6" });
  $$payload.out += `<!----></button> <button class="cursor-pointer rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]">`;
  Palette($$payload, { class: "h-4 w-4 sm:h-6 sm:w-6" });
  $$payload.out += `<!----></button> <div>|</div> <button${attr_class("cursor-pointer rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]", void 0, {
    "text-[var(--color-text-selected)]": currentTestMode === "time"
  })}>time</button> <button${attr_class("cursor-pointer rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]", void 0, {
    "text-[var(--color-text-selected)]": currentTestMode === "words"
  })}>words</button> <div>|</div> `;
  {
    $$payload.out += "<!--[-->";
    const each_array_4 = ensure_array_like([15, 30, 60]);
    $$payload.out += `<!--[-->`;
    for (let t = 0, $$length = each_array_4.length; t < $$length; t++) {
      let time = each_array_4[t];
      $$payload.out += `<button${attr_class("cursor-pointer rounded-lg p-2 transition-all duration-300 ease-in-out hover:bg-[var(--color-bg-hover)]", void 0, {
        "text-[var(--color-text-selected)]": timerDuration === time
      })}>${escape_html(time)}<span class="text-[0.85em]">s</span></button>`;
    }
    $$payload.out += `<!--]-->`;
  }
  $$payload.out += `<!--]--> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div> <div${attr_class("pointer-events-none absolute -top-[1.75em] left-[1.3em] p-2 text-2xl transition-opacity duration-300 sm:-top-[1.5em] sm:left-[0.85em] sm:text-4xl", void 0, {
    "opacity-0": testPhase !== "running"
  })} style="color: var(--color-text-default);">${escape_html(timeRemaining)}</div> <div${attr_class("pointer-events-none absolute -top-[1.75em] left-[1.3em] p-2 text-2xl transition-opacity duration-300 sm:-top-[1.5em] sm:left-[0.85em] sm:text-4xl", void 0, {
    "opacity-0": currentTestMode !== "words"
  })} style="color: var(--color-text-default);">${escape_html(activeWordIndex)}/${escape_html(currentWords.length)}</div> <div${attr_class("pointer-events-none absolute -top-[1.7em] left-[1.65em] p-2 text-xl transition-opacity duration-300 sm:-top-[1.5em] sm:left-[0.85em] sm:text-4xl", void 0, { "opacity-0": testPhase !== "finished" })} style="color: var(--color-text-default);"><span class="mr-5 md:mr-7"><span class="text-[var(--color-text-correct)]">${escape_html(wpm)}</span> wpm</span><span class="text-[var(--color-text-correct)]">${escape_html(accuracy)}%</span> acc</div> <div${attr_class("pointer-events-none absolute -top-[-8.2em] left-[1.8em] p-2 text-lg transition-opacity duration-300 sm:-top-[-7.4em] sm:left-[1.4em] sm:text-2xl", void 0, { "opacity-0": testPhase !== "finished" })} style="color: var(--color-text-correct);">test type <div class="text-[var(--color-text-default)]"><div>${escape_html(currentWordlist)}</div> `;
  {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div>time ${escape_html(timerDuration)}<span>s</span></div>`;
  }
  $$payload.out += `<!--]--></div></div> <div${attr_class("no-ligatures relative mx-8 cursor-text overflow-hidden text-2xl transition-opacity sm:text-4xl lg:max-w-325", void 0, { "opacity-0": restarting })}${attr_style("font-family: var(--font-family);", {
    "max-height": maxRowHeight,
    "min-height": maxRowHeight
  })} role="button" tabindex="0"><input autocapitalize="off" autocorrect="off" autocomplete="off" spellcheck="false" class="pointer-events-auto absolute opacity-0" type="text" id="typinginput"${attr("value", userInput)}/> <div id="words-container" class="flex flex-wrap justify-start gap-x-2.5 p-2 transition-transform duration-150 ease-in-out sm:gap-x-4"${attr_style("", {
    "row-gap": `${stringify(rowGap)}px`,
    transform: `translateY(${stringify(scrollOffset)}px)`
  })}><!--[-->`;
  for (let i = 0, $$length = each_array_6.length; i < $$length; i++) {
    let word = each_array_6[i];
    const isCompleted = i < activeWordIndex;
    const isActive = i === activeWordIndex;
    const isWordCorrect = i in wordCorrectness ? wordCorrectness[i] : true;
    const inputForThisWord = isCompleted ? typedWords[i] : isActive ? userInput : "";
    $$payload.out += `<div${attr_class("", void 0, {
      "underline-incorrect": !isWordCorrect && isCompleted
    })}>`;
    if (isCompleted || isActive) {
      $$payload.out += "<!--[-->";
      const each_array_7 = ensure_array_like(word);
      const each_array_8 = ensure_array_like(inputForThisWord?.length > word.length ? inputForThisWord.slice(word.length) : "");
      $$payload.out += `<!--[-->`;
      for (let j = 0, $$length2 = each_array_7.length; j < $$length2; j++) {
        let char = each_array_7[j];
        const isTyped = j < (inputForThisWord?.length || 0);
        const isCorrect = isTyped && inputForThisWord[j] === char;
        $$payload.out += `<span${attr_style(`color: ${stringify(isTyped && isCorrect ? "var(--color-text-correct)" : isTyped && !isCorrect ? "var(--color-text-incorrect)" : isCompleted && !isTyped ? "var(--color-text-default)" : "var(--color-text-active)")};`)}>${escape_html(char)}</span>`;
      }
      $$payload.out += `<!--]--><!--[-->`;
      for (let k = 0, $$length2 = each_array_8.length; k < $$length2; k++) {
        let extraChar = each_array_8[k];
        $$payload.out += `<span style="color: var(--color-text-incorrect);">${escape_html(extraChar)}</span>`;
      }
      $$payload.out += `<!--]-->`;
    } else {
      $$payload.out += "<!--[!-->";
      $$payload.out += `<span style="color: var(--color-text-default);">${escape_html(word)}</span>`;
    }
    $$payload.out += `<!--]--></div>`;
  }
  $$payload.out += `<!--]--> <div class="invisible">asdf</div> <div class="invisible">asdf</div> <div class="invisible">asdf</div> <div class="invisible">asdf</div> <div class="invisible">asdf</div> <div class="invisible">asdf</div> <div class="invisible">asdf</div> <div class="invisible">asdf</div> <div class="invisible">asdf</div> <div class="invisible">asdf</div> <div class="invisible">asdf</div> <div class="invisible">asdf</div></div> <div${attr_class(`absolute w-[3px] rounded-sm ${stringify("blink-caret")}`, void 0, { "hidden": false })}${attr_style("background-color: var(--color-caret);", {
    top: `${stringify(caretPosition.current.top)}px`,
    left: `${stringify(caretPosition.current.left)}px`,
    height: `${stringify(caretPosition.current.height)}px`
  })}></div></div> <button class="absolute top-[10em] flex cursor-pointer rounded-lg p-2 duration-300 hover:[background-color:var(--color-bg-hover)] sm:top-[11.75em]" style="color: var(--color-text-default); left: 50%; transform: translateX(-50%);" tabindex="0">`;
  Rotate_cw($$payload, { class: "h-6 w-6 sm:h-7 sm:w-7" });
  $$payload.out += `<!----></button></div></main>`;
  pop();
}
export {
  _page as default
};
