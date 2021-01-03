<template>
  <v-app>
    <v-app-bar
      :clipped-left="$vuetify.breakpoint.lgAndUp"
      app
      color="primary"
      dark
    >
        <v-icon>fas fa-feather-alt</v-icon>
        <v-toolbar-title
          style="width: 300px"
          class="ml-0 pl-4"
        >
          <span class="hidden-sm-and-down title">GM Emulator</span>
          <span v-if="currentGame" class="subtitle-1"><span class="hidden-sm-and-down"> — </span>{{ currentGame.name }}</span>
        </v-toolbar-title>

      <v-spacer></v-spacer>

      <v-toolbar-items>
        <v-btn icon to='/lists' v-if="currentGame && $route.name !== 'Lists'" :disabled="!currentGame.characters.length && !currentGame.goals.length">
          <v-icon>far fa-list-alt</v-icon>
        </v-btn>
        <v-btn icon to='/tags' v-if="$route.name !== 'Tags'"><v-icon>fas fa-tags</v-icon></v-btn>
        <game-btn />
      </v-toolbar-items>
    </v-app-bar>

    <v-content>
      <v-container>
        <router-view></router-view>
      </v-container>
    </v-content>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapActions, mapGetters, mapState } from 'vuex'
import GameBtn from '@/components/GameBtn.vue'

export default Vue.extend({
  name: 'App',

  components: {
    GameBtn
  },

  data: () => ({
    //
  }),
  computed: {
    ...mapState(['currentGame']),
    ...mapGetters(['activePlayerCharacters', 'activeNonPlayerCharacters'])
  },
  watch: {
    $route: {
      handler (to, from) {
        let title = to.meta.title || 'GM Emulator'
        if (this && this.currentGame) {
          title += ' | ' + this.currentGame.name
        }
        document.title = title
      },
      immediate: true
    }
  }
})
</script>
