<template>
    <edit-dialog title="Scène" icon="far fa-image" @reset="onReset" @save="onSave" :index="index" :disabled="isDisabled">
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
export default {
  name: 'EditScene',
  components: { EditDialog },
  props: {
    index: Number
  },
  data () {
    return {
      name: '',
      context: '',
      summary: '',
      prevSummary: ''
    }
  },
  computed: {
    ...mapState(['currentGame']),
    ...mapGetters(['activeTagsByType', 'activePlayerCharacters', 'activePlaces']),
    isNew () {
      return !this.isModification
    },
    isModification () {
      return this.index >= 0
    },
    sceneCount () {
      return this.currentGame.scenes.length
    },
    isLastScene () {
      return this.sceneCount - 1 === this.index
    },
    isPrevSummaryEnabled () {
      return this.isNew && this.sceneCount > 0
    },
    isCurrentSummaryEnabled () {
      return this.isModification && !this.isLastScene
    },
    isDisabled () {
      return !this.activePlayerCharacters.length || !this.currentGame.goals.length
    }
  },
  methods: {
    ...mapActions(['updateScene']),
    newRandomContext () {
      const place = Math.random() > 0.5 && this.activePlaces.length > 0 ? randomize(this.activePlaces).name : randomize(this.activeTagsByType.get('__place'))
      this.context = ' - Lieu : ' + place + '\n - action : ' +
        randomize(this.activeTagsByType.get('__action')) + '\n - objet : ' +
        randomize(this.activeTagsByType.get('__action_object'))
    },
    onSave (isNew) {
      if (isNew) {
        if (this.isPrevSummaryEnabled) {
          this.updateScene({
            index: this.sceneCount - 1,
            summary: this.prevSummary
          })
        }
        this.updateScene({
          index: -1,
          name: this.name,
          context: this.context,
          summary: ''
        })
      } else {
        this.updateScene({
          index: this.index,
          name: this.name,
          context: this.context,
          summary: this.summary
        })
      }
    },
    onReset (isModification) {
      if (isModification) {
        this.name = this.currentGame.scenes[this.index].name
        this.context = this.currentGame.scenes[this.index].context
        this.summary = this.currentGame.scenes[this.index].summary
      } else {
        this.name = ''
        this.context = ''
        this.summary = ''
        this.prevSummary = ''
      }
    }
  }
}
</script>

<style scoped>

</style>
