<template>
  <div>
    <h1>Tags <span class="text--secondary font-weight-light" v-if="currentTags">({{ currentTags }})</span></h1>
    <v-card v-for="(tagsByType, theme) in tagsByTheme" :key="theme" class="ma-1">
      <v-card-title>{{ labelOf(theme) }}</v-card-title>
      <v-card-text>
        <div v-for="(tags, type) in tagsByType" :key="theme + type">
          <h3>{{ labelOf(type) }} <small>({{ tags.length }})</small></h3>
          <v-hover v-slot:default="{ hover }" v-for="tag in tags" :key="theme + type + tag.value">
            <v-chip small class="mr-1 mb-1" :close="hover">
              <span v-for="(tagBlock, index) in tag.parsedValue" :key="index">
                <u class="secondary--text" v-if="tagBlock.type === 'reference'">&lt;{{ tagBlock.required.map(t => labelOf(t)).join(',') }}&gt;</u>
                <span v-else class="white-space: pre;">&ZeroWidthSpace;{{ tagBlock.value }}&ZeroWidthSpace;</span>
              </span>
            </v-chip>
          </v-hover>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script lang="ts">
import { mapState } from 'vuex'
import Component from 'vue-class-component'
import Vue from 'vue'
import { VCard, VCardText, VCardTitle, VChip, VHover } from 'vuetify/lib/components'
import { TagInfo, TagStorage } from '@/store/tags/types'

function nonEmptyOrDefault<T> (list: T[], defaultIfEmpty: T[]): T[] {
  return list.length > 0 ? list : defaultIfEmpty
}
@Component({
  components: { VCard, VCardTitle, VCardText, VHover, VChip },
  computed: { ...mapState(['tagStorage', 'current']) }
})
export default class Tags extends Vue {
  tagStorage!: TagStorage;
  current?: { game?: { tags?: string[] } }
  get currentTags () {
    return (this.current?.game?.tags ?? []).join(', ') || 'Tous les thèmes'
  }

  get tagsByTheme () {
    const res: Record<string, Record<string, TagInfo[]>> = {}
    const allThemes = this.tagStorage.getThemes();
    [...this.tagStorage.getAllNonThemeTags()].map(t => this.tagStorage.get(t))
      .forEach(t => {
        if (!t) return
        const thisThemes = nonEmptyOrDefault([...t.requires].filter(a => allThemes.includes(a)), ['__theme'])
        const thisNotThemes = [...t.isA].filter(a => !thisThemes.includes(a) && a !== '__theme')
        thisThemes.forEach(theme => {
          const themeMap = (res[theme] = res[theme] ?? {})
          thisNotThemes.forEach(type => {
            const typeList = (themeMap[type] = themeMap[type] ?? [])
            typeList.splice(typeList.length, 0, t)
          })
        })
      })
    return res
  }

  get displayMap (): Record<string, string> {
    return {
      __theme: 'Défaut',
      __name__: 'Nom Aléatoire'
    }
  }

  labelOf (type: string): string {
    return this.displayMap[type] ?? this.tagStorage.get(type)?.value ?? type
  }
}
</script>

<style scoped>

</style>
