<template>
  <div>
    <v-card>
      <v-card-title>Nouvelle Partie</v-card-title>
      <v-card-text>
        <v-form ref="newGameForm" @submit.prevent="submit">
          <v-text-field label="Nom" v-model="name" :rules="nameRules()"></v-text-field>
          <v-autocomplete
            v-model="tags"
            :items="availableTags"
            :search-input.sync="search"
            :rules="tagsRules()"
            @input="search = ''"
            data-DISABLED-menu-props="closeOnClick"
            dense
            label="Tags"
            multiple
            hide-selected
            hint="Sélectionner des tags pour la partie"
            outlined>
            <template v-slot:selection="data">
              <v-chip
                v-bind="data.attrs"
                :input-value="data.selected"
                close
                small
                @click:close="remove(data.item)"
              >
                {{ data.item }} ({{countValues(data.item)}})
              </v-chip>
            </template>
            <template v-slot:item="data">
              <b>{{ data.item }} </b>
              <small>
                (entités: {{countValues(data.item, '__entity')}},
                lieux: {{countValues(data.item, '__place')}},
                objets: {{countValues(data.item, '__object')}},
                actions: {{countValues(data.item, '__action')}})
              </small>
            </template>
          </v-autocomplete>
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-btn type="submit" form="newGameForm" @click="submit()">OK</v-btn>
      </v-card-actions>
    </v-card>
    <v-card class="mt-3">
      <v-card-title>Charger une partie</v-card-title>
      <v-card-text>
        <ul v-for="item in games" :key="item.id">
          <li><a @click="loadGame(item.id)">{{ item.name }} <small>({{item.tags.join(', ')}})</small></a> </li>
        </ul>
        <i v-if="!games.length">Aucune partie sauvegardée</i>
      </v-card-text>
    </v-card>
    <v-card class="mt-3" color="#8fff96">
      <v-card-title>Outils de dev</v-card-title>
      <v-card-text>
        <v-btn x-small @click="createFakeGame()" >Injecter des fausses données</v-btn>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>

import data from '@/assets/data.json'
import { mapActions, mapState } from 'vuex'

export default {
  name: 'LoadGame',
  data () {
    return {
      name: 'Sans Nom',
      availableTags: [],
      search: '',
      tags: []
    }
  },
  computed: {
    ...mapState(['games'])
  },
  methods: {
    remove (item) {
      const index = this.tags.indexOf(item)
      if (index >= 0) this.tags.splice(index, 1)
    },
    countValues (tag, type) {
      if (type) {
        return data.values.filter(x => x.tags.includes(tag) && x.tags.includes(type)).length
      } else {
        return data.values.filter(x => x.tags.includes(tag)).length
      }
    },
    countSelected (type) {
      return this.tags.map(t => this.countValues(t, type)).reduce((a, b) => a + b, 0)
    },
    nameRules () {
      const res = []
      if (this.name.trim().length === 0) {
        res.push('Choisir un nom')
      }
      return res
    },
    tagsRules () {
      const res = []
      if (this.tags.length === 0) {
        res.push('Choisir au moins un tag')
      }
      if (this.countSelected('__entity') < 20) {
        res.push("Selectionner plus de tags (pas assez d'entités)")
      }
      if (this.countSelected('__object') < 20) {
        res.push("Selectionner plus de tags (pas assez d'objets)")
      }
      if (this.countSelected('__place') < 20) {
        res.push('Selectionner plus de tags (pas assez de lieux)')
      }
      if (this.countSelected('__action') < 20) {
        res.push("Selectionner plus de tags (pas assez d'actions)")
      }
      return res
    },
    submit () {
      if (!this.$refs.newGameForm.validate()) {
        return false
      }
      this.$store.dispatch('createNewGame', { name: this.name, tags: this.tags })
      this.$router.push('game')
    },
    loadGame (id) {
      this.$store.dispatch('loadSavedGame', id)
      this.$router.push('game')
    },
    ...mapActions(['createFakeGame'])
  },
  mounted () {
    this.availableTags = data.tags.concat().sort()
  }
}
</script>

<style scoped>

</style>
