<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import type { EntityPhoto } from "@lib/entity-photos";

  type Props = {
    name: string;
    photos?: EntityPhoto[];
    imageUrl?: string | null;
    alt?: string;
  };

  type GalleryImage = {
    src: string;
    alt: string;
    attributionName: string | null;
    attributionProfileUrl: string | null;
  };

  let {
    name,
    photos = [],
    imageUrl = null,
    alt = name,
  }: Props = $props();

  const images = $derived.by(() => {
    if (photos.length > 0) {
      return photos.map(
        (photo): GalleryImage => ({
          src: photo.url,
          alt,
          attributionName: photo.attributionName,
          attributionProfileUrl: photo.attributionProfileUrl,
        }),
      );
    }
    return imageUrl
      ? [
          {
            src: imageUrl,
            alt,
            attributionName: null,
            attributionProfileUrl: null,
          },
        ]
      : [];
  });

  let index = $state(0);
  $effect(() => {
    name;
    photos;
    imageUrl;
    index = 0;
  });

  const current = $derived(images[Math.min(index, images.length - 1)]);

  function previous() {
    index = (index - 1 + images.length) % images.length;
  }

  function next() {
    index = (index + 1) % images.length;
  }
</script>

{#if current}
  <figure class="entity-photo-gallery">
    <div class="entity-photo-gallery__frame">
      <img
        class="entity-image"
        src={current.src}
        alt={current.alt}
        width="800"
        height="450"
        loading="lazy"
        decoding="async"
        referrerpolicy="strict-origin-when-cross-origin"
      />
      {#if images.length > 1}
        <button
          type="button"
          class="entity-photo-gallery__nav entity-photo-gallery__nav--prev"
          onclick={previous}
          aria-label={`Previous photo of ${name}`}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          class="entity-photo-gallery__nav entity-photo-gallery__nav--next"
          onclick={next}
          aria-label={`Next photo of ${name}`}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <span class="entity-photo-gallery__counter" aria-live="polite">
          {index + 1}/{images.length}
        </span>
      {/if}
    </div>
    {#if current.attributionName}
      <figcaption class="entity-photo-gallery__credit">
        Photo by
        {#if current.attributionProfileUrl}
          <a
            href={current.attributionProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            >{current.attributionName}</a
          >
        {:else}
          <span>{current.attributionName}</span>
        {/if}
      </figcaption>
    {/if}
  </figure>
{/if}
