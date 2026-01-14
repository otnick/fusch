<script lang="ts">
  import '../app.css';
  import { Navigation } from '@skeletonlabs/skeleton-svelte';
  import Shirt from '@lucide/svelte/icons/shirt';
  import Mic from '@lucide/svelte/icons/mic';
  import Headphones from '@lucide/svelte/icons/headphones';
  import { page } from '$app/state';

  const links = [
    { label: 'Party', href: '/', icon: Headphones },
    { label: 'Shirts', href: '/shirts', icon: Shirt },
    { label: 'Line-Up', href: '/lineup', icon: Mic }
    // { label: 'Galerie', href: '/galerie' }, // TODO
  ];
</script>

<!-- Page content -->
<div>
  <slot />
</div>

<!-- Bottom Navigation -->
<div
  class="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50
         bg-success-200 shadow-lg rounded-t-xl
         w-full max-w-2xs p-3
         flex justify-between text-black"
>
  {#each links as { label, href, icon }, i}
    <Navigation.Tile
      id={`tile-${i}`}
      label={label}
      href={href}
      active="bg-success-950 text-white"
      {...(page.url.pathname === href ? { selected: true } : {})}
    >
      <svelte:component this={icon} size={24} />
      <span class="sr-only">{label}</span>
    </Navigation.Tile>
  {/each}
</div>
