<script lang="ts">
	import '../app.css';
	import { Navigation } from '@skeletonlabs/skeleton-svelte';
  	import IconBox from '@lucide/svelte/icons/box';
	import { page } from '$app/state';

  const links = [
    { label: 'Leinwand', href: '/' },
    { label: 'Shirts', href: '/shirts' },
    { label: 'Line-Up', href: '/lineup' },
    // { label: 'Galerie', href: '/galerie' }, TODO: Implement Galerie
  ];
</script>

<div>
	<slot />
</div>

<div class="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 bg-success-200 shadow-lg rounded-t-xl w-full max-w-2xs p-3 flex justify-between text-black">
	{#each links as { label, href }, i}
		<Navigation.Tile
			id={`tile-${i}`}
			label={label}
			href={href}
			active="bg-success-950 text-white"
			{...(page.url.pathname === href ? { selected: true } : {})}
		>
			<IconBox />
		</Navigation.Tile>
	{/each}
</div>