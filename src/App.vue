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
          <span v-if="current" class="subtitle-1"><span class="hidden-sm-and-down"> — </span>{{ current.game.name }}</span>
        </v-toolbar-title>

      <v-spacer></v-spacer>

      <v-toolbar-items>
        <v-btn icon to='/lists' v-if="current && current.game && $route.name !== 'Lists'" :disabled="!current.characters.length && !current.goals.length">
          <v-icon>far fa-list-alt</v-icon>
        </v-btn>
        <v-btn icon to='/tags' v-if="$route.name !== 'Tags'"><v-icon>fas fa-tags</v-icon></v-btn>
        <game-btn />
      </v-toolbar-items>
      <span id="remotestorage-widget"></span>
    </v-app-bar>

    <v-main>
      <v-container>
        <router-view></router-view>
      </v-container>
    </v-main>
    <v-footer app>{{ footerText }}</v-footer>
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
    ...mapState(['current']),
    ...mapGetters(['activePlayerCharacters', 'activeNonPlayerCharacters']),
    footerText () {
      return `Git Hash: '${process?.env?.VUE_APP_GIT_HASH ?? 'N/A'}'`
    }
  },
  methods: {
    ...mapActions(['showRemoteStorageWidget'])
  },
  watch: {
    $route: {
      handler (to, from) {
        let title = to.meta.title || 'GM Emulator'
        if (this?.current?.game) {
          title += ' | ' + this.current.game.name
        }
        document.title = title
      },
      immediate: true
    }
  },
  mounted () {
    this.showRemoteStorageWidget()
  }
})
</script>
