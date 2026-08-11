<script lang="ts">
  import { MAX_ENTITY_PHOTOS } from "@lib/entity-photos";
  import ImageUpload from "./ImageUpload.svelte";

  type Props = {
    values?: string[];
    prefix?: string;
    disabled?: boolean;
    inputId?: string;
    label?: string;
  };

  let {
    values = $bindable([]),
    prefix = "uploads",
    disabled = false,
    inputId = "entity-photo-upload",
    label = "Photos (optional)",
  }: Props = $props();

  const slotCount = $derived(
    Math.min(MAX_ENTITY_PHOTOS, Math.max(1, values.length + 1)),
  );

  function updatePhoto(index: number, value: string | null) {
    const next = [...values];
    if (value) {
      next[index] = value;
    } else {
      next.splice(index, 1);
    }
    values = next.filter((url): url is string => Boolean(url));
  }
</script>

<div class="photo-collection-upload">
  <p class="photo-collection-upload__label">{label}</p>
  <p class="entity-editor-muted photo-collection-upload__hint">
    Add up to {MAX_ENTITY_PHOTOS} photos. JPEG, PNG, or WebP up to 5 MB each.
  </p>
  {#each Array.from({ length: slotCount }) as _, index (index)}
    <ImageUpload
      inputId={`${inputId}-${index + 1}`}
      label={`Photo ${index + 1}`}
      prefix={prefix}
      value={values[index] ?? null}
      {disabled}
      onValueChange={(value) => updatePhoto(index, value)}
    />
  {/each}
</div>

<style>
  .photo-collection-upload {
    display: grid;
    gap: 0.5rem;
  }

  .photo-collection-upload__label {
    margin: 0;
    color: #3d3437;
    font-size: 0.875rem;
    font-weight: 650;
  }

  .photo-collection-upload__hint {
    margin: 0;
  }
</style>
