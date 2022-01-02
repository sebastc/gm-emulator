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
            item-text="label"
            item-value="id"
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
                @click:close="remove(data.item.id)"
              >
                {{ data.item.label }} ({{countValues(data.item.id)}})
              </v-chip>
            </template>
            <template v-slot:item="data">
              <b>{{ data.item.label }} </b>
              <small>
                (entités: {{countValues(data.item.id, '__entity')}},
                lieux: {{countValues(data.item.id, '__place')}},
                objets: {{countValues(data.item.id, '__object')}},
                actions: {{countValues(data.item.id, '__action')}})
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
          <li>
            <a @click="loadGame(item.id)">{{ item.name }} <small>({{item.tags.join(', ')}})</small></a>
            <a @click="deleteGame(item.id)" class="ml-2"><v-icon small color="secondary">far fa-trash-alt</v-icon></a>
          </li>
        </ul>
        <i v-if="!games.length">Aucune partie sauvegardée</i>
      </v-card-text>
    </v-card>
    <v-card class="mt-3" color="#8fff96" v-if="enableDevUtils">
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
      search: '',
      tags: []
    }
  },
  computed: {
    ...mapState(['games', 'tagStorage']),
    availableTags () {
      return this.tagStorage.getOptions('__theme').map(info => ({ id: info.tag ?? info.value, label: info.value ?? info.tag }))
    },
    enableDevUtils () {
      return process.env.VUE_APP_ENABLE_DEV_UTILS === 'true'
    }
  },
  methods: {
    ...mapActions(['listSavedGames', 'deleteGame']),
    remove (item) {
      const index = this.tags.indexOf(item)
      if (index >= 0) this.tags.splice(index, 1)
    },
    countValues (theme, type) {
      if (type) {
        return data.values.filter(x => (x.requires ?? []).includes(theme) && (x.isA ?? []).includes(type)).length
      } else {
        return data.values.filter(x => (x.requires ?? []).includes(theme)).length
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
      const minCount = 0
      const nbEntities = this.countSelected('__entity')
      if (nbEntities < minCount) {
        res.push(`Selectionner plus de tags (pas assez d'entités - ${nbEntities} / ${minCount})`)
      }
      const nbObjects = this.countSelected('__object')
      if (nbObjects < minCount) {
        res.push(`Selectionner plus de tags (pas assez d'objets - ${nbObjects} / ${minCount})`)
      }
      const nbPlaces = this.countSelected('__place')
      if (nbPlaces < minCount) {
        res.push(`Selectionner plus de tags (pas assez de lieux - ${nbPlaces} / ${minCount})`)
      }
      const nbActions = this.countSelected('__action')
      if (nbActions < minCount) {
        res.push(`Selectionner plus de tags (pas assez d'actions - ${nbActions} / ${minCount})`)
      }
      return res
    },
    async submit () {
      if (!this.$refs.newGameForm.validate()) {
        return false
      }
      await this.$store.dispatch('createNewGame', { name: this.name, tags: this.tags })
      await this.$router.push('game')
    },
    async loadGame (id) {
      await this.$store.dispatch('loadSavedGame', id)
      await this.$router.push('game')
    },
    ...mapActions(['createFakeGame'])
  },
  async mounted () {
    await this.listSavedGames()
  }
}
</script>

<style scoped>

</style>
