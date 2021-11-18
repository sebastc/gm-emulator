<template>
  <edit-dialog title="Personnage" icon="far fa-user-circle" @reset="onReset" @save="onSave" :id="id">
    <template>
      <v-radio-group v-model="isPlayer" row>
        <v-radio label="Joueur (PJ)" :value="true"></v-radio>
        <v-radio label="Non-Joueur (PNJ)" :value="false"></v-radio>
      </v-radio-group>
      <v-text-field label="Nom" v-model="name" hint="Nom du personage"
                    append-icon="fas fa-dice"
                    @click:append="newRandomName" />
      Aspects:
      <string-list v-model="aspects" />
    </template>
  </edit-dialog>
</template>

<script>
import { randomName } from '@/utils/names'
import EditDialog from '@/components/EditDialog'
import { mapActions, mapState } from 'vuex'
import StringList from '@/components/StringList'

export default {
  name: 'EditCharacter',
  components: { StringList, EditDialog },
  props: {
    id: String
  },
  data () {
    return {
      name: '',
      isPlayer: false,
      aspects: []
    }
  },
  computed: {
  },
  methods: {
    ...mapActions(['updateCharacter', 'getCharacterById']),
    newRandomName () {
      this.name = randomName()
    },
    onSave (isNew) {
      this.updateCharacter({
        id: this.id,
        name: this.name,
        isPlayer: this.isPlayer,
        isActive: true,
        aspects: this.aspects.filter(v => v?.length)
      })
    },
    async onReset (isModification) {
      if (isModification) {
        const { name, isPlayer, aspects = [] } = await this.getCharacterById(this.id)
        this.name = name
        this.isPlayer = isPlayer
        this.aspects = [...aspects]
      } else {
        this.name = randomName()
        this.isPlayer = false
        this.aspects = []
      }
    }
  }
}
</script>

<style scoped>

</style>
