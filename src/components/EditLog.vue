<template>
    <edit-dialog title="Log" :icon="icon || 'fas fa-bolt'" @reset="onReset" @save="onSave" :id="id">
      <template>
        <div class="mt-2">
          <div v-if="mechanical">
            {{ mechanical }}
          </div>
          <div v-if="inspirations.length">
            Inspiration:
            <tag  v-for="(inspiration, i) in inspirations" :key="i" :label="inspiration" />
          </div>
          <v-textarea auto-grow outlined clearable v-model="interpretation" label="Interpretation"
                      hint="Une meilleur description" />
        </div>
      </template>
    </edit-dialog>
</template>

<script>
import { mapActions, mapState } from 'vuex'
import EditDialog from '@/components/EditDialog'
import Tag from '@/components/Tag'
export default {
  name: 'EditLog',
  components: { EditDialog, Tag },
  props: {
    id: String
  },
  data () {
    return {
      icon: '',
      avatar: '',
      mechanical: '',
      interpretation: '',
      inspirations: []
    }
  },
  computed: {
  },
  methods: {
    ...mapActions(['updateSceneLog', 'getLogById']),
    onSave (isNew) {
      this.updateSceneLog({
        id: this.id,
        icon: this.icon,
        avatar: this.avatar,
        mechanical: this.mechanical,
        interpretation: this.interpretation,
        inspirations: [...this.inspirations ?? []]
      })
    },
    async onReset (isModification) {
      if (isModification) {
        const item = await this.getLogById(this.id)
        this.icon = item.icon
        this.avatar = item.avatar
        this.mechanical = item.mechanical
        this.interpretation = item.interpretation
        this.inspirations = [...item.inspirations ?? []]
      } else {
        this.icon = ''
        this.avatar = ''
        this.mechanical = ''
        this.interpretation = ''
        this.inspirations = []
      }
    }
  }
}
</script>

<style scoped>

</style>
