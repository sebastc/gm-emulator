<template>
  <div>
    <h1>Tags</h1>
    <v-card v-for="(tagsByType, theme) in tagsByTheme" :key="theme" class="ma-1">
      <v-card-title>{{ themeLabel(theme) }}</v-card-title>
      <v-card-text>
        <div v-for="(tags, type) in tagsByType" :key="theme + type">
          <h3>{{ typeLabel(type) }} <small>({{ tags.length }})</small></h3>
          <v-hover v-slot:default="{ hover }" v-for="tag in tags" :key="theme + type + tag.value">
            <v-chip small class="mr-1 mb-1" :close="hover">
              <span v-for="(tagBlock, index) in tag.parsedValue" :key="index">
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
import { TagStorage } from '@/store/tags/types'

function isThemeTag (tag) {
  return !tag.startsWith('__') || tag === '__theme'
}

function isTypeTag (tag) {
  return !isThemeTag(tag)
}

function groupBy (iterable, keyMapper, valueMapper, finalizer) {
  const entries = iterable.map(e => ({ key: keyMapper.apply(e), value: valueMapper.apply(e) }))
  const keys = new Set(entries.map(e => e.key))
  const groups = entries
    .reduce((a, e) => ({
      ...a,
      [e.key]: [...a[e.key] ?? [], e.value]
    }), {})
  keys.forEach(k => { groups[k] = finalizer.apply(groups[k]) })
  return groups
}

export default {
  name: 'Tags',
  computed: {
    ...mapState(['tags', 'tagValues', 'taxonomy']),
    tagStorage () { return new TagStorage() },
    themeTags () {
      return [...this.tagStorage.tagInfoById.values()].filter(t => t.isA.includes('__theme')).map(t => t.tag)
    },

    tagsByTheme () {
      const res = {}
      const allThemes = [...this.tagStorage.tagInfoById.values()]
        .filter(t => t.isA.includes('__theme'))
        .map(t => t.value ?? t.tag)
      // console.log('allThemes', allThemes)
      const allNotThemes = [...this.tagStorage.tagInfoById.values()]
        .filter(t => !t.isA.includes('__theme'))
        .map(t => t.value ?? t.tag);
      // console.log('allNotThemes', allNotThemes);
      [...this.tagStorage.tagInfoById.values()].forEach(t => {
        const thisThemes = [...t.ancestors].filter(a => allThemes.includes(a) || a === '__theme')
        const thisNotThemes = [...t.isA].filter(a => !thisThemes.includes(a))
        // console.log('thisThemes', thisThemes)
        // console.log('thisNotThemes', thisNotThemes)
        thisThemes.forEach(theme => {
          const themeMap = (res[theme] = res[theme] ?? {})
          thisNotThemes.forEach(type => {
            const typeList = (themeMap[type] = themeMap[type] ?? [])
            typeList.splice(typeList.length, 0, t)
          })
        })
      })
      console.log(res)
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
