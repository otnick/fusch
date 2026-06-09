<script lang="ts">
  import { onMount } from "svelte";
  import MarkerGallery from "$lib/components/MarkerGallery.svelte";

  export let API_BASE: string;

  type Draft = { lat: number; lng: number } | null;

  let addMode = false;
  let draft: Draft = null;

  let title = "";
  let file: File | null = null;

  let uploading = false;
  let errorMsg = "";
  let infoMsg = "";

  function setError(msg: string) { errorMsg = msg; infoMsg = ""; }
  function setInfo(msg: string) { infoMsg = msg; errorMsg = ""; }

  function enableAddMode() {
    addMode = true;
    window.dispatchEvent(new CustomEvent("fusch:setAddMode", { detail: { enabled: true } }));
    setInfo("Add-Mode aktiv — klick auf die Karte ✨");
  }

  async function upload() {
    try {
      if (!addMode) {
        setError("Bitte zuerst den Add-Mode aktivieren.");
        return;
      }

      window.dispatchEvent(new CustomEvent("fusch:requestUpload"));
      await new Promise((r) => setTimeout(r, 0));

      if (!draft) {
        setError("Bitte auf die Karte klicken, um die Position zu wählen.");
        return;
      }
      if (!file) {
        setError("Bitte ein Bild auswählen.");
        return;
      }

      uploading = true;
      setInfo("Upload läuft...");

      const fd = new FormData();
      fd.append("image", file);
      fd.append("lat", String(draft.lat));
      fd.append("lng", String(draft.lng));
      fd.append("title", title);

      const res = await fetch(`${API_BASE}/api/markers`, { method: "POST", body: fd });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Upload fehlgeschlagen");

      setInfo("✅ Spot gespeichert! (live für alle)");
      title = "";
      file = null;

      window.dispatchEvent(new CustomEvent("fusch:clearDraft"));
      addMode = false;
      window.dispatchEvent(new CustomEvent("fusch:setAddMode", { detail: { enabled: false } }));
    } catch (e: any) {
      setError(e?.message ?? "Upload fehlgeschlagen");
    } finally {
      uploading = false;
    }
  }

  onMount(() => {
    const onDraft = (ev: any) => { draft = ev.detail as Draft; };
    const onSetAddMode = (ev: any) => { addMode = !!ev.detail?.enabled; };
    const onUploadTarget = (ev: any) => { draft = ev.detail as Draft; };

    window.addEventListener("fusch:draft", onDraft);
    window.addEventListener("fusch:setAddMode", onSetAddMode);
    window.addEventListener("fusch:uploadTarget", onUploadTarget);

    return () => {
      window.removeEventListener("fusch:draft", onDraft);
      window.removeEventListener("fusch:setAddMode", onSetAddMode);
      window.removeEventListener("fusch:uploadTarget", onUploadTarget);
    };
  });
</script>

<div class="h-full">
  <div class="h-full rounded-3xl border border-surface-50/10 bg-surface-900/40 backdrop-blur-xl shadow-2xl overflow-hidden">
    <div class="p-5 border-b border-surface-50/10">
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-lg font-extrabold tracking-tight">🎟️ Sticker hinzufügen</div>
          <div class="text-sm opacity-80">Fusch Sticker auf die Karte heften</div>
        </div>
        <span class="badge {addMode ? 'variant-filled-primary' : 'variant-soft-surface'}">
          {addMode ? "Add-Mode" : "View"}
        </span>
      </div>
    </div>

    <div class="p-5 space-y-4">
      {#if errorMsg}
        <div class="rounded-2xl p-3 bg-error-500/10 border border-error-500/20 text-error-400">
          {errorMsg}
        </div>
      {/if}

      {#if infoMsg}
        <div class="rounded-2xl p-3 bg-primary-500/10 border border-primary-500/20">
          {infoMsg}
        </div>
      {/if}

      <div class="rounded-2xl p-4 bg-surface-950/35 border border-surface-50/10">
        <div class="text-xs uppercase tracking-widest opacity-70">Position</div>
        {#if draft}
          <div class="mt-1 font-mono text-sm">{draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}</div>
        {:else}
          <div class="mt-1 text-sm opacity-80">Noch keine Position gewählt.</div>
        {/if}
      </div>

      <div class="space-y-3">
        <label class="label">
          <span class="label-text">Titel (optional)</span>
          <input class="input" placeholder="z.B. Spiral Stage 02:13" bind:value={title} />
        </label>

        <label class="label">
          <span class="label-text">Foto</span>
          <input
            class="input"
            type="file"
            accept="image/*"
            on:change={(e) => {
              const t = e.currentTarget as HTMLInputElement;
              file = t.files?.[0] ?? null;
            }}
          />
        </label>
      </div>

      <div class="grid gap-2">
        {#if !addMode}
          <button class="btn variant-filled-primary w-full shadow-lg" on:click={enableAddMode}>
            ✦ Sticker-Mode aktivieren
          </button>
        {/if}

        <button
          class="btn {addMode ? 'variant-filled-tertiary' : 'variant-soft-surface'} w-full shadow-lg"
          disabled={uploading}
          on:click={upload}
        >
          {uploading ? "Lade hoch..." : "📤 Sticker hochladen"}
        </button>

        <button
          class="btn variant-soft-surface w-full"
          on:click={() => {
            window.dispatchEvent(new CustomEvent("fusch:clearDraft"));
            title = "";
            file = null;
            setInfo("Zurückgesetzt.");
          }}
        >
          Position zurücksetzen
        </button>
      </div>

      <!-- NEW: gallery -->
      <MarkerGallery {API_BASE} />
    </div>
  </div>
</div>
