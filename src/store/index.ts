import Vue from 'vue'
import Vuex from 'vuex'

import data from '@/assets/data.json'
import { randomName } from '@/utils/names.ts'
import { randomize } from '@/utils/random.ts'
import {
  RSGame,
  RSCharacter,
  Repository,
  Aspect,
  Character,
  Game,
  Goal,
  Place,
  RootState,
  Scene,
  SceneLog,
  Entity
} from './types'

import RemoteStorage from 'remotestoragejs'
import Widget from 'remotestorage-widget'
import BaseClient from 'remotestoragejs/release/types/baseclient'

Vue.use(Vuex)

/*
/games/<uuid>/content                { created, modified, name, accessed }
/games/<uuid>/tags/<uuid>         { created, modified, name, extends }
/games/<uuid>/characters/<uuid>   { created, modified, name, active, player }
/games/<uuid>/threads/<uuid>      { created, modified, name, active }
/games/<uuid>/places/<uuid>       { created, modified, name, active }
/games/<uuid>/scenes/<uuid>/content { created, modified, name }
/games/<uuid>/scenes/<uuid>/logs/<uuid> { created, modified, name }
 */

export interface RSEvent {
  // Absolute path of the changed node, from the storage root
  path: string;
  // Path of the changed node, relative to this baseclient's scope root
  relativePath: string;
  // See origin descriptions below
  origin: 'window|local|remote|conflict';
  // Old body of the changed node (local version in conflicts; undefined if creation)
  oldValue: any;
  // New body of the changed node (remote version in conflicts; undefined if deletion)
  newValue: any;
  // Old contentType of the changed node (local version for conflicts; undefined if creation)
  oldContentType: string;
  // New contentType of the changed node (remote version for conflicts; undefined if deletion)
  newContentType: string;
  // Most recent known common ancestor body of local and remote
  lastCommonValue: any;
  // Most recent known common ancestor contentType of local and remote
  lastCommonContentType: any;
}

export interface GameModule {
  list: () => Promise<RSGame[]>;
  get: (gameId: string) => Promise<RSGame>;
  save: (game: RSGame) => Promise<RSGame>;
  remove: (game: RSGame | string) => Promise<void>;
  characters(game: RSGame): Repository<RSCharacter>;
}

const RSGameModule = {
  name: 'gm_emulator',
  builder: function (privateClient: BaseClient, publicClient: BaseClient) {
    privateClient.declareType('game', {
      type: 'object',
      properties: {
        id: {
          type: 'string'
        },
        name: {
          type: 'string'
        },
        tags: {
          type: 'array',
          items: 'string',
          minimum: 1
        }
      },
      required: ['id', 'name', 'tags']
    })
    privateClient.declareType('character', {
      type: 'object',
      properties: {
        id: {
          type: 'string'
        },
        name: {
          type: 'string'
        },
        isPlayer: { type: 'boolean' },
        isActive: { type: 'boolean' }
      },
      required: ['id', 'name', 'isPlayer', 'isActive']
    })

    privateClient.on('change', e => {
      const event = e as RSEvent
      console.log('EVENT: ', event)
    })

    const exports: GameModule = Object.assign(
      new Repository<RSGame>(privateClient, 'game', '', true),
      {
        characters (game: RSGame) { return new Repository<RSCharacter>(privateClient, 'character', game.id, true) }
      }
    )

    return { exports }
  }
}

const remoteStorage = new RemoteStorage({
  logging: true,
  modules: [RSGameModule]
})

const rsGameModule = ((remoteStorage as any).gm_emulator as GameModule)

remoteStorage.access.claim('gm_emulator', 'rw')
remoteStorage.caching.enable('/gm_emulator/')

const widget = new Widget(remoteStorage, { logging: true })

remoteStorage.on('connected', () => {
  const userAddress = remoteStorage.remote.userAddress
  console.debug(`${userAddress} connected their remote storage.`)
})

remoteStorage.on('ready', () => {
  const userAddress = remoteStorage.remote.userAddress
  console.debug(`${userAddress} remote storage is read.`)
})

remoteStorage.on('network-offline', () => {
  console.debug('We\'re offline now.')
})

remoteStorage.on('network-online', () => {
  console.debug('Hooray, we\'re back online.')
})
const inMemoryGames: Game[] = []

type SceneUpdate = { index: number; name: string; context: string; summary: string }
type CharacterUpdate = { index: number; name: string; isPlayer: boolean }
type PlaceUpdate = { index: number; name: string; isActive: boolean }
type GoalUpdate = { index: number; label: string; isActive: boolean }
type QuestionUpdate = { index: number; question: string; label: string; isActive: boolean }
type SceneLogUpdate = {
  index: number; sceneIndex: number; icon: string | undefined; avatar: string | undefined;
  mechanical: string | undefined; interpretation: string | undefined; inspirations: string[];
}

function cleanupRandomConstruct (s: string) {
  return s.replace(/\b([dl])[ea] ([AEIUOY])/gim, '$1\'$2')
}

function mergeInto<T extends Entity> (list: T[], elt: T) {
  const idx = list.findIndex(e => e.id === elt.id)
  if (idx < 0) list.splice(list.length, 0, elt)
  else list.splice(idx, 1, elt)
}

export default new Vuex.Store({
  state: new RootState(),
  getters: {
    activePlayerCharacters (state: RootState): RSCharacter[] {
      return (state.current?.characters ?? []).filter(c => c.isActive && c.isPlayer)
    },
    activeNonPlayerCharacters (state: RootState): RSCharacter[] {
      return (state.current?.characters ?? []).filter(c => c.isActive && !c.isPlayer)
    },
    activePlaces (state: RootState): Place[] {
      return state.currentGame ? state.currentGame.places.filter(c => c.isActive) : []
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
    newGame (state: RootState, game: RSGame) {
      mergeInto(state.games, game)
      state.current = {
        game,
        characters: []
      }

      // FIXME temporary fix to delete
      inMemoryGames.splice(inMemoryGames.length, 0, state.currentGame = new Game(game))
    },
    savedGames (state: RootState, gameRefs: RSGame[]) {
      state.games = [...gameRefs]
      return state
    },
    loadGame (state: RootState, { game, characters }: { game: RSGame; characters: RSCharacter[]}) {
      state.current = {
        game,
        characters
      }

      // FIXME temporary fix to delete
      inMemoryGames.splice(inMemoryGames.length, 0, state.currentGame = new Game(game))
    },
    deleteGame (state: RootState, id: string) {
      if (state.current?.game?.id === id) {
        state.current = undefined

        // FIXME temporary fix to delete
        state.currentGame = null
      }
      const idx = state.games.findIndex(g => g.id === id)
      if (idx >= 0) {
        state.games.splice(idx, 1)
      }
      // FIXME implement `inMemoryGames` cleanup
      const idx2 = inMemoryGames.findIndex(g => g.id === id)
      if (idx2 >= 0) {
        inMemoryGames.splice(idx2, 1)
      }
    },
    closeGame (state: RootState) {
      state.current = undefined

      // FIXME temporary fix to delete
      state.currentGame = null
    },
    updateScene (state: RootState, update: SceneUpdate) {
      if (!state.currentGame) {
        throw Error('No loaded game')
      }
      let index = update.index ?? -1
      if (index < 0) {
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
    updateCharacter (state: RootState, update: RSCharacter) {
      if (!state.current) {
        throw Error('No loaded game')
      }
      if (!update.id) {
        throw Error('Character has no id')
      }
      mergeInto(state.current.characters, update)

      // FIXME temporary fix to delete
      if (!state.currentGame) {
        throw Error('No loaded game')
      }
      const character = new Character(update.id)
      mergeInto(state.currentGame.characters, character)
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
    updatePlace (state: RootState, payload: { update: PlaceUpdate; getters: any }) {
      const { update, getters } = payload
      if (!state.currentGame) {
        throw Error('No loaded game')
      }
      let index = update.index ?? -1
      if (index < 0) {
        index = state.currentGame.places.length
        state.currentGame.places.push(new Place(index))
      } else if (index >= state.currentGame.places.length) {
        throw Error('No character at index: ' + index)
      }
      const place = state.currentGame.places[index]
      if (update.name !== undefined) {
        place.name = update.name
      }
      if (!place.name) {
        place.name = cleanupRandomConstruct((randomize(getters.activeTagsByType.get('__place')) + ' de ' + randomName()))
      }
    },
    updateSceneLog (state: RootState, update: SceneLogUpdate) {
      if (!state.currentGame) {
        throw Error('No loaded game')
      }
      let index = update.index ?? -1
      if (index < 0) {
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
    updateGoal (state: RootState, payload: { update: GoalUpdate; getters: any }) {
      const { update, getters } = payload
      if (!state.currentGame) {
        throw Error('No loaded game')
      }
      let index = update.index ?? -1
      if (index < 0) {
        index = state.currentGame.goals.length
        state.currentGame.goals.push(new Goal(index))
      } else if (index >= state.currentGame.goals.length) {
        throw Error('No character at index: ' + index)
      }
      const item = state.currentGame.goals[index]
      if (update.label !== undefined) {
        item.label = update.label
      }
      if (!item.label) {
        item.label = cleanupRandomConstruct(randomize(getters.activeTagsByType.get('__action')) + ' de ' + randomize(getters.activeTagsByType.get('__action_object')))
      }
      if (update.isActive !== undefined) {
        item.isActive = update.isActive
      }
    },
    updateQuestion (state: RootState, update: QuestionUpdate) {
      if (!state.currentGame) {
        throw Error('No loaded game')
      }
      let index = update.index ?? -1
      if (index < 0) {
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
      await dispatch('createNewGame', { name: '7e mer', tags: ['Pirates'] })
      dispatch('updateCharacter', { isActive: true, isPlayer: true, name: 'Read (Thomas)' })
      dispatch('updateCharacter', { isActive: true, isPlayer: true, name: 'Eilissa (Marjo)' })
      dispatch('updateCharacter', { isActive: true, isPlayer: true, name: 'Ruby (Margot)' })
      dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Batea, espion repenti de la CCA, petit ami de Liani'
      })
      dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Liani, espion de la CCA, petite amie de Batea'
      })
      dispatch('updateCharacter', { isActive: true, isPlayer: false, name: 'Gustav Gregor Damaske, Hexe [Scélérat]' })
      dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Kabu, chasseur, phobie de la mer, fils de l\'ancêtre Nasa (H)'
      })
      dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Grand-Mère Nan, fille de l\'ancêtre Karaya (F)'
      })
      dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Tit\'Nan, pêcheuse de perles, petite fille de Grand-Mère Nan'
      })
      dispatch('updateCharacter', { isActive: true, isPlayer: false, name: 'Enoon, marchand de perles' })
      dispatch('updateCharacter', { isActive: true, isPlayer: false, name: 'Capitaine du fort' })
      dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Enrico Munafo, Capitaine du "Vol au Vent", Agent de la CCA, Chargement d\'esclaves, [Scélérat]'
      })
      dispatch('updateCharacter', { isActive: true, isPlayer: false, name: 'Capitaine du port, maitre des registres' })
      dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Beeron, Agent du Riroco, Prisonnier de la CCA, Dénoncé par Batea'
      })
      dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Qidan, Tailleur de harpons, Veut libérer son père (Beeron), rancune contre la CCA'
      })
      dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Le tavernier, à la potence pour avoir "aidé les héros à s\'enfuir'
      })
      dispatch('updateGoal', { isActive: true, label: 'Faire péter le fort de la CCA sur l\'île' })
      dispatch('updateGoal', { isActive: true, label: 'Faire fortune' })
      dispatch('updateGoal', { isActive: true, label: 'Boire du rhum' })
      dispatch('updateGoal', { isActive: true, label: 'Protéger sa/la liberté' })
      dispatch('updatePlace', { isActive: true, name: 'Le port, les personnages y  sont recherchés' })
      dispatch('updatePlace', {
        isActive: true,
        name: 'Le fort, de la poudre et des esclaves y sont enfermés avant d\'être vendus en Jaragua'
      })
      dispatch('updatePlace', { isActive: true, name: 'La planque de Batea et Liana' })
      dispatch('updatePlace', { isActive: true, name: 'La planque de l\'Hexe, un cabanon  dans la jungle' })
      dispatch('updatePlace', { isActive: true, name: 'Le volcan, Ambiance sulfureuse (on y trouve du souffre)' })
      await dispatch('updateScene', {
        name: 'Grabuge à la taverne',
        context: 'Read et Eilissa discutent avec deux Rahuris à la taverne du "Vieux Faucon"',
        summary: 'Les personages (Read et Eilissa) sympathisent avec deux Rahuris (Batea et Liani). Ils boivent des ' +
          'bières en réfléchissant à comment porter un coup à la Compagnie Commerciale Atabéenne. Malheureusement, des ' +
          'brutes de la CCA dans la taverne ne l\'entende pas de cette manière... et c\'est la baston. Nos héros leur ' +
          'mettent une raclée... puis à la garde de la CCA qui débarque. '
      })
      await dispatch('updateScene', {
        name: 'Fuite dans la jungle avec les deux Rahuris. ',
        context: 'Pendant la nuit, Batea à un rendez vous secret',
        summary: 'Pendant la nuit, Batea à un rendez vous secret. S\'ensuit une filature, puis une course poursuite ' +
          'dans la jungle pour capturer Batea et le messager qu\'il envoie à la CCA. Liani se révèle être aussi à la ' +
          'solde de la CCA, et s\'enfuit dans la jungle. '
      })
      await dispatch('addComment', 'Le messager est abandonné ligoté dans la jungle')
      await dispatch('updateScene', {
        name: 'Enquête de grenouilles. ',
        context: 'Read reçoit la visite de Lechtouille',
        summary: 'Pendant la même nuit, Read reçoit la visite de Lechtouille, ' +
          'une coqui (grenouille messagère des morts). Il guide les personnages à Soryana, le royaume des morts. ' +
          'Quand il realise qu\'il est dans la grotte qui abrite le nom de ses ancêtres, Batea se repent et promet ' +
          'd\'aider les personnages. À Soryana, ils apprennent que des ancêtres disparaissent. En retournant dans le ' +
          'monde des vivants, ils suivent une piste de coqui (mortes?) qui les mène à un cabanon dans la jungle. ' +
          'Ils y libèrent un (2?) ancêtre apathique, qu\'ils ramènent à son village à Soryana. '
      })
      await dispatch('updateScene', {
        name: 'Combat contre l\'Hexe',
        context: 'Les personnages sont maintenant à l\'affût au cabanon, dans l\'espoir de retrouver son maléfique ' +
          'propriétaire. ',
        summary: 'L\'Hexe qui habite là tombe entre les mains des personnages, mais les ancêtres qui l\'accompagnent ' +
          's\'interposent. Après avoir été blessés, ils se transforment en mabuya. '
      })
      await dispatch('updateScene', {
        name: 'Il faut sauver les anciens',
        context: '',
        summary: 'De retour à Soryana, ils apprennent comment les libérer, et qui chercher pour trouver un objet cher ' +
          'aux ancêtres de leur vivant. \n' +
          'Tit\'Nan leur demande leur aide avec une palourde géante. Après 2 échecs, un peu d\'explosif en viendra ' +
          'finalement à bout. Elle leur donnera une belle perle (1 de richesse) en remerciement. Elle les conduits ' +
          'ensuite à sa grand mère, Grand-Mère Nan, qui leur confiera le bracelet d\'esclave de Karaya. \n' +
          '\n' +
          'Kabu le chasseur, fils de Nasa, leur confie la conque de son père. Après un bref passage à Soryana pour ' +
          'bénir les objets, Kabu les guide jusqu\'au seul temple en ruines qu\'il connaisse dans la jungle, où ils ' +
          'ramènent Karaya à la raison. \n' +
          '\n' +
          'Ils cherchent ensuite Nasa au large de son village. À la tombée de la nuit, un serpent de mer attaque leur ' +
          'bateau de pêche. Une fois le serpent mis hors d\'état de nuire, Nasa apparaît, et les personnages le ' +
          'ramènent à lui. '
      })
      await dispatch('updateScene', {
        name: 'Quand on arrive en ville...',
        context: '',
        summary: 'Les personnages cherchent à se procurer une grande quantité de poudre pour faire péter le fort. ' +
          'Après avoir contacté Tit\'Nan et grand-mère Nan sans succès, ils retournent discrètement au port où ils ' +
          'sont maintenant recherchés. Sur la route, un flash de lumière leur indique que quelqu\'un les à repéré. ' +
          'Ils visitent un peu rudement Qidan le tailleur de harpon, un contact de Batea dont le père (Beeron) est ' +
          'enfermé au fort et qui a toutes les raisons d\'en vouloir à la CCA (et à Batea). Il leur indique que le ' +
          'capitaine du port a toutes les cargaisons listés dans son registre. Que sinon, il doivent pouvoir en ' +
          'fabriquer à base de charbon, de salpètre (conservateur pour le poisson) et de souffre (du volcan). \n' +
          'De retour se planquer chez Batea, ils le surprennent au milieu de la nuit en pleine discussion mouvementé ' +
          'avec Liani.'
      })
      await dispatch('updateScene', {
        name: '',
        context: '',
        summary: ''
      })

      await dispatch('createNewGame', { name: 'Arrrhh !!', tags: ['Pirates'] })
      for (let i = 0; i < 3; i++) {
        await dispatch('updateCharacter', { name: '', isPlayer: true })
      }
      for (let i = 0; i < 5; i++) {
        await dispatch('updateCharacter', { name: '', isPlayer: false })
        await dispatch('updatePlace', { name: '' })
        await dispatch('updateGoal', { label: '' })
      }
      await dispatch('updateScene', {
        name: 'A la taverne du "Poney Fringant"',
        context: 'Bonne ambiance au "Poney Fringant", l\'alcool coule à flot, quand soudain... Un matelot ouvre la porte en grand fracas: "Les bernards-l\'hermite attaquent !"',
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
      await dispatch('createNewGame', {
        name: 'Matt le fermier et les îles flottantes',
        tags: ['Dragons', 'Moyen-Age', 'Fantasy', 'Pirates']
      })
      await dispatch('updateScene', {
        index: -1,
        name: 'L\'Effondrement',
        context: 'Matt est en train de travailler dans son champ quand soudain le sol se met à trembler !'
      })

      dispatch('updateGoal', { isActive: true, label: 'Survivre' })
      dispatch('updateCharacter', { isActive: true, isPlayer: true, name: 'Matt le fermier' })

      dispatch('updateSceneLog', { icon: 'fas fa-bolt', mechanical: 'Matt va voir rassurer les chevaux qui paniquent' })
      dispatch('updateSceneLog', {
        icon: 'fas fa-bolt',
        mechanical: 'La borduere de l\'enclot tombe dans le vide suite à une secousse plus forte que les autres'
      })
    },
    async createNewGame ({ commit /*, state */ }, game: RSGame) {
      commit('loadTags')
      commit('newGame', await rsGameModule.save(game))
    },
    async listSavedGames ({ commit }) {
      commit('savedGames', await rsGameModule.list())
    },
    async loadSavedGame ({ commit }, id) {
      commit('loadTags')
      const game = await rsGameModule.get(id)
      const characters = await rsGameModule.characters(game).list()
      console.log('CHARACTERS: ', characters)
      commit('loadGame', { game, characters })
    },
    async deleteGame ({ commit }, id) {
      await rsGameModule.remove(id)
      commit('deleteGame', id)
    },
    closeCurrentGame ({ commit }) {
      commit('closeGame')
    },
    updateScene ({ commit }, payload: SceneUpdate) {
      commit('updateScene', payload)
    },
    async updateCharacter ({ commit, state }, payload: RSCharacter) {
      if (!state.current) throw Error('No loaded game')
      await rsGameModule.characters(state.current.game).save(payload)
      commit('updateCharacter', payload)
    },
    updatePlace ({ commit, getters }, payload: PlaceUpdate) {
      commit('updatePlace', { update: payload, getters })
    },
    updateSceneLog ({ commit }, payload: SceneLogUpdate) {
      commit('updateSceneLog', payload)
    },
    updateGoal ({ commit, getters }, payload: GoalUpdate) {
      commit('updateGoal', { update: payload, getters })
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
    },
    showRemoteStorageWidget ({ commit }) {
      widget.attach('remotestorage-widget')
    }
  },
  modules: {}
})
