<template>
  <edit-dialog title="Personnage" icon="far fa-user-circle" @reset="onReset" @save="onSave" :index="index">
    <template>
      <v-radio-group v-model="isPlayer" row>
        <v-radio label="Joueur (PJ)" :value="true"></v-radio>
        <v-radio label="Non-Joueur (PNJ)" :value="false"></v-radio>
      </v-radio-group>
      <v-text-field label="Nom" v-model="name" hint="Nom du personage"
                    append-icon="fas fa-dice"
                    @click:append="newRandomName" />
    </template>
  </edit-dialog>
</template>

<script>
import { randomName } from '@/utils/names'
import EditDialog from '@/components/EditDialog'
import { mapActions, mapState } from 'vuex'

export default {
  name: 'EditCharacter',
  components: { EditDialog },
  props: {
    index: String
  },
  data () {
    return {
      name: '',
      isPlayer: false
    }
  },
  computed: {
    ...mapState(['currentGame'])
  },
  methods: {
    ...mapActions(['updateCharacter']),
    newRandomName () {
      this.name = randomName()
    },
    onSave (isNew) {
      this.updateCharacter({
        id: isNew ? undefined : this.index,
        name: this.name,
        isPlayer: this.isPlayer,
        isActive: true
      })
    },
    onReset (isModification) {
      if (isModification) {
        const original = this.currentGame.characters.find(c => c.id === this.index)
        if (original) {
          this.name = original.name
          this.isPlayer = original.isPlayer
          return
        }
      }
      this.name = randomName()
      this.isPlayer = false
    }
  }
}
</script>

<style scoped>

</style>
