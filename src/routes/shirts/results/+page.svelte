<script lang="ts">
	// Beispiel-Daten (später ersetzen durch `load` oder API)
	let registrations = [
		{ name: 'Anna', size: 'M' },
		{ name: 'Ben', size: 'L' },
		{ name: 'Clara', size: 'S' },
		{ name: 'David', size: 'XL' }
	];

	let totalRegistrations = registrations.length;
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
        <div>
            Gesamt: {totalRegistrations}
        </div>
	</div>
</div>