<script lang="ts">
  import BottomSheet from "@ui/BottomSheet.svelte";

  let {
    open = true,
    onDismiss,
  }: { open?: boolean; onDismiss?: () => void } = $props();
</script>

<BottomSheet {open} {onDismiss}>
  <p>Sheet content</p>
</BottomSheet>
