<template>
    <v-dialog
      v-model="dialog"
      scrollable
      max-width="500"
    >

      <template v-slot:activator="{ on: dialog }">
        <v-tooltip top>
          <template v-slot:activator="{ on: tooltip }">
            <v-btn v-on="{ ...tooltip, ...dialog }" v-if="isModification" :disabled="disabled" x-small text class="px-0">
              <v-icon small color="secondary">fas fa-pencil-alt</v-icon>
            </v-btn>
            <v-btn v-on="{ ...tooltip, ...dialog }" v-else :disabled="disabled" color="primary" fab small class="mr-2">
            <v-icon small>{{ icon }}</v-icon>
            </v-btn>
          </template>
        <span>{{ title }}</span>
        </v-tooltip>
      </template>

      <v-card>
        <v-card-title primary-title><v-icon class="mr-2">{{ icon }}</v-icon>{{ title }}</v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <slot></slot>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="saveDialog()">{{saveActionLabel}}</v-btn>
          <v-btn text @click="closeDialog()">Annuler</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
</template>

<script>
import { mapActions, mapState } from 'vuex'
export default {
  name: 'EditDialog',
  props: {
    icon: {
      type: String,
      default: ''
    },
    disabled: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    },
    index: String
  },
  data () {
    return {
      dialog: false
    }
  },
  computed: {
    isModification () {
      return !!this.$props.index
    },
    isNew () {
      return !this.isModification
    },
    saveActionLabel () {
      return this.isModification ? 'Enregistrer' : 'Créer'
    }
  },
  methods: {
    ...mapActions(['updateScene']),
    closeDialog () {
      this.dialog = false
      this.resetValues()
    },
    saveDialog () {
      this.$emit('save', this.isNew)
      this.dialog = false
    },
    resetValues () {
      this.$emit('reset', this.isModification)
    }
  },
  watch: {
    dialog (value) {
      if (value) {
        this.resetValues()
      }
    }
  },
  mounted () {
    this.resetValues()
  }
}
</script>

<style scoped>

</style>
