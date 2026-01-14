<script lang="ts">
	import MicIcon from '@lucide/svelte/icons/mic';
	import MusicIcon from '@lucide/svelte/icons/music-2';
	import HeadphonesIcon from '@lucide/svelte/icons/headphones';
	import ZapIcon from '@lucide/svelte/icons/zap';

	const artists = [
		{ name: 'DJ Hauki', desc: 'All-Time Classics', icon: MicIcon },
		{ name: 'DJ Claus', desc: 'Psychedelic & Rock', icon: ZapIcon },
		{ name: 'uumm', desc: 'Drum & Bass', icon: HeadphonesIcon },
		{ name: 'hns', desc: 'Drum & Bass aber anders', icon: MusicIcon },
		{ name: 'pipi & kaka', desc: 'Techno', icon: MusicIcon },
	];
</script>

<div class="min-h-screen py-10 px-4 flex flex-col items-center bg-secondary-200 text-on-background">
	<h1 class="text-3xl font-bold mb-8 text-center">Lineup 2025</h1>

	<div class="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-5xl">
		{#each artists as artist, i}
			<div class="rounded-2xl shadow-md p-6 transition-transform hover:scale-105 bg-tertiary-100 hover:bg-tertiary-200 {i === artists.length - 1 ? 'sm:col-span-2' : ''}">
				<div class="flex flex-col items-center gap-4">
					<svelte:component this={artist.icon} size={40} class="text-primary" />
					<h2 class="text-xl font-semibold">{artist.name}</h2>
					<p class="text-sm text-center text-muted-foreground">{artist.desc}</p>
				</div>
			</div>
		{/each}
	</div>
	<!-- whitespace zum scrollen -->
	<div class="h-64"></div>
</div>
