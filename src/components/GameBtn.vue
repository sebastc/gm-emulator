<template>
  <v-btn icon @click="onClick" v-if="!isHidden">
    <v-icon v-if="isGo">fas fa-scroll</v-icon>
    <v-icon v-else-if="isClose">fas fa-sign-out-alt</v-icon>
    <v-icon v-else-if="isLoad">far fa-folder-open</v-icon>
  </v-btn>
</template>
<script lang="ts">

import { mapActions, mapState } from 'vuex'
import Vue from 'vue'
import Component from 'vue-class-component'
import { VBtn, VIcon } from 'vuetify/lib'

@Component({
  components: { VBtn, VIcon },
  methods: { ...mapActions(['closeCurrentGame']) },
  computed: { ...mapState(['currentGame']) }
})
export default class GameBtn extends Vue {
  /* Expose mapped store actions */
  closeCurrentGame!: () => any

  routeEquals (name: string): boolean {
    return this.$route.name === name
  }

  routerPush (location: string) {
    // eslint-disable-next-line dot-notation
    // this['router'].push(location)
    this.$router.push(location)
  }

  onClick () {
    if (this.isGo) {
      const location = '/game'
      this.routerPush(location)
    } else if (this.isClose) {
      this.closeGame()
    } else if (this.isLoad) {
      this.routerPush('/load')
    } else {
      console.log('Unexpected state, shouldn\'t be visible')
    }
  }

  closeGame () {
    this.closeCurrentGame()
    this.routerPush('/')
  }

  get isOnGamePage (): boolean {
    const b = this.routeEquals('Game')
    console.log('isOnGamePage:' + b)
    return b
  }

  get isOnLoadPage (): boolean {
    const b = this.routeEquals('LoadGame')
    console.log('isOnLoadPage:' + b)
    return b
  }

  get isGameLoaded (): boolean {
    return !!this.$store.state.currentGame
  }

  get isGo (): boolean {
    const b: boolean = this.isGameLoaded && !this.isOnGamePage
    console.log('isGo: ' + b)
    return b
  }

  get isClose (): boolean {
    console.log('isGameLoaded: ' + this.isGameLoaded)
    console.log('isOnGamePage: ' + this.isOnGamePage)
    const b: boolean = this.isGameLoaded && this.isOnGamePage
    console.log('isClose: ' + b)
    return b
  }

  get isLoad (): boolean {
    const b = !this.isGameLoaded
    console.log('isLoad: ' + b)
    return b
  }

  get isHidden (): boolean {
    const b = !this.isGameLoaded && this.isOnLoadPage
    console.log('isHidden: ' + b)
    return b
  }
}
</script>
