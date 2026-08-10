<script>
  import ScanHistoryList from '$lib/components/ScanHistoryList.svelte';
  import AdSlot from '$lib/components/AdSlot.svelte';
</script>

<div class="page-wrap">
  <div class="brut-card">
    <ScanHistoryList />
  </div>
  <AdSlot unit="rectangle" />
</div>

<style>
  .page-wrap {
    max-width: 600px;
    margin: 1rem auto;
    padding: 0 0.75rem 5rem;
  }
</style>
