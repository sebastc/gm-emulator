<template>
  <edit-dialog title="Commentaire" icon="far fa-comment-alt" @reset="onReset" @save="onSave" :disabled="disabled">
    <template>
      <v-text-field label="Commentaire" v-model="comment"
                    hint="Ajouter des informations sur ce qu'il se passe dans la scène" />
    </template>
  </edit-dialog>
</template>

<script>
import EditDialog from '@/components/EditDialog'
import { mapActions } from 'vuex'

export default {
  name: 'AddComment',
  components: { EditDialog },
  props: {
    index: Number,
    disabled: Boolean
  },
  data () {
    return {
      comment: ''
    }
  },
  computed: {
  },
  methods: {
    ...mapActions(['addComment']),
    onSave (isNew) {
      if (isNew) {
        this.addComment(this.comment)
      }
    },
    onReset () {
      this.comment = ''
    }
  }
}
</script>

<style scoped>

</style>
