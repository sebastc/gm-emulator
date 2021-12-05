<template>
  <edit-dialog title="Lieux" icon="fas fa-place-of-worship" @reset="onReset" @save="onSave" :id="id">
    <template>
      <v-text-field label="Nom" v-model="name" hint="Nom du lieux"
                    append-icon="fas fa-dice"
                    @click:append="newRandomPlace" />
      Aspects:
      <string-list v-model="aspects" hint="aspect" random-tag="__aspect"/>
    </template>
  </edit-dialog>
</template>

<script>
import EditDialog from '@/components/EditDialog'
import { mapActions, mapState } from 'vuex'
import StringList from '@/components/StringList'

export default {
  name: 'EditPlace',
  components: { StringList, EditDialog },
  props: {
    id: String
  },
  data () {
    return {
      name: '',
      isActive: true,
      aspects: []
    }
  },
  computed: {
    ...mapState(['current'])
  },
  methods: {
    ...mapActions(['updatePlace', 'getPlaceById', 'getRandom']),
    async newRandomPlace () {
      this.name = await this.getRandom({ query: '__place_aspect', tags: ['__place'] })
    },
    onSave () {
      this.updatePlace({
        id: this.id,
        name: this.name,
        isActive: this.isActive,
        aspects: this.aspects.filter(v => v?.length)
      })
    },
    async onReset (isModification) {
      if (isModification) {
        const { name, isActive, aspects = [] } = await this.getPlaceById(this.id)
        this.name = name
        this.isActive = isActive
        this.aspects = [...aspects]
      } else {
        await this.newRandomPlace()
        this.isActive = true
        this.aspects = []
      }
    }
  }
}
</script>

<style scoped>

</style>
