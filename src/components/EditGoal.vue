<template>
  <edit-dialog title="Objectif" icon="fas fa-location-arrow" @reset="onReset" @save="onSave" :id="id" :disabled="disabled">
    <!--
      fas fa-location-arrow
      far fa-compass
      fas fa-bullseye
    -->
    <template>
      <v-text-field label="Objectif" v-model="label" hint="Objectif poursuivi par le ou les joureurs"
                    append-icon="fas fa-dice"
                    @click:append="newRandomGoal"/>
    </template>
  </edit-dialog>
</template>

<script>
import { randomName } from '@/utils/names'
import EditDialog from '@/components/EditDialog'
import { mapActions, mapState, mapGetters } from 'vuex'
import { cleanupRandomConstruct, randomize } from '@/utils/random'

export default {
  name: 'EditGoal',
  components: { EditDialog },
  props: {
    id: String
  },
  data () {
    return {
      label: '',
      isActive: true
    }
  },
  computed: {
    ...mapGetters(['activePlayerCharacters', 'activeNonPlayerCharacters']),
    ...mapState(['current']),
    disabled () {
      return !this.activePlayerCharacters.length || !this.activeNonPlayerCharacters.length
    }
  },
  methods: {
    ...mapActions(['updateGoal', 'getGoalById']),
    newRandomGoal () {
      const action = randomize(this.current.game.tagsByType.__action)
      const object = randomize(this.current.game.tagsByType.__action_object)
      this.label = cleanupRandomConstruct(`${action} de ${object}`)
    },
    onSave (isNew) {
      this.updateGoal({
        id: this.id,
        label: this.label,
        isActive: this.isActive
      })
    },
    async onReset (isModification) {
      if (isModification) {
        const { label, isActive } = await this.getGoalById(this.id)
        this.label = label
        this.isActive = isActive
      } else {
        this.newRandomGoal()
        this.isActive = true
      }
    }
  }
}
</script>

<style scoped>

</style>
