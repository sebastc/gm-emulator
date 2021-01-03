import Vue from 'vue'
import Vuex from 'vuex'

import data from '@/assets/data.json'
import { randomName } from '@/utils/names.ts'
import { randomize } from '@/utils/random.ts'
import { Character, Game, GameRef, Goal, RootState, Scene, SceneLog } from './types'

Vue.use(Vuex)

let inMemoryIdSeq = 1
const inMemoryGames: Game[] = []

type SceneUpdate = { index: number; name: string; context: string; summary: string }
type CharacterUpdate = { index: number; name: string; isPlayer: boolean }
type GoalUpdate = { index: number; label: string; isActive: boolean }
type QuestionUpdate = { index: number; question: string }
type SceneLogUpdate = {
  index: number; sceneIndex: number; icon: string | undefined; avatar: string | undefined;
  mechanical: string | undefined; interpretation: string | undefined; inspirations: string[];
}

export default new Vuex.Store({
  state: new RootState(),
  getters: {
    activePlayerCharacters (state: RootState): Character[] {
      return state.currentGame ? state.currentGame.characters.filter(c => c.isActive && c.isPlayer) : []
    },
    activeNonPlayerCharacters (state: RootState): Character[] {
      return state.currentGame ? state.currentGame.characters.filter(c => c.isActive && !c.isPlayer) : []
    },
    activeGoals (state: RootState): Goal[] {
      return state.currentGame ? state.currentGame.goals.filter(c => c.isActive) : []
    },
    activeTagsByType (state: RootState): Map<string, string[]> {
      if (!state.currentGame) {
        return new Map<string, string[]>()
      }
      function traverseToAncestors (tag: string, mapToAncestors: Map<string, Set<string>>): Set<string> {
        const existingAncestors = mapToAncestors.get(tag)
        if (existingAncestors) {
          return existingAncestors
        }
        const ancestors = new Set<string>()
        mapToAncestors.set(tag, ancestors)
        data.taxonomy
          .filter(entry => entry.tag === tag)
          .map(entry => entry.extends)
          .flatMap(entry => [entry, ...traverseToAncestors(entry, mapToAncestors)])
          .forEach(tags => ancestors.add(tags))
        console.log(tag + ' => ', ancestors)
        return ancestors
      }
      const allTags = [...new Set<string>(data.values.flatMap(tagValue => tagValue.tags))]
      const parentTags = [...new Set<string>(data.taxonomy.map(taxon => taxon.extends))]
      const childrenTags = [...new Set<string>(data.taxonomy.map(taxon => taxon.tag))]
      const leafTags = childrenTags.filter(t => !parentTags.includes(t))
      console.log('leafTags', leafTags)
      const rootTags = parentTags.filter(t => !childrenTags.includes(t))
      console.log('rootTags', rootTags)
      const ancestorTags: Map<string, Set<string>> = new Map<string, Set<string>>()
      allTags.forEach(tag => traverseToAncestors(tag, ancestorTags))
      console.log('ancestorTags', ancestorTags)
      const actualTags = [...new Set<string>(
        [
          ...state.currentGame.tags,
          ...state.currentGame.tags.flatMap(t => [...ancestorTags.get(t) || []])
        ]
      )]
      console.log('actualTags', [...actualTags])

      const actualTagsValues = state.tagValues.filter(tagValue => tagValue.tags.some(tag => actualTags.includes(tag)))
      const internalTags = ['__action', '__action_object', '__place']
      const res = new Map<string, string[]>()
      internalTags.forEach(iTag => {
        res.set(iTag, [...new Set(actualTagsValues
          .filter(tagValue => tagValue.tags.some(t => t === iTag || (ancestorTags.get(t) || new Set<string>()).has(iTag)))
          .map(tv => tv.value))])
      })
      console.log('res: ', res)
      return res
    }
  },
  mutations: {
    newGame (state: RootState, payload: {name: string; tags: string[]}) {
      state.currentGame = new Game()
      state.currentGame.id = 'game-' + (++inMemoryIdSeq)
      state.currentGame.name = payload.name
      state.currentGame.tags = payload.tags
      inMemoryGames.push(state.currentGame)
      const gameRef = new GameRef()
      gameRef.id = state.currentGame.id
      gameRef.name = state.currentGame.name
      gameRef.tags = state.currentGame.tags
      state.games.push(gameRef)
      return state
    },
    loadGame (state: RootState, id: string) {
      const game = inMemoryGames.find(g => g.id === id)
      if (game) {
        state.currentGame = game
      } else {
        throw new Error('Unable to load game with id: ' + id)
      }

      return state
    },
    closeGame (state: RootState) {
      state.currentGame = null
    },
    updateScene (state: RootState, update: SceneUpdate) {
      if (!state.currentGame) {
        throw Error('No loaded game')
      }
      let index = update.index
      if (!(index >= 0)) {
        index = state.currentGame.scenes.length
        state.currentGame.scenes.push(new Scene(index))
      } else if (index >= state.currentGame.scenes.length) {
        throw Error('No scene at index: ' + index)
      }
      const scene = state.currentGame.scenes[index]
      if (update.name !== undefined) {
        scene.name = update.name
      }
      if (update.context !== undefined) {
        scene.context = update.context
      }
      if (update.summary !== undefined) {
        scene.summary = update.summary
      }
    },
    updateCharacter (state: RootState, update: CharacterUpdate) {
      if (!state.currentGame) {
        throw Error('No loaded game')
      }
      let index = update.index
      if (!(index >= 0)) {
        index = state.currentGame.characters.length
        state.currentGame.characters.push(new Character(index))
      } else if (index >= state.currentGame.characters.length) {
        throw Error('No character at index: ' + index)
      }
      const character = state.currentGame.characters[index]
      if (update.name !== undefined) {
        character.name = update.name
      }
      if (!character.name) {
        character.name = randomName()
      }
      if (update.isPlayer !== undefined) {
        character.isPlayer = update.isPlayer
      }
    },
    updateSceneLog (state: RootState, update: SceneLogUpdate) {
      if (!state.currentGame) {
        throw Error('No loaded game')
      }
      let index = update.index
      if (!(index >= 0)) {
        index = state.currentGame.logs.length
        const sceneIndex = state.currentGame.scenes.length - 1
        const newItem = new SceneLog(sceneIndex, index)
        state.currentGame.logs.push(newItem)
        let sceneLogs = state.currentGame.sceneLogs[sceneIndex]
        if (!sceneLogs) {
          sceneLogs = []
          Vue.set(state.currentGame.sceneLogs, sceneIndex, sceneLogs)
        }
        sceneLogs.push(newItem)
      } else if (index >= state.currentGame.logs.length) {
        throw Error('No scene log at index: ' + index)
      }
      const item = state.currentGame.logs[index]
      if (update.icon !== undefined) {
        item.icon = update.icon
      }
      if (update.avatar !== undefined) {
        item.avatar = update.avatar
      }
      if (update.mechanical !== undefined) {
        item.mechanical = update.mechanical
      }
      if (update.interpretation !== undefined) {
        item.interpretation = update.interpretation
      }
      if (update.inspirations !== undefined) {
        item.inspirations = update.inspirations
      }
    },
    updateGoal (state: RootState, update: GoalUpdate) {
      if (!state.currentGame) {
        throw Error('No loaded game')
      }
      let index = update.index
      if (!(index >= 0)) {
        index = state.currentGame.goals.length
        state.currentGame.goals.push(new Goal(index))
      } else if (index >= state.currentGame.goals.length) {
        throw Error('No character at index: ' + index)
      }
      const item = state.currentGame.goals[index]
      if (update.label !== undefined) {
        item.label = update.label
      }
      if (update.isActive !== undefined) {
        item.isActive = update.isActive
      }
    },
    updateQuestion (state: RootState, update: QuestionUpdate) {
      if (!state.currentGame) {
        throw Error('No loaded game')
      }
      let index = update.index
      if (!(index >= 0)) {
        index = state.currentGame.sceneLogs.length
        state.currentGame.goals.push(new Goal(index))
      } else if (index >= state.currentGame.goals.length) {
        throw Error('No character at index: ' + index)
      }
      const item = state.currentGame.goals[index]
      if (update.label !== undefined) {
        item.label = update.label
      }
      if (update.isActive !== undefined) {
        item.isActive = update.isActive
      }
    },
    loadTags (state: RootState) {
      state.tags = [...data.tags]
      state.tagValues = [...data.values]
    }
  },
  actions: {
    async createFakeGame ({ dispatch }) {
      await dispatch('createNewGame', { name: 'Arrrhh !!', tags: ['Pirates'] })
      await dispatch('updateScene', {
        index: -1,
        name: 'A la taverne du "Poney Fringant"',
        context: 'Bonne ambiance au "Poney Fringant", l\'alcool coule à flot, quand soudain... Un matelot ouvre la porte en grand fracas: "Les bernards-l\'hermite attaquent !"'
      })
      await dispatch('updateScene', {
        index: 0,
        summary: 'Grosse chouffe, une attaque de crustacés, les personnages sauvent une fillette'
      })
      for (let i = 0; i < 5; i++) {
        await dispatch('randomEvent')
      }
      await dispatch('updateScene', {
        index: -1
      })
      for (let i = 0; i < 5; i++) {
        await dispatch('randomEvent')
      }
      await dispatch('closeCurrentGame')
      // Matt le fermier
      await dispatch('createNewGame', { name: 'Matt le fermier et les îles flottantes', tags: ['Dragons', 'Moyen-Age', 'Fantasy', 'Pirates'] })
      await dispatch('updateScene', {
        index: -1,
        name: 'L\'Effondrement',
        context: 'Matt est en train de travailler dans son champ quan soudain le sol se met à trembler !'
      })

      dispatch('updateGoal', { isActive: true, label: 'Survivre' })
      dispatch('updateCharacter', { isActive: true, isPlayer: true, name: 'Matt le fermier' })

      dispatch('updateSceneLog', { icon: 'fas fa-bolt', mechanical: 'Matt va voir rassurer les chevaux qui paniquent' })
      dispatch('updateSceneLog', { icon: 'fas fa-bolt', mechanical: 'La borduere de l\'enclot tombe dans le vide suite à une secousse plus forte que les autres' })
    },
    createNewGame ({ commit /*, state */ }, payload: {name: string; tags: string[]}) {
      commit('loadTags')
      commit('newGame', payload)
    },
    loadSavedGame ({ commit }, id) {
      commit('loadTags')
      commit('loadGame', id)
    },
    closeCurrentGame ({ commit }) {
      commit('closeGame')
    },
    updateScene ({ commit }, payload: SceneUpdate) {
      commit('updateScene', payload)
    },
    updateCharacter ({ commit }, payload: CharacterUpdate) {
      commit('updateCharacter', payload)
    },
    updateSceneLog ({ commit }, payload: SceneLogUpdate) {
      commit('updateSceneLog', payload)
    },
    updateGoal ({ commit }, payload: GoalUpdate) {
      commit('updateGoal', payload)
    },
    updateQuestion ({ commit }, payload: GoalUpdate) {
      commit('updateQuestion', payload)
    },
    randomAnswer ({ dispatch }, payload: string) {
      let answer = ''
      const number = Math.random()
      if (number < 0.1) {
        answer = 'oui, et en plus...'
      } else if (number < 0.4) {
        answer = 'oui'
      } else if (number < 0.5) {
        answer = 'oui, mais...'
      } else if (number < 0.6) {
        answer = 'non, mais...'
      } else if (number < 0.9) {
        answer = 'non'
      } else {
        answer = 'non, et en plus...'
      }
      dispatch('updateSceneLog', { icon: 'far fa-question-circle', mechanical: payload + ' ' + answer })
      if (Math.random() < 0.1) {
        dispatch('randomEvent')
      }
    },
    async randomEvent ({ dispatch, getters }) {
      let mechanical = ''
      while (true) {
        const d100 = Math.floor(Math.random() * 100) + 1
        if (d100 <= 7) {
          mechanical = 'Evénement lointain'
        } else if (d100 <= 28) {
          if (getters.activeNonPlayerCharacters.length === 0) {
            continue
          }
          const item: Character = randomize(getters.activeNonPlayerCharacters)
          mechanical = 'Action du PNJ "' + item.name + '"'
        } else if (d100 <= 35) {
          await dispatch('updateCharacter', { name: randomName(), isPlayer: false })
          const lastOne = getters.activeNonPlayerCharacters.length - 1
          const item: Character = getters.activeNonPlayerCharacters[lastOne]
          mechanical = 'Nouveau PNJ "' + item.name + '"'
        } else if (d100 <= 45) {
          if (getters.activeNonPlayerCharacters.length === 0) {
            continue
          }
          if (getters.activeGoals.length === 0) {
            continue
          }
          const item: Goal = randomize(getters.activeGoals)
          mechanical = 'Rapprochement d\'objectif: "' + item.label + '"'
        } else if (d100 <= 52) {
          if (getters.activeGoals.length === 0) {
            continue
          }
          const item: Goal = randomize(getters.activeGoals)
          mechanical = 'Eloignement d\'objectif: "' + item.label + '"'
        } else if (d100 <= 55) {
          if (getters.activeGoals.length === 0) {
            continue
          }
          const item: Goal = randomize(getters.activeGoals)
          mechanical = 'Objectif terminé: "' + item.label + '"'
        } else if (d100 <= 67) {
          if (getters.activePlayerCharacters.length === 0) {
            continue
          }
          const item: Character = randomize(getters.activePlayerCharacters)
          mechanical = 'Événement négatif pour le PJ "' + item.name + '"'
        } else if (d100 <= 75) {
          if (getters.activePlayerCharacters.length === 0) {
            continue
          }
          const item: Character = randomize(getters.activePlayerCharacters)
          mechanical = 'Événement positif pour le PJ "' + item.name + '"'
        } else if (d100 <= 83) {
          mechanical = 'Événement ambigu'
        } else if (d100 <= 92) {
          if (getters.activeNonPlayerCharacters.length === 0) {
            continue
          }
          const item: Character = randomize(getters.activeNonPlayerCharacters)
          mechanical = 'Événement négatif pour le PNJ "' + item.name + '"'
        } else {
          if (getters.activeNonPlayerCharacters.length === 0) {
            continue
          }
          const item: Character = randomize(getters.activeNonPlayerCharacters)
          mechanical = 'Événement positif pour un PNJ "' + item.name + '"'
        }
        break
      }
      const inspirations = [
        randomize(getters.activeTagsByType.get('__action')),
        randomize(getters.activeTagsByType.get('__action_object'))
      ]
      dispatch('updateSceneLog', { icon: 'fas fa-bolt', mechanical, inspirations })
    },
    addComment ({ dispatch }, comment: string) {
      dispatch('updateSceneLog', { icon: 'far fa-comments', interpretation: comment })
    },
    addGoal ({ dispatch }, goal: string) {
      dispatch('updateGoal', { label: goal, isActive: true })
    },
    addQuestion ({ dispatch }, question: string) {
      dispatch('updateSceneLog', { icon: 'far fa-question-circle', mechanical: question })
    },
    loadTags ({ commit }) {
      commit('loadTags')
    }
  },
  modules: {
  }
})
