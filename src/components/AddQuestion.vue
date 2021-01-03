<template>
  <edit-dialog title="Question" icon="far fa-question-circle" @reset="onReset" @save="onSave" :disabled="disabled">
    <template>
      <v-text-field label="Question" v-model="question"
                    hint="Posez une question fermée, concernant l'histoire, ses personnages, son environement, etc."
                    placeholder="Est-ce que ... ? (réponse: Oui/Non)" />
    </template>
  </edit-dialog>
</template>

<script>
import EditDialog from '@/components/EditDialog'
import { mapActions } from 'vuex'

export default {
  name: 'AddQuestion',
  components: { EditDialog },
  props: {
    index: Number,
    disabled: Boolean
  },
  data () {
    return {
      question: ''
    }
  },
  computed: {
  },
  methods: {
    ...mapActions(['randomAnswer']),
    onSave (isNew) {
      if (isNew) {
        this.randomAnswer(this.question)
      }
    },
    onReset () {
      this.question = ''
    }
  }
}
</script>

<style scoped>

</style>
