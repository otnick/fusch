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

<div class="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 bg-surface-900 shadow-lg rounded-t-xl w-full max-w-md p-3 flex justify-between">
	{#each links as { label, href }, i}
		<Navigation.Tile
			id={`tile-${i}`}
			label={label}
			href={href}
			{...(page.url.pathname === href ? { selected: true } : {})}
		>
			<IconBox />
		</Navigation.Tile>
	{/each}
</div>

<!-- <div>
	<a href="/impressum" class="fixed bottom-0 right-0 m-4 p-2 bg-primary text-on-primary rounded-full shadow-lg hover:bg-primary/90 transition-colors">
		Impressum
	</a>
</div> -->