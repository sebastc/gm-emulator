<template>
  <edit-dialog title="Objectif" icon="fas fa-location-arrow" @reset="onReset" @save="onSave" :index="index" :disabled="disabled">
    <!--
      fas fa-location-arrow
      far fa-compass
      fas fa-bullseye
    -->
    <template>
      <v-text-field label="Objectif" v-model="label" hint="Objectif poursuivi par le ou les joureurs" />
    </template>
  </edit-dialog>
</template>

<script>
import { randomName } from '@/utils/names'
import EditDialog from '@/components/EditDialog'
import { mapActions, mapState, mapGetters } from 'vuex'

export default {
  name: 'EditGoal',
  components: { EditDialog },
  props: {
    index: Number
  },
  data () {
    return {
      label: '',
      isActive: false
    }
  },
  computed: {
    ...mapState(['currentGame']),
    ...mapGetters(['activePlayerCharacters', 'activeNonPlayerCharacters']),
    disabled () {
      return !this.activePlayerCharacters.length || !this.activeNonPlayerCharacters.length
    }
  },
  methods: {
    ...mapActions(['updateGoal']),
    newRandomName () {
      this.name = randomName()
    },
    onSave (isNew) {
      this.updateGoal({
        index: isNew ? -1 : this.index,
        label: this.label,
        isActive: this.isActive
      })
    },
    onReset (isModification) {
      if (isModification) {
        this.label = this.currentGame.goals[this.index].label
        this.isActive = this.currentGame.goals[this.index].isActive
      } else {
        this.label = ''
        this.isActive = true
      }
    }
  }
}
</script>

<style scoped>

</style>
