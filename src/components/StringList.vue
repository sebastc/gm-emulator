<template>
  <div>
    <v-text-field v-for="(v, i) in value" :key="i" dense autofocus :hint="hint" v-model="value[i]" append-icon="fas fa-dice" @click:append="randomValue(i)"/>
    <v-btn v-if="!value.length || value[value.length-1]" x-small text class="px-0" color="secondary" @click="addEntry">
      <v-icon small>fas fa-plus-circle</v-icon>
    </v-btn>
  </div>
</template>

<script lang="ts">
import { mapActions, mapState } from 'vuex'
import Vue, { PropType } from 'vue'
import Component from 'vue-class-component'
import { VBtn, VIcon, VTextField, VList, VListItem, VListItemTitle } from 'vuetify/lib'
import { Prop } from 'vue-property-decorator'

@Component({
  components: { VBtn, VIcon, VTextField, VList, VListItem, VListItemTitle },
  methods: { ...mapActions(['getRandom']) },
  computed: { ...mapState(['current']) }
})
export default class StringList extends Vue {
  getRandom!: (params: { query: string; tags?: string[]}) => Promise<string>;

  @Prop({ type: String, required: false })
  private hint?: string;

  @Prop({ type: String, required: false })
  private randomTag?: string;

  @Prop({ type: Array as PropType<string[]>, default: () => [] })
  private value!: string[];

  async addEntry () {
    let res: string
    if (this.randomTag) {
      const params = { query: this.randomTag }
      console.log('randomValue: ', params)
      res = await this.getRandom(params)
    } else {
      res = ''
    }
    this.value.splice(this.value.length, 0, res)
  }

  async randomValue (index: number) {
    let res: string
    if (this.randomTag) {
      const params = { query: this.randomTag }
      console.log('randomValue: ', params)
      res = await this.getRandom(params)
    } else {
      res = ''
    }
    this.value.splice(index, 1, res)
  }
}
</script>

<style scoped>

</style>
