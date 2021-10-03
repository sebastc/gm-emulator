<template>
  <edit-dialog title="Lieux" icon="fas fa-place-of-worship" @reset="onReset" @save="onSave" :index="index">
    <template>
      <v-text-field label="Nom" v-model="name" hint="Nom du lieux"
                    append-icon="fas fa-dice"
                    @click:append="newRandomPlace" />
    </template>
  </edit-dialog>
</template>

<script>
import { randomName } from '@/utils/names'
import EditDialog from '@/components/EditDialog'
import { mapActions, mapGetters, mapState } from 'vuex'
import { randomize } from '@/utils/random'

export default {
  name: 'EditPlace',
  components: { EditDialog },
  props: {
    index: Number
  },
  data () {
    return {
      name: ''
    }
  },
  computed: {
    ...mapState(['currentGame']),
    ...mapGetters(['activeTagsByType'])
  },
  methods: {
    ...mapActions(['updatePlace']),
    newRandomPlace () {
      this.name = randomize(this.activeTagsByType.get('__place')) + ' de ' + randomName()
    },
    onSave (isNew) {
      this.updatePlace({
        index: isNew ? -1 : this.index,
        name: this.name
      })
    },
    onReset (isModification) {
      if (isModification) {
        this.name = this.currentGame.places[this.index].name
      } else {
        this.newRandomPlace()
      }
    }
  }
}
</script>

<style scoped>

</style>
