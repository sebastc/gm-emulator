<template>
    <edit-dialog title="Scène" icon="far fa-image" @reset="onReset" @save="onSave" :id="id" :disabled="isDisabled">
      <template>
        <v-textarea v-if="isPrevSummaryEnabled" auto-grow outlined clearable v-model="prevSummary"
                    label="Résumé de la scène précédente" class="mt-2"
                    hint="Résumé de la scène précédente pour faciliter la vue d'ensemble"
        />
        <v-divider v-if="isPrevSummaryEnabled" />
        <v-text-field label="Nom" v-model="name" placeholder="Nom de la scène" />
        <v-textarea auto-grow outlined clearable v-model="context" label="Contexte"
                    append-icon="fas fa-dice"
                    @click:append="newRandomContext"
                    hint="Description de la situation initiale de la scène (lieu, partis en présence, ambiance, etc...)"
        />
        Aspects:
        <string-list v-model="aspects" hint="aspect" random-tag="__aspect"/>
        <v-textarea v-if="isCurrentSummaryEnabled" auto-grow outlined clearable v-model="summary" label="Résumé"
                    hint="Résumé de la scène complète pour faciliter la vue d'ensemble"
        />
      </template>
    </edit-dialog>
</template>

<script>
import { mapActions, mapGetters, mapState } from 'vuex'
import { randomize } from '@/utils/random.ts'
import EditDialog from '@/components/EditDialog'
import StringList from '@/components/StringList'
import { RSScene } from '@/store/types'
export default {
  name: 'EditScene',
  components: { StringList, EditDialog },
  props: {
    id: String
  },
  data () {
    return {
      name: '',
      context: '',
      summary: '',
      aspects: [],
      prevSummary: ''
    }
  },
  computed: {
    ...mapState(['current']),
    ...mapGetters(['activePlayerCharacters', 'activePlaces']),
    isNew () {
      return !this.isModification
    },
    isModification () {
      return !!this.id
    },
    sceneCount () {
      return this.current?.scenes?.length ?? 0
    },
    isLastScene () {
      return this.current?.scenes?.[this.sceneCount - 1]?.id === this.id
    },
    isPrevSummaryEnabled () {
      return this.isNew && this.sceneCount > 0
    },
    isCurrentSummaryEnabled () {
      return this.isModification && !this.isLastScene
    },
    isDisabled () {
      return !this.activePlayerCharacters.length || !this.current.goals.length
    }
  },
  methods: {
    ...mapActions(['updateScene', 'getSceneById', 'getRandom']),
    async newRandomContext () {
      const place = Math.random() > 0.5 && this.activePlaces.length > 0 ? randomize(this.activePlaces).name : await this.getRandom({ query: '__place' })
      const goal = await this.getRandom({ query: '__goal' })
      this.context = ` - Objectif : ${goal}
 - Lieu : ${place}`
      if (Math.random() < 0.2) {
        const event = await this.getRandom({ query: '__event' })
        this.context += `
 - Evénement : ${event}`
      }
    },
    onSave (isNew) {
      if (isNew) {
        if (this.isPrevSummaryEnabled) {
          this.updateScene({ ...this.current.scenes[this.sceneCount - 1], summary: this.prevSummary })
        }
        this.updateScene({
          id: undefined,
          name: this.name,
          context: this.context,
          summary: '',
          isActive: true,
          isChanged: false,
          isInterrupted: false,
          aspects: this.aspects.filter(v => v?.length)
        })
      } else {
        this.updateScene({
          id: this.id,
          name: this.name,
          context: this.context,
          summary: this.summary,
          isActive: true,
          isChanged: false,
          isInterrupted: false,
          aspects: this.aspects.filter(v => v?.length)
        })
      }
    },
    async onReset (isModification) {
      if (isModification) {
        const sceneById = await this.getSceneById(this.id)
        const { name, context, summary, aspects = [] } = sceneById
        this.name = name
        this.context = context
        this.summary = summary
        this.aspects = [...aspects]
      } else {
        this.name = ''
        this.context = ''
        this.summary = ''
        this.prevSummary = ''
        this.aspects = []
      }
    }
  }
}
</script>

<style scoped>

</style>
