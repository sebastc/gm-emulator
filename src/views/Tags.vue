<template>
  <div>
    <h1>Tags</h1>
    <v-card v-for="theme in themeTags" :key="theme" class="ma-1">
      <v-card-title>{{ themeLabel(theme) }}</v-card-title>
      <v-card-text>
        <div v-for="(tags, type) in tagsByTheme[theme]" :key="theme + type">
          <h3>{{ typeLabel(type) }} <small>({{ tags.length }})</small></h3>
          <v-hover v-slot:default="{ hover }" v-for="tag in tags" :key="theme + type + tag">
            <v-chip small class="mr-1 mb-1" :close="hover">{{ tag }}</v-chip>
          </v-hover>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { mapActions, mapState } from 'vuex'

function isThemeTag (tag) {
  return !tag.startsWith('__') || tag === '__theme'
}

function isTypeTag (tag) {
  return !isThemeTag(tag)
}

export default {
  name: 'Tags',
  computed: {
    ...mapState(['tags', 'tagValues']),
    allTags () {
      return [...new Set(this.tagValues.flatMap(e => e.tags))]
    },
    themeTags () {
      return [...this.allTags.filter(t => isThemeTag(t))]
    },
    typeTags () {
      return [...this.allTags.filter(t => isTypeTag(t))]
    },
    tagsByTheme () {
      const res = {}
      this.tagValues.forEach(t => {
        const themeTags = t.tags.filter(t => isThemeTag(t))
        if (themeTags.length !== 1) {
          console.log('unexpected number of external tags for ', t)
          return
        }
        const themeTag = themeTags[0]
        const typeTags = t.tags.filter(t => isTypeTag(t))
        const subMap = res[themeTag] || {}
        res[themeTag] = subMap
        typeTags.forEach(typeTag => {
          const list = subMap[typeTag] || []
          subMap[typeTag] = list
          list.push(t.value)
        })
      })
      return res
    }
  },
  methods: {
    ...mapActions(['loadTags']),
    typeLabel (type) {
      const mapping = {
        __entity: 'Entité',
        __place: 'Lieu',
        __object: 'Objet',
        __action: 'Action',
        __ambiance: 'Ambiance',
        __event: 'Evénement',
        __person: 'Personne',
        __relation: 'Relation',
        __faction: 'Faction',
        __theme: 'Thème',
        __race: 'Race',
        __class: 'Classe',
        __weapon: 'Armes & Armures',
        __vehicle: 'Véhicule',
        // eslint-disable-next-line @typescript-eslint/camelcase
        __entity_traits: 'Trait d\'Entité',
        // eslint-disable-next-line @typescript-eslint/camelcase
        __place_traits: 'Trait de Lieu',
        // eslint-disable-next-line @typescript-eslint/camelcase
        __relation_traits: 'Trait de Relation',
        // eslint-disable-next-line @typescript-eslint/camelcase
        __object_traits: 'Trait d\'Objet',
        // eslint-disable-next-line @typescript-eslint/camelcase
        __object_relation: 'Relation à un Objet',
        // eslint-disable-next-line @typescript-eslint/camelcase
        __entity_relation: 'Relation à une entité',
        // eslint-disable-next-line @typescript-eslint/camelcase
        __action_object: 'Objet d\'action'
      }
      return mapping[type] || type
    },
    themeLabel (type) {
      const mapping = {
        __theme: 'Défaut'
      }
      return mapping[type] || type
    }
  },
  mounted () {
    this.loadTags()
  }
}
</script>

<style scoped>

</style>
