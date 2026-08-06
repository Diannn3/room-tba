<script lang="ts">
  import RoomResult from "@ui/room/RoomResult.svelte";
  import AppContextTestShell from "@test/AppContextTestShell.svelte";
  import { loadedAppContext } from "@test/fixtures/app-context";
</script>

<AppContextTestShell data={loadedAppContext()}>
  <RoomResult />
</AppContextTestShell>
