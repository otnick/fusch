<script lang="ts">
	import { io } from "socket.io-client";
	const socket = io("https://socket.fusch.fun/");

	let name = '';
	let size = '';
	let submitted = false;
	let error = '';
</script>

<!-- Verschwommenes Hintergrundbild -->
<!-- <img src="/assets/image.jpg" alt="Motiv" class="fixed inset-0 object-cover w-full h-full blur-md" /> -->

<!-- Formular Container mit höherem z-index und leicht transparentem Hintergrund -->
<div class="relative flex items-center justify-center min-h-screen p-4 bg-success-600 bg-opacity-90">
	{#if submitted}
		<div class="card p-6 w-full max-w-md text-center">
			<h2 class="text-2xl font-bold mb-4">🎉 Danke, {name}!</h2>
			<p>Wir haben deine Wunschgröße <strong>{size}</strong> notiert.</p>
		</div>
	{:else}
		<form
			on:submit|preventDefault={() => {
				error = '';
				if (!name.trim()) {
					error = 'Bitte gib deinen Namen an.';
					return;
				}
				if (!size) {
					error = 'Bitte wähle eine Größe aus.';
					return;
				}
				// Hier sendest du die Daten ans Backend:
				socket.emit("shirtInterest", { name, size });
				submitted = true;
			}}
			class="card w-full max-w-md p-6 space-y-6"
		>
			<h1 class="text-3xl font-bold text-center text-success-950">👕 T-Shirt Interesse</h1>

			{#if error}
				<div class="alert alert-error">{error}</div>
			{/if}

			<div class="form-control text-success-950">
				<label class="label font-semibold text-success-950" for="name">Name</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					class="input input-filled w-full text-success-950"
					placeholder="Dein Name"
					required
				/>
			</div>

			<div class="form-control text-success-950">
				<label class="label font-semibold" for="size">Größe</label>
				<select
					id="size"
					bind:value={size}
					class="select select-filled w-full"
					required
				>
					<option value="" disabled selected>-- Wähle deine Größe --</option>
					<option value="S">S</option>
					<option value="M">M</option>
					<option value="L">L</option>
					<option value="XL">XL</option>
				</select>
			</div>

			<button type="submit" class="btn preset-tonal-success w-full">Interesse anmelden</button>
		</form>
	{/if}
</div>
