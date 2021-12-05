<template>
  <div>
    <h1>Tags</h1>
    <v-card v-for="theme in themeTags" :key="theme" class="ma-1">
      <v-card-title>{{ themeLabel(theme) }}</v-card-title>
      <v-card-text>
        <div v-for="(tags, type) in tagsByTheme[theme]" :key="theme + type">
          <h3>{{ typeLabel(type) }} <small>({{ tags.length }})</small></h3>
          <v-hover v-slot:default="{ hover }" v-for="tag in tags" :key="theme + type + tag.value">
            <v-chip small class="mr-1 mb-1" :close="hover">
              <template v-if="!tag.isFormula">{{ tag.value }}</template>
              <span v-for="(tagBlock, index) in tag.blocks" :key="index">
                <u class="secondary--text" v-if="tagBlock.type === 'reference'">&lt;{{ tagBlock.required.map(t => typeLabel(t)).join(',') }}&gt;</u>
                <span v-else class="white-space: pre;">&ZeroWidthSpace;{{ tagBlock.value }}&ZeroWidthSpace;</span>
              </span>
            </v-chip>
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
    ...mapState(['tags', 'tagValues', 'taxonomy']),
    themeTags () {
      return [...new Set(['__theme', ...this.taxonomy.filter(t => t.isTheme).map(t => t.tag)])]
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

          const tagBlocks = this.splitTag(t.value)
          if (tagBlocks.length > 0) {
            const isFormula = tagBlocks.length > 1 || tagBlocks[0].type === 'reference'
            list.push({
              isFormula: isFormula,
              value: t.value,
              blocks: isFormula ? tagBlocks : undefined
            })
          }
        })
      })
      return res
    },
    displayMap () {
      return this.taxonomy.reduce((a, t) => ({ ...a, [t.tag]: t.value || t.tag }), { __theme: 'Défaut', __name__: 'Nom Aléatoire' })
    }
  },
  methods: {
    ...mapActions(['loadTags']),
    typeLabel (type) {
      return this.displayMap[type] || type
    },
    themeLabel (theme) {
      return this.displayMap[theme] || theme
    },

    // FIXME factorize duplicate
    splitTag (tag) {
      let res = []
      const re = /#{([^}]*)}/g
      let index = 0
      let array
      while ((array = re.exec(tag)) !== null) {
        if (index !== array.index) {
          res = [...res, { type: 'literal', value: tag.slice(index, array.index) }]
        }
        res = [...res, { type: 'reference', required: array[1].split(',') }]
        index = re.lastIndex
      }
      if (index !== tag.length) {
        res = [...res, { type: 'literal', value: tag.slice(index, tag.length) }]
      }
      return res
    }
  },
  mounted () {
    this.loadTags()
  }
}
</script>

<style scoped>

</style>
