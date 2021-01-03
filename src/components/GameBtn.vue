<template>
    <v-btn icon @click="onClick" v-if="!isHidden">
      <v-icon v-if="isGo">fas fa-scroll</v-icon>
      <v-icon v-else-if="isClose">fas fa-sign-out-alt</v-icon>
      <v-icon v-else-if="isLoad">far fa-folder-open</v-icon>
    </v-btn>
</template>
<script lang="ts">

import { mapActions, mapState } from 'vuex'

export default {
  name: 'game-btn',
  computed: {
    ...mapState(['currentGame']),
    isOnGamePage (): boolean {
      const b = this.routeEquals('Game')
      console.log('isOnGamePage:' + b)
      return b
    },
    isOnLoadPage (): boolean {
      const b = this.routeEquals('LoadGame')
      console.log('isOnLoadPage:' + b)
      return b
    },
    isGameLoaded (): boolean {
      return !!this.currentGame
    },
    isGo (): boolean {
      const b: boolean = this.isGameLoaded && !this.isOnGamePage
      console.log('isGo: ' + b)
      return b
    },
    isClose (): boolean {
      console.log('isGameLoaded: ' + this.isGameLoaded)
      console.log('isOnGamePage: ' + this.isOnGamePage)
      const b: boolean = this.isGameLoaded && this.isOnGamePage
      console.log('isClose: ' + b)
      return b
    },
    isLoad (): boolean {
      const b = !this.isGameLoaded
      console.log('isLoad: ' + b)
      return b
    },
    isHidden (): boolean {
      const b = !this.isGameLoaded && this.isOnLoadPage
      console.log('isHidden: ' + b)
      return b
    }
  },
  methods: {
    ...mapActions(['closeCurrentGame']),
    routeEquals (name: string): boolean {
      return this.$route.name === name
    },
    onClick () {
      if (this.isGo) {
        this.$router.push('/game')
      } else if (this.isClose) {
        this.closeGame()
      } else if (this.isLoad) {
        this.$router.push('/load')
      } else {
        console.log('Unexpected state, shouldn\'t be visible')
      }
    },
    closeGame () {
      this.closeCurrentGame()
      this.$router.push('/')
    }
  }
}
</script>
