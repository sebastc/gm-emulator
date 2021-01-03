<template>
  <div v-if="this.currentGame">
    <div class="display-1 d-inline-block"><span class="font-weight-bold">{{ currentGame.name }}</span> <small class="text--secondary font-weight-light">({{ currentGame.tags.join(" / ")}})</small> </div>
    <div class="display-1 d-inline-block"></div>

    <v-alert type="info" text outlined dense border="left" color="primary" class="mb-2" v-if="tutorialStep < 6">
      <ul>
        <li v-if="tutorialStep === 0"><edit-character/>Créez au moins un personnage joueur</li>
        <li v-if="tutorialStep > 0">Ajoutez autant de personages que vous voulez, joueurs ou non</li>
        <li v-if="tutorialStep === 2"><edit-goal />Créez au moins un objectif de groupe</li>
        <li v-if="tutorialStep > 2">Ajoutez des objectifs au besoin</li>
        <li v-if="tutorialStep === 3">
          <edit-scene />Vous pouvez maintenant créer une scène qui pourra utiliser ces éléments</li>
        <li v-if="tutorialStep > 3">Quand la scène arrive à sa conclusion, créez-en une nouvelle.</li>
        <li v-if="tutorialStep === 4">
          <add-event /><add-question /><add-comment />Ajouter des éléments à la scène</li>
        <li v-if="tutorialStep > 4">
          Ajouter des éléments à la scène pour la dérouler jusqu'à sa conclusion</li>
      </ul>
    </v-alert>

    <v-expansion-panels accordion popout v-model="selectedSceneIndex">
      <v-expansion-panel
        v-for="(item,i) in currentGame.scenes"
        :key="i"
      >
        <v-expansion-panel-header>
          <div>
          <b>{{item.name || 'Scène sans nom'}}</b>
            <span v-if="item.summary"> : {{item.summary}}</span>
          <edit-scene :index="i"/>
          </div>
        </v-expansion-panel-header>
        <v-expansion-panel-content>
          <v-card v-if="item.context">
            <v-card-text> {{item.context}}</v-card-text>
          </v-card>
          <v-timeline dense>
            <v-timeline-item small fill-dot v-for="(sceneLog, i) in currentLogs" :key="i" :icon="sceneLog.icon || 'fas fa-bolt'"> <!-- hide-dot -->
              <template v-slot:icon>
                <v-avatar v-if="sceneLog.avatar">
                  <img :src="sceneLog.avatar">
                  <!--
                  <img src="https://live.staticflickr.com/130/364558161_bf6529e043_m.jpg" v-if="i%6===2">
                  <img src="https://live.staticflickr.com/3164/2759452413_65b9d7c017_m.jpg" v-if="i%6===5">
                  -->
                </v-avatar>
              </template>
              <v-card class="elevation-3" v-if="sceneLog.interpretation">
                <v-card-text>{{sceneLog.interpretation}} <edit-log :index="sceneLog.index" /></v-card-text>
              </v-card>
              <span class="body-2 font-italic font-weight-light text--secondary" v-else>{{sceneLog.mechanical}}
                <tag  v-for="(inspiration, i) in sceneLog.inspirations" :key="i" :label="inspiration" />
                <edit-log :index="sceneLog.index" />
              </span>
            </v-timeline-item>
          </v-timeline>
        </v-expansion-panel-content>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-toolbar dense v-if="selectedSceneIndex===currentSceneIndex || currentSceneIndex === -1">

      <v-icon small class="mr-3">fas fa-plus-circle</v-icon>

      <v-divider vertical class="mr-2" />

      <edit-scene />

      <v-divider vertical class="mr-2" />

      <add-event />
      <add-question :disabled="!currentGame.scenes.length"/>
      <add-comment :disabled="!currentGame.scenes.length"/>

      <v-divider vertical class="mr-2" />

      <edit-character />
      <edit-goal />
      <v-tooltip top>
        <template v-slot:activator="{ on }">
          <v-btn color="primary" fab small disabled class="mr-2" v-on="on">
            <v-icon small>fas fa-place-of-worship</v-icon>
          </v-btn>
        </template>
        <span>Lieux</span>
      </v-tooltip>
      <v-tooltip top>
        <template v-slot:activator="{ on }" v-on="on">
          <v-btn color="primary" fab small disabled class="mr-2">
            <v-icon small>fas fa-flask</v-icon>
          </v-btn>
        </template>
        <span>Objets</span>
      </v-tooltip>

      <!--
      fas fa-scroll               Logs
      far fa-user-circle          PC
      fas fa-chalkboard-teacher   NPC
      far fa-compass              Threads
      fas fa-bullseye
      fas fa-plus-circle          Add
      -->
    </v-toolbar>
  </div>
</template>
<script>
import { mapActions, mapGetters, mapState } from 'vuex'
import EditScene from '@/components/EditScene'
import EditCharacter from '@/components/EditCharacter'
import EditLog from '@/components/EditLog'
import Tag from '@/components/Tag'
import EditGoal from '@/components/EditGoal'
import AddQuestion from '@/components/AddQuestion'
import AddComment from '@/components/AddComment'
import AddEvent from '@/views/AddEvent'

export default {
  name: 'Game',
  components: { AddEvent, AddComment, AddQuestion, Tag, EditCharacter, EditScene, EditLog, EditGoal },
  beforeRouteUpdate (to, from, next) {
    console.log('to:' + to, 'from:' + from)
    if (!this.currentGame) {
      next('/load')
    } else {
      next()
    }
  },
  data () {
    return {
      selectedSceneIndex: []
    }
  },
  computed: {
    ...mapState([
      'currentGame'
    ]),
    ...mapGetters([
      'activePlayerCharacters', 'activeNonPlayerCharacters', 'activeGoals'
    ]),
    currentSceneIndex () {
      return this.currentGame.scenes.length - 1
    },
    currentLogs () {
      let res = []
      if (this.selectedSceneIndex >= 0) {
        res = this.currentGame.sceneLogs[this.selectedSceneIndex] || []
      } else if (this.selectedSceneIndex && this.selectedSceneIndex.length) {
        res = this.currentGame.sceneLogs[this.selectedSceneIndex[0]] || []
      }
      console.log('currentLogs: ', res)
      return res
    },
    oldScenes () {
      return this.currentGame.scenes.slice(0, this.currentSceneIndex)
    },
    currentScene () {
      return this.currentGame.scenes.slice(this.currentSceneIndex)
    },
    tutorialStep () {
      let res
      if (this.currentGame.scenes.length > 1) {
        res = 6
      } else if (this.currentGame.sceneLogs.length) {
        res = 5
      } else if (this.currentGame.scenes.length) {
        res = 4
      } else if (this.activeGoals.length) {
        res = 3
      } else if (this.activeNonPlayerCharacters.length) {
        res = 2
      } else if (this.activePlayerCharacters.length) {
        res = 1
      } else {
        res = 0
      }
      console.log('tutorialStep', res)
      return res
    }
  },
  methods: {
    ...mapActions(['closeCurrentGame']),
    goToTheEnd () {
      setTimeout(() => document.body.scrollIntoView(false), 20)
    }
  },
  watch: {
    currentScene () {
      this.selectedSceneIndex = this.currentSceneIndex
      this.goToTheEnd()
    }
  },
  mounted () {
    this.panels = [this.currentGame.scenes.length - 1]
    if (this.currentSceneIndex >= 0) {
      this.selectedSceneIndex = this.currentSceneIndex
    }
  }
}
</script>

<style lang="sass">
  $timeline-item-padding: 5px
</style>
