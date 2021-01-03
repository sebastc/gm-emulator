<template>
  <div class="home">
    <game v-if="currentGame"></game>
    <load-game v-else ></load-game>
  </div>
</template>

<script>
// @ is an alias to /src
import { mapActions, mapState } from 'vuex'
import LoadGame from '@/views/LoadGame'
import Game from '@/views/Game'

export default {
  name: 'Home',
  components: {
    Game,
    LoadGame
  },
  computed: {
    ...mapState(['currentGame'])
  },
  methods: {
    ...mapActions(['closeCurrentGame'])
  }
}
</script>
