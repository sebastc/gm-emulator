<template>
  <div>
    <v-card class="mb-2">
      <v-card-title><v-icon>far fa-user-circle</v-icon>Personages</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <ul v-if="activePlayerCharacters.length + activeNonPlayerCharacters.length">
          <li v-for="(character) in activePlayerCharacters" :key="character.id"><b>{{character.name}} (joueur)</b> <edit-character :index="character.id" /></li>
          <li v-for="(character) in activeNonPlayerCharacters" :key="character.id">{{character.name}} <edit-character :index="character.id" /></li>
        </ul>
        <span v-else>Aucun</span>
      </v-card-text>
    </v-card>

    <v-card class="mb-2">
      <v-card-title><v-icon>fas fa-location-arrow</v-icon>Objectifs</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <ul v-if="activeGoals.length">
          <li v-for="(goal) in activeGoals" :key="goal.id">{{goal.label}} <edit-goal :index="goal.index " /></li>
        </ul>
        <span v-else>Aucun</span>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import EditCharacter from '@/components/EditCharacter'
import EditGoal from '@/components/EditGoal'
export default {
  name: 'ListsView',
  components: { EditGoal, EditCharacter },
  computed: {
    ...mapGetters(['activePlayerCharacters', 'activeNonPlayerCharacters', 'activeGoals'])
  }
}
</script>

<style scoped>

</style>
