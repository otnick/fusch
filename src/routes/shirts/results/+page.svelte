<script lang="ts">
	import { onMount } from 'svelte';
	import { io } from "socket.io-client";

	// Startdaten (könnten auch vom Server kommen, hier nur Beispiel)
	type Registration = { name: string; size: string };
	let registrations: Registration[] = [];

	let totalRegistrations = registrations.length;

	// Socket.IO-Verbindung
	const socket = io("https://socket.fusch.fun/");

	onMount(() => {
		// Anfrage an den Server, die bestehenden Shirt-Interessen zu bekommen
		socket.emit("getShirtInterests");

		// Antwort vom Server mit den Daten empfangen
		socket.on("shirtInterests", (data) => {
			registrations = data.filter((entry: { name: string; size: any; }) => entry.name?.trim() && entry.size);
			totalRegistrations = registrations.length;
		});

		socket.on("shirtInterest", (newEntry) => {
			if (newEntry.name?.trim() && newEntry.size) {
				registrations = [...registrations, newEntry];
				totalRegistrations = registrations.length;
			}
		});
	});
</script>

<div class="min-h-screen p-6 flex flex-col items-center justify-start">
	<h1 class="text-3xl font-bold mb-6 text-center">👕 T-Shirt Interessen</h1>

	<div class="card w-full max-w-2xl p-4 overflow-x-auto">
		<table class="table w-full table-zebra">
			<thead>
				<tr>
					<th class="text-left">Name</th>
					<th class="text-left">Größe</th>
				</tr>
			</thead>
			<tbody>
				{#each registrations as entry}
					<tr>
						<td>{entry.name}</td>
						<td>{entry.size}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<div class="mt-2 font-semibold">
			Gesamt: {totalRegistrations}
		</div>
	</div>
</div>
