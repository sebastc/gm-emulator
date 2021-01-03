<template>
  <div>
    <h1>Tags</h1>
    <v-card v-for="k in externalTags" :key="k" class="ma-1">
      <v-card-title>{{k}}</v-card-title>
      <v-card-text>
        <div v-for="(v2, k2) in tagsBySection[k]" :key="k2">
          <h3>{{typeLabel(k2)}}</h3>
          <v-hover v-slot:default="{ hover }" v-for="v3 in v2" :key="v3">
            <v-chip small class="mr-1 mb-1" :close="hover">{{v3}}</v-chip>
          </v-hover>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'

export default {
  name: 'Tags',
  computed: {
    ...mapState(['tags', 'tagValues']),
    allTags () {
      const newVar = [...new Set(this.tagValues.flatMap(e => e.tags))]
      console.log('allTags', newVar)
      return newVar
    },
    internalTags () {
      return [...this.allTags.filter(t => t.startsWith('__'))]
    },
    externalTags () {
      return [...this.allTags.filter(t => !t.startsWith('__'))]
    },
    tagsBySection () {
      const res = {}
      this.tagValues.forEach(t => {
        const iTags = t.tags.filter(t => !t.startsWith('__'))
        if (iTags.length !== 1) {
          console.log('unexpected number of external tags for ', t)
          return
        }
        const iTag = iTags[0]
        const eTags = t.tags.filter(t => t.startsWith('__'))
        const subMap = res[iTag] || {}
        res[iTag] = subMap
        eTags.forEach(et => {
          const list = subMap[et] || []
          subMap[et] = list
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
        __theme: 'Thème'
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
