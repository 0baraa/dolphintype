export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.png","fonts/AtkinsonHyperlegible-Regular.woff2","fonts/Boon-Regular.woff2","fonts/CascadiaMono-Regular.woff2","fonts/Comfortaa-Regular.woff2","fonts/ComingSoon-Regular.woff2","fonts/CommitMono-Regular.woff2","fonts/FiraCode-Regular.woff2","fonts/Geist-Medium.woff2","fonts/GeistMono-Medium.woff2","fonts/Hack-Regular.woff2","fonts/IBMPlexMono-Regular.woff2","fonts/IBMPlexSans-SemiBold.woff2","fonts/Inconsolata-Regular.woff2","fonts/Itim-Regular.woff2","fonts/JetBrainsMono-Regular.woff2","fonts/Kanit-Regular.woff2","fonts/Lalezar-Regular.woff2","fonts/Lato-Regular.woff2","fonts/LexendDeca-Regular.woff2","fonts/Merriweather-Regular.woff2","fonts/Mononoki-Regular.woff2","fonts/Montserrat-Regular.woff2","fonts/Nunito-Bold.woff2","fonts/OpenDyslexic-Regular.woff2","fonts/OverpassMono-Regular.woff2","fonts/Oxygen-Regular.woff2","fonts/Parkinsans-Regular.woff2","fonts/Roboto-Regular.woff2","fonts/RobotoMono-Regular.woff2","fonts/Sarabun-Bold.woff2","fonts/SourceCodePro-Regular.woff2","fonts/TitilliumWeb-Regular.woff2","fonts/Ubuntu-Regular.woff2","fonts/UbuntuMono-Regular.woff2","fonts/Vazirmatn-Regular.woff2","restart.svg","timer.svg","wordlists/czech.json","wordlists/dutch.json","wordlists/english.json","wordlists/english1k.json","wordlists/english5k.json","wordlists/french.json","wordlists/german.json","wordlists/greek.json","wordlists/hungarian.json","wordlists/italian.json","wordlists/polish.json","wordlists/portuguese.json","wordlists/romanian.json","wordlists/russian.json","wordlists/spanish.json","wordlists/turkish.json","wordlists/ukrainian.json"]),
	mimeTypes: {".png":"image/png",".woff2":"font/woff2",".svg":"image/svg+xml",".json":"application/json"},
	_: {
		client: {start:"_app/immutable/entry/start.CLor_8EA.js",app:"_app/immutable/entry/app.Bh1eCxeK.js",imports:["_app/immutable/entry/start.CLor_8EA.js","_app/immutable/chunks/b7sPNFaR.js","_app/immutable/chunks/Llywsv6d.js","_app/immutable/chunks/ysnUmOBl.js","_app/immutable/entry/app.Bh1eCxeK.js","_app/immutable/chunks/Llywsv6d.js","_app/immutable/chunks/DKznuauR.js","_app/immutable/chunks/DbjEScTK.js","_app/immutable/chunks/ysnUmOBl.js","_app/immutable/chunks/U4mljgKQ.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
