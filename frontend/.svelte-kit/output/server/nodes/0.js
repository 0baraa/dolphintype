

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "ssr": false
};
export const universal_id = "src/routes/+layout.js";
export const imports = ["_app/immutable/nodes/0.DOVRc-ky.js","_app/immutable/chunks/DbjEScTK.js","_app/immutable/chunks/Llywsv6d.js"];
export const stylesheets = ["_app/immutable/assets/0.BfFIhanQ.css"];
export const fonts = [];
