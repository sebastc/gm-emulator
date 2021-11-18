<template>
  <div>
    <v-card class="mb-2">
      <v-card-title><v-icon>far fa-user-circle</v-icon>Personages</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <ul v-if="activePlayerCharacters.length + activeNonPlayerCharacters.length">
          <li v-for="(character) in activePlayerCharacters" :key="character.id"><b>{{character.name}} (joueur)</b> <v-chip v-for="aspect in character.aspects" :key="aspect" class="mr-1" x-small pill>{{ aspect }}</v-chip> <edit-character :id="character.id" /></li>
          <li v-for="(character) in activeNonPlayerCharacters" :key="character.id">{{character.name}} <v-chip v-for="aspect in character.aspects" :key="aspect" class="mr-1" x-small pill>{{ aspect }}</v-chip> <edit-character :id="character.id" /></li>
        </ul>
        <span v-else>Aucun</span>
      </v-card-text>
    </v-card>

    <v-card class="mb-2">
      <v-card-title><v-icon>fas fa-location-arrow</v-icon>Objectifs</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <ul v-if="activeGoals.length">
          <li v-for="(goal) in activeGoals" :key="goal.id">{{goal.label}} <edit-goal :id="goal.id " /></li>
        </ul>
        <span v-else>Aucun</span>
      </v-card-text>
    </v-card>

    <v-card class="mb-2">
      <v-card-title><v-icon>fas fa-place-of-worship</v-icon>Lieux</v-card-title>
      <v-divider></v-divider>
      <v-card-text>
        <ul v-if="activePlaces.length">
          <li v-for="(place) in activePlaces" :key="place.id">
            {{ place.name }}
            <edit-place :id="place.id " />
          </li>
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
import EditPlace from '@/components/EditPlace'
export default {
  name: 'ListsView',
  components: { EditGoal, EditCharacter, EditPlace },
  computed: {
    ...mapGetters(['activePlayerCharacters', 'activeNonPlayerCharacters', 'activeGoals', 'activePlaces'])
  }
}
</script>

<style scoped>

</style>
