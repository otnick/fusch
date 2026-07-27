<script lang="ts">
	import PsychedelicCanvas from '$lib/PsychedelicCanvas.svelte';

	type Slot = { time: string; act: string; break?: boolean };
	type Stage = { name: string; slots: Slot[] };

	const stages: Stage[] = [
		{
			name: 'Waterstage',
			slots: [
				{ time: '20:00 – 22:00', act: 'DJ Hauki' },
				{ time: '21:00 – 22:00', act: 'luca' },
				{ time: '22:00 – 23:00', act: 'uumm' },
				{ time: '23:00 – 00:00', act: 'Hns' },
				{ time: '01:30 – 02:30', act: 'LEMILIA' }
			]
		},
		{
			name: 'Stonestage',
			slots: [
				{ time: '22:00', act: 'DJ Claus' },
				{ time: 'danach', act: 'Klassiker', break: true }
			]
		}
	];
</script>

<!-- Synced music (same engine as start page); visuals hidden behind the starfield -->
<PsychedelicCanvas />

<!-- Black sky with stars -->
<div class="starfield pointer-events-none fixed inset-0 z-0"></div>

<div class="relative z-10 min-h-screen text-surface-50">
	<!-- Deko: eigene Rainbow-Drips (SVG), laufen über die volle Höhe -->
	<svg
		class="drips pointer-events-none absolute inset-0 z-0 h-full w-full mix-blend-screen"
		viewBox="0 0 800 1300"
		preserveAspectRatio="xMidYMin slice"
		aria-hidden="true"
	>
		<defs>
			<!-- jeder Drip eine eigene Farbfamilie -->
			<linearGradient id="d1" x1="0" y1="0" x2="0" y2="1300" gradientUnits="userSpaceOnUse">
				<stop offset="0" stop-color="#a855f7" />
				<stop offset="0.5" stop-color="#d946ef" />
				<stop offset="1" stop-color="#f472b6" />
			</linearGradient>
			<linearGradient id="d2" x1="0" y1="0" x2="0" y2="1300" gradientUnits="userSpaceOnUse">
				<stop offset="0" stop-color="#22d3ee" />
				<stop offset="0.5" stop-color="#3b82f6" />
				<stop offset="1" stop-color="#6366f1" />
			</linearGradient>
			<linearGradient id="d3" x1="0" y1="0" x2="0" y2="1300" gradientUnits="userSpaceOnUse">
				<stop offset="0" stop-color="#34d399" />
				<stop offset="0.5" stop-color="#84cc16" />
				<stop offset="1" stop-color="#fde047" />
			</linearGradient>
			<linearGradient id="d4" x1="0" y1="0" x2="0" y2="1300" gradientUnits="userSpaceOnUse">
				<stop offset="0" stop-color="#fbbf24" />
				<stop offset="0.5" stop-color="#f97316" />
				<stop offset="1" stop-color="#ef4444" />
			</linearGradient>
			<linearGradient id="d5" x1="0" y1="0" x2="0" y2="1300" gradientUnits="userSpaceOnUse">
				<stop offset="0" stop-color="#f472b6" />
				<stop offset="0.5" stop-color="#ec4899" />
				<stop offset="1" stop-color="#a855f7" />
			</linearGradient>
			<filter id="dripglow" x="-40%" y="-40%" width="180%" height="180%">
				<feGaussianBlur stdDeviation="14" result="big" />
				<feGaussianBlur stdDeviation="5" result="small" />
				<feMerge>
					<feMergeNode in="big" />
					<feMergeNode in="small" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>

		<g fill="none" stroke-linecap="round" filter="url(#dripglow)">
			<!-- linker großer Drip -->
			<path d="M64,-30 C48,180 150,300 100,520 C60,700 150,880 104,1060 C76,1180 92,1222 86,1256" stroke="url(#d1)" stroke-width="30" />
			<!-- rechter Cluster -->
			<path d="M560,-30 C548,180 620,320 585,520 C560,680 592,760 578,822" stroke="url(#d2)" stroke-width="18" />
			<path d="M624,-30 C612,200 690,360 645,600 C610,820 700,1000 650,1180 C632,1236 640,1250 640,1258" stroke="url(#d3)" stroke-width="24" />
			<path d="M694,-30 C694,180 740,340 706,560 C680,740 722,900 700,1060 C690,1130 694,1146 694,1150" stroke="url(#d4)" stroke-width="18" />
			<path d="M748,-30 C756,200 792,380 754,600 C724,800 782,1000 742,1180 C734,1232 740,1250 742,1256" stroke="url(#d5)" stroke-width="22" />
		</g>
		<g filter="url(#dripglow)">
			<!-- Tropfen-Enden, farblich passend zum jeweiligen Drip -->
			<circle cx="86" cy="1256" r="30" fill="url(#d1)" />
			<circle cx="578" cy="822" r="15" fill="url(#d2)" />
			<circle cx="640" cy="1258" r="20" fill="url(#d3)" />
			<circle cx="694" cy="1150" r="15" fill="url(#d4)" />
			<circle cx="742" cy="1256" r="18" fill="url(#d5)" />
		</g>
	</svg>

	<div class="relative z-10 mx-auto max-w-2xl px-4 py-12 md:py-16">
		<!-- Title -->
		<div class="mb-12 text-center">
			<span class="inline-flex items-center gap-2 rounded-full border border-surface-50/10 bg-surface-50/10 px-3 py-1 text-xs tracking-widest backdrop-blur">
				FUSCH
				<span class="h-1.5 w-1.5 rounded-full bg-primary-400"></span>
				8. August 2026
			</span>
			<h1 class="mt-4 bg-gradient-to-r from-primary-400 via-tertiary-400 to-secondary-400 bg-clip-text text-5xl font-black tracking-tight text-transparent md:text-6xl">
				timetable
			</h1>
		</div>

		<!-- Stages -->
		<div class="space-y-10">
			{#each stages as stage}
				<section>
					<h2 class="mb-4 flex items-center gap-3 text-3xl font-extrabold tracking-tight md:text-4xl">
						<span class="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-primary-400 to-tertiary-400"></span>
						{stage.name}
					</h2>

					<ol class="overflow-hidden rounded-2xl border border-surface-50/10 bg-surface-900/40 backdrop-blur">
						{#each stage.slots as slot, i}
							<li
								class="flex items-baseline gap-4 px-4 py-3 md:px-5 {i > 0 ? 'border-t border-surface-50/5' : ''} {slot.break ? 'opacity-60' : ''}"
							>
								<span class="shrink-0 font-mono text-sm tabular-nums text-tertiary-300 md:text-base">
									{slot.time}
								</span>
								<span class="text-base font-semibold md:text-lg {slot.break ? 'font-normal italic' : ''}">
									{slot.act}
								</span>
							</li>
						{/each}
					</ol>
				</section>
			{/each}
		</div>
	</div>

	<a href="https://fusch.fun/" rel="noopener noreferrer"
		class="fixed bottom-4 right-4 z-50 text-white/60 hover:text-white text-sm underline underline-offset-4 transition-colors">
		Startseite
	</a>

	<!-- whitespace zum scrollen -->
	<div class="h-32"></div>
</div>

<style>
	/* Farbwechsel + Puls im Glow der Drips */
	.drips {
		opacity: 0.6;
		animation: dripHue 7s linear infinite;
	}
	@keyframes dripHue {
		to {
			filter: hue-rotate(360deg);
		}
	}

	/* Tiefer, dunkler Weltraum-Hintergrund mit dezenter Farbe */
	.starfield {
		background-color: #020106;
		background-repeat: no-repeat;
		background-image:
			radial-gradient(70% 55% at 18% 12%, rgba(124, 58, 237, 0.16), transparent 72%),
			radial-gradient(60% 50% at 88% 24%, rgba(20, 184, 166, 0.11), transparent 74%),
			radial-gradient(65% 55% at 62% 82%, rgba(236, 72, 153, 0.11), transparent 74%),
			radial-gradient(55% 45% at 8% 84%, rgba(37, 99, 235, 0.1), transparent 74%),
			radial-gradient(50% 45% at 95% 92%, rgba(168, 85, 247, 0.09), transparent 74%);
	}

	/* Zwei Sternen-Ebenen, gegenphasig funkelnd */
	.starfield::before,
	.starfield::after {
		content: '';
		position: absolute;
		inset: 0;
		background-repeat: no-repeat;
	}

	/* Ebene 1: viele kleine Sterne, weiß/bläulich */
	.starfield::before {
		animation: twinkleA 6.5s ease-in-out infinite;
		background-image:
			radial-gradient(1.2px 1.2px at 6% 12%, rgba(255, 255, 255, 0.9), transparent 60%),
			radial-gradient(1px 1px at 13% 33%, rgba(200, 220, 255, 0.8), transparent 60%),
			radial-gradient(1.4px 1.4px at 21% 8%, rgba(255, 255, 255, 0.85), transparent 60%),
			radial-gradient(1px 1px at 27% 52%, rgba(255, 255, 255, 0.7), transparent 60%),
			radial-gradient(1.1px 1.1px at 34% 24%, rgba(210, 230, 255, 0.8), transparent 60%),
			radial-gradient(1px 1px at 39% 71%, rgba(255, 255, 255, 0.65), transparent 60%),
			radial-gradient(1.3px 1.3px at 45% 15%, rgba(255, 255, 255, 0.85), transparent 60%),
			radial-gradient(1px 1px at 51% 44%, rgba(255, 255, 255, 0.7), transparent 60%),
			radial-gradient(1.1px 1.1px at 57% 63%, rgba(200, 220, 255, 0.75), transparent 60%),
			radial-gradient(1px 1px at 63% 28%, rgba(255, 255, 255, 0.65), transparent 60%),
			radial-gradient(1.2px 1.2px at 69% 49%, rgba(255, 255, 255, 0.8), transparent 60%),
			radial-gradient(1px 1px at 74% 18%, rgba(220, 235, 255, 0.7), transparent 60%),
			radial-gradient(1.3px 1.3px at 80% 66%, rgba(255, 255, 255, 0.8), transparent 60%),
			radial-gradient(1px 1px at 85% 37%, rgba(255, 255, 255, 0.65), transparent 60%),
			radial-gradient(1.1px 1.1px at 91% 55%, rgba(205, 225, 255, 0.75), transparent 60%),
			radial-gradient(1px 1px at 96% 22%, rgba(255, 255, 255, 0.6), transparent 60%),
			radial-gradient(1.2px 1.2px at 9% 61%, rgba(255, 255, 255, 0.75), transparent 60%),
			radial-gradient(1px 1px at 17% 82%, rgba(255, 255, 255, 0.6), transparent 60%),
			radial-gradient(1.3px 1.3px at 30% 90%, rgba(255, 255, 255, 0.8), transparent 60%),
			radial-gradient(1px 1px at 43% 79%, rgba(210, 230, 255, 0.65), transparent 60%),
			radial-gradient(1.1px 1.1px at 55% 88%, rgba(255, 255, 255, 0.7), transparent 60%),
			radial-gradient(1px 1px at 67% 76%, rgba(255, 255, 255, 0.6), transparent 60%),
			radial-gradient(1.2px 1.2px at 78% 93%, rgba(255, 255, 255, 0.7), transparent 60%),
			radial-gradient(1px 1px at 88% 84%, rgba(200, 220, 255, 0.6), transparent 60%),
			radial-gradient(1.1px 1.1px at 3% 45%, rgba(255, 255, 255, 0.65), transparent 60%),
			radial-gradient(1px 1px at 97% 70%, rgba(255, 255, 255, 0.55), transparent 60%),
			radial-gradient(1px 1px at 11% 5%, rgba(255, 255, 255, 0.6), transparent 60%),
			radial-gradient(1.2px 1.2px at 19% 47%, rgba(210, 230, 255, 0.7), transparent 60%),
			radial-gradient(1px 1px at 25% 71%, rgba(255, 255, 255, 0.55), transparent 60%),
			radial-gradient(1.1px 1.1px at 32% 37%, rgba(255, 255, 255, 0.7), transparent 60%),
			radial-gradient(1px 1px at 37% 3%, rgba(255, 255, 255, 0.55), transparent 60%),
			radial-gradient(1.2px 1.2px at 41% 58%, rgba(200, 220, 255, 0.65), transparent 60%),
			radial-gradient(1px 1px at 49% 26%, rgba(255, 255, 255, 0.6), transparent 60%),
			radial-gradient(1.1px 1.1px at 53% 83%, rgba(255, 255, 255, 0.7), transparent 60%),
			radial-gradient(1px 1px at 59% 5%, rgba(255, 255, 255, 0.55), transparent 60%),
			radial-gradient(1.2px 1.2px at 61% 71%, rgba(215, 232, 255, 0.65), transparent 60%),
			radial-gradient(1px 1px at 66% 40%, rgba(255, 255, 255, 0.6), transparent 60%),
			radial-gradient(1.1px 1.1px at 71% 84%, rgba(255, 255, 255, 0.65), transparent 60%),
			radial-gradient(1px 1px at 76% 30%, rgba(255, 255, 255, 0.55), transparent 60%),
			radial-gradient(1.2px 1.2px at 82% 12%, rgba(205, 225, 255, 0.65), transparent 60%),
			radial-gradient(1px 1px at 87% 62%, rgba(255, 255, 255, 0.6), transparent 60%),
			radial-gradient(1.1px 1.1px at 93% 40%, rgba(255, 255, 255, 0.65), transparent 60%),
			radial-gradient(1px 1px at 99% 33%, rgba(255, 255, 255, 0.55), transparent 60%),
			radial-gradient(1.2px 1.2px at 2% 22%, rgba(255, 255, 255, 0.6), transparent 60%),
			radial-gradient(1px 1px at 7% 88%, rgba(255, 255, 255, 0.55), transparent 60%),
			radial-gradient(1.1px 1.1px at 23% 96%, rgba(210, 230, 255, 0.6), transparent 60%),
			radial-gradient(1px 1px at 47% 91%, rgba(255, 255, 255, 0.55), transparent 60%),
			radial-gradient(1.2px 1.2px at 90% 95%, rgba(255, 255, 255, 0.65), transparent 60%);
	}

	/* Ebene 2: größere, hellere & farbige Sterne */
	.starfield::after {
		animation: twinkleB 4.8s ease-in-out infinite;
		background-image:
			radial-gradient(2.2px 2.2px at 11% 20%, rgba(190, 220, 255, 1), transparent 62%),
			radial-gradient(1.8px 1.8px at 24% 63%, rgba(255, 240, 210, 0.95), transparent 62%),
			radial-gradient(2px 2px at 36% 38%, rgba(255, 255, 255, 1), transparent 62%),
			radial-gradient(1.7px 1.7px at 47% 9%, rgba(255, 200, 240, 0.9), transparent 62%),
			radial-gradient(2.4px 2.4px at 58% 55%, rgba(255, 255, 255, 1), transparent 62%),
			radial-gradient(1.8px 1.8px at 66% 32%, rgba(200, 255, 245, 0.9), transparent 62%),
			radial-gradient(2px 2px at 76% 12%, rgba(255, 255, 255, 0.95), transparent 62%),
			radial-gradient(1.7px 1.7px at 83% 48%, rgba(230, 210, 255, 0.9), transparent 62%),
			radial-gradient(2.1px 2.1px at 92% 34%, rgba(255, 255, 255, 1), transparent 62%),
			radial-gradient(1.8px 1.8px at 15% 74%, rgba(255, 245, 220, 0.9), transparent 62%),
			radial-gradient(2px 2px at 28% 86%, rgba(190, 220, 255, 0.95), transparent 62%),
			radial-gradient(1.7px 1.7px at 41% 68%, rgba(255, 255, 255, 0.9), transparent 62%),
			radial-gradient(2.3px 2.3px at 52% 92%, rgba(255, 210, 245, 0.9), transparent 62%),
			radial-gradient(1.8px 1.8px at 64% 80%, rgba(255, 255, 255, 0.9), transparent 62%),
			radial-gradient(2px 2px at 73% 60%, rgba(205, 255, 240, 0.9), transparent 62%),
			radial-gradient(1.7px 1.7px at 86% 74%, rgba(255, 255, 255, 0.9), transparent 62%),
			radial-gradient(2.1px 2.1px at 95% 88%, rgba(220, 230, 255, 0.95), transparent 62%),
			radial-gradient(1.8px 1.8px at 5% 92%, rgba(255, 255, 255, 0.9), transparent 62%),
			radial-gradient(2px 2px at 6% 30%, rgba(255, 235, 255, 0.9), transparent 62%),
			radial-gradient(1.7px 1.7px at 33% 6%, rgba(200, 240, 255, 0.9), transparent 62%),
			radial-gradient(2.2px 2.2px at 70% 96%, rgba(255, 255, 255, 0.95), transparent 62%),
			radial-gradient(1.8px 1.8px at 99% 55%, rgba(255, 220, 240, 0.9), transparent 62%),
			radial-gradient(1.9px 1.9px at 19% 44%, rgba(255, 255, 255, 0.95), transparent 62%),
			radial-gradient(1.7px 1.7px at 44% 48%, rgba(200, 240, 255, 0.9), transparent 62%),
			radial-gradient(2.1px 2.1px at 62% 20%, rgba(255, 245, 220, 0.9), transparent 62%),
			radial-gradient(1.8px 1.8px at 80% 88%, rgba(255, 255, 255, 0.9), transparent 62%),
			radial-gradient(2px 2px at 38% 78%, rgba(230, 210, 255, 0.9), transparent 62%),
			radial-gradient(1.7px 1.7px at 9% 58%, rgba(255, 255, 255, 0.9), transparent 62%),
			radial-gradient(2.2px 2.2px at 88% 18%, rgba(200, 255, 245, 0.9), transparent 62%),
			radial-gradient(1.8px 1.8px at 55% 68%, rgba(255, 255, 255, 0.9), transparent 62%),
			radial-gradient(2px 2px at 30% 28%, rgba(255, 215, 245, 0.9), transparent 62%),
			radial-gradient(1.7px 1.7px at 96% 66%, rgba(255, 255, 255, 0.9), transparent 62%),
			radial-gradient(2.1px 2.1px at 12% 84%, rgba(210, 230, 255, 0.9), transparent 62%),
			radial-gradient(1.8px 1.8px at 48% 22%, rgba(255, 255, 255, 0.9), transparent 62%);
	}

	@keyframes twinkleA {
		0%,
		100% {
			opacity: 0.65;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes twinkleB {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.55;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.drips,
		.starfield::before,
		.starfield::after {
			animation: none;
		}
	}
</style>
