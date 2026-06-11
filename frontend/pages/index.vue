<script setup lang="ts">
</script>

<template>
  <div class="flex flex-col h-screen">
    <TransportControls />
    <div class="flex-1 flex flex-col lg:flex-row gap-2 p-2">
      <div class="flex-1 min-h-[400px]">
        <StarMap />
      </div>
      <div class="w-full lg:w-96">
        <StrategySelector />
        <ClassFilter />
        <EventLog />
      </div>
    </div>
  </div>
</template>
