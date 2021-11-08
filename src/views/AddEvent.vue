<template>
  <v-tooltip top>
    <template v-slot:activator="{ on }">
      <v-btn color="primary" fab small class="mr-2" v-on="on" :disabled="disabled" @click="addEvent">
        <v-icon small>fas fa-bolt</v-icon>
      </v-btn>
    </template>
    <span>Evénement</span>
  </v-tooltip>
</template>
<script>
import { mapActions, mapState } from 'vuex'

export default {
  name: 'add-event',
  props: {
  },
  computed: {
    ...mapState(['current']),
    disabled () {
      return !this.current.scenes?.length ?? 0
    }
  },
  methods: {
    ...mapActions(['randomEvent']),
    addEvent () {
      this.randomEvent()
    }
  }
}
</script>
<style lang="sass">
$timeline-item-padding: 5px
</style>
