<template>
  <v-chip v-if="label" class="mr-1 mb-1" x-small pill>{{ label }}</v-chip>
</template>
<script>
export default {
  name: 'tag',
  props: {
    label: {
      type: String,
      default: ''
    }
  }
}
</script>
<style lang="sass">
$timeline-item-padding: 5px
</style>
