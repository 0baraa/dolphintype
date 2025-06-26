<script>
	import { onMount } from 'svelte';

	onMount(async () => {
		const wordsResponse = await fetch('/english1k.json');
		const allWords = await wordsResponse.json();

		console.log(allWords);
	});
</script>
