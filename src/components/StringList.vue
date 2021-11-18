<template>
  <div>
    <v-text-field v-for="(v, i) in value" :key="i" dense autofocus :hint="hint" v-model="value[i]"/>
    <v-btn v-if="!value.length || value[value.length-1]" x-small text class="px-0" color="secondary" @click="value.splice(value.length, 0, '')">
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
  methods: { ...mapActions(['closeCurrentGame']) },
  computed: { ...mapState(['current']) }
})
export default class StringList extends Vue {
  @Prop({ type: String, required: false })
  private hint?: string;

  @Prop({ type: Array as PropType<string[]>, default: () => [] }) private value!: string[];
}
</script>

<style scoped>

</style>
