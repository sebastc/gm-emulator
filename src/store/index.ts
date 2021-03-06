import Vue from 'vue'
import Vuex from 'vuex'

import data from '@/assets/data.json'
import { randomName } from '@/utils/names.ts'
import { cleanupRandomConstruct, randomize } from '@/utils/random.ts'
import { Entity, Repository, RootState, RSCharacter, RSGame, RSGoal, RSLog, RSPlace, RSScene } from './types'

import RemoteStorage from 'remotestoragejs'
import Widget from 'remotestorage-widget'
import BaseClient from 'remotestoragejs/release/types/baseclient'
import { TagStorage } from '@/store/tags/types'

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
  origin: 'window'|'local'|'remote'|'conflict';
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
  places(game: RSGame): Repository<RSPlace>;
  goals(game: RSGame): Repository<RSGoal>;
  scenes(game: RSGame): Repository<RSScene>;
  logs(game: RSScene): Repository<RSLog>;
  onChange (handler: (event: RSEvent) => void): void;
}

const RSGameModule = {
  name: 'gm_emulator',
  builder: function (privateClient: BaseClient, publicClient: BaseClient) {
    privateClient.declareType('game', {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        tags: {
          type: 'array',
          items: 'string',
          minimum: 1
        },
        tagsByType: {
          type: 'object',
          patternProperties: {
            '.*': { type: 'array', items: 'string', minimum: 1 }
          }
        }
      },
      required: ['id', 'name', 'tags']
    })
    privateClient.declareType('character', {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        isPlayer: { type: 'boolean' },
        isActive: { type: 'boolean' },
        aspects: { type: 'array', items: 'string' }
      },
      required: ['id', 'name', 'isPlayer', 'isActive']
    })
    privateClient.declareType('place', {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        isActive: { type: 'boolean' },
        aspects: { type: 'array', items: 'string' }
      },
      required: ['id', 'name', 'isActive']
    })
    privateClient.declareType('goal', {
      type: 'object',
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
        isActive: { type: 'boolean' }
      },
      required: ['id', 'label', 'isActive']
    })
    privateClient.declareType('scene', {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        isActive: { type: 'boolean' },
        context: { type: 'string' },
        summary: { type: 'string' },
        aspects: { type: 'array', items: 'string' },
        isChanged: { type: 'boolean' },
        isInterrupted: { type: 'boolean' },
        alteredContext: { type: 'string' }
      },
      required: ['id', 'name']
    })
    privateClient.declareType('log', {
      type: 'object',
      properties: {
        id: { type: 'string' },
        icon: { type: 'string' },
        avatar: { type: 'string' },
        mechanical: { type: 'string' },
        interpretation: { type: 'string' },
        inspirations: { type: 'array', items: 'string', minimum: 0 }
      },
      required: ['id', 'icon']
    })

    const exports: GameModule = Object.assign(
      new Repository<RSGame>(privateClient, 'game', '', true),
      {
        characters (game: RSGame) { return new Repository<RSCharacter>(privateClient, 'character', game.id) },
        places (game: RSGame) { return new Repository<RSPlace>(privateClient, 'place', game.id) },
        goals (game: RSGame) { return new Repository<RSGoal>(privateClient, 'goal', game.id) },
        scenes (game: RSGame) { return new Repository<RSScene>(privateClient, 'scene', game.id, true) },
        logs (scene: RSScene) { return new Repository<RSLog>(privateClient, 'log', scene.id) },
        onChange (handler: (event: RSEvent) => void) {
          privateClient.on('change', e => handler(e as RSEvent))
        }
      }
    )

    return { exports }
  }
}

const remoteStorage = new RemoteStorage({
  logging: false,
  changeEvents: {
    window: true,
    remote: true,
    local: true,
    conflict: true
  },
  modules: [RSGameModule]
})

const rsGameModule = ((remoteStorage as any).gm_emulator as GameModule)

remoteStorage.access.claim('gm_emulator', 'rw')

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

function mergeInto<T extends Entity> (list: T[], elt: T, reverse = false) {
  if (!elt.id) {
    throw Error('Element has no id')
  }
  const idx = list.findIndex(e => e.id === elt.id)
  if (idx < 0) {
    const nextIdx = reverse ? list.findIndex(e => (e.createdDate ?? 0) < (elt.createdDate ?? 0))
      : list.findIndex(e => (e.createdDate ?? 0) > (elt.createdDate ?? 0))
    const defaultIdx = reverse ? 0 : list.length
    const insertIdx = nextIdx < 0 ? defaultIdx : nextIdx
    list.splice(insertIdx, 0, elt)
    return { isNew: true, index: insertIdx }
  } else {
    list.splice(idx, 1, elt)
    return { isNew: false, index: idx }
  }
}

const store = new Vuex.Store({
  state: new RootState(),
  getters: {
    activePlayerCharacters (state: RootState): RSCharacter[] {
      return (state.current?.characters ?? []).filter(c => c.isActive && c.isPlayer)
    },
    activeNonPlayerCharacters (state: RootState): RSCharacter[] {
      return (state.current?.characters ?? []).filter(c => c.isActive && !c.isPlayer)
    },
    activePlaces (state: RootState): RSPlace[] {
      return (state.current?.places ?? []).filter(c => c.isActive)
    },
    activeGoals (state: RootState): RSGoal[] {
      return (state.current?.goals ?? []).filter(c => c.isActive)
    }
  },
  mutations: {
    newGame (state: RootState, game: RSGame) {
      mergeInto(state.games, game, true)
      state.current = {
        game,
        characters: [],
        places: [],
        goals: [],
        scenes: [],
        sceneIndex: -1,
        logs: []
      }
      state.tagStorage.setFilters(...game.tags)
    },
    savedGames (state: RootState, games: RSGame[]) {
      state.games = [...games]
      return state
    },
    loadGame (state: RootState, { game, characters, places, goals, scenes, sceneIndex, logs }: {
      game: RSGame;
      characters: RSCharacter[];
      places: RSPlace[];
      goals: RSGoal[];
      scenes: RSScene[];
      sceneIndex: number;
      logs: RSLog[];
    }) {
      state.current = { game, characters, places, goals, scenes, sceneIndex, logs }
      state.tagStorage.setFilters(...game.tags)
    },
    deleteGame (state: RootState, id: string) {
      if (state.current?.game?.id === id) {
        state.current = undefined
      }
      const idx = state.games.findIndex(g => g.id === id)
      if (idx >= 0) {
        state.games.splice(idx, 1)
      }
    },
    closeGame (state: RootState) {
      state.current = undefined
      state.tagStorage.clearFilters()
    },
    updateScene (state: RootState, update: RSScene) {
      if (!state.current?.game) {
        throw Error('No loaded game')
      }
      mergeInto(state.current.scenes, update)
    },
    loadScene (state: RootState, { index, logs }: { index: number; logs: RSLog[] }) {
      if (!state.current?.game) {
        throw Error('No loaded game')
      }
      state.current.sceneIndex = index
      state.current.logs = logs
    },
    updateCharacter (state: RootState, update: RSCharacter) {
      if (!state.current) {
        throw Error('No loaded game')
      }
      mergeInto(state.current.characters, update)
    },
    updatePlace (state: RootState, update: RSPlace) {
      if (!state.current) {
        throw Error('No loaded game')
      }
      mergeInto(state.current.places, update)
    },
    updateGoal (state: RootState, update: RSGoal) {
      if (!state.current?.game) {
        throw Error('No loaded game')
      }
      mergeInto(state.current.goals, update)
    },
    updateSceneLog (state: RootState, update: RSLog) {
      if (!state.current) {
        throw Error('No loaded game')
      }
      mergeInto(state.current.logs, update)
    }
  },
  actions: {
    async createFakeGame ({ dispatch }) {
      await dispatch('createNewGame', { name: '7e mer', tags: ['Pirates'] })
      await dispatch('updateCharacter', { isActive: true, isPlayer: true, name: 'Read (Thomas)' })
      await dispatch('updateCharacter', { isActive: true, isPlayer: true, name: 'Eilissa (Marjo)' })
      await dispatch('updateCharacter', { isActive: true, isPlayer: true, name: 'Ruby (Margot)' })
      await dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Batea, espion repenti de la CCA, petit ami de Liani'
      })
      await dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Liani, espion de la CCA, petite amie de Batea'
      })
      await dispatch('updateCharacter', { isActive: true, isPlayer: false, name: 'Gustav Gregor Damaske, Hexe [Sc??l??rat]' })
      await dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Kabu, chasseur, phobie de la mer, fils de l\'anc??tre Nasa (H)'
      })
      await dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Grand-M??re Nan, fille de l\'anc??tre Karaya (F)'
      })
      await dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Tit\'Nan, p??cheuse de perles, petite fille de Grand-M??re Nan'
      })
      await dispatch('updateCharacter', { isActive: true, isPlayer: false, name: 'Enoon, marchand de perles' })
      await dispatch('updateCharacter', { isActive: true, isPlayer: false, name: 'Capitaine du fort' })
      await dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Enrico Munafo, Capitaine du "Vol au Vent", Agent de la CCA, Chargement d\'esclaves, [Sc??l??rat]'
      })
      await dispatch('updateCharacter', { isActive: true, isPlayer: false, name: 'Capitaine du port, maitre des registres' })
      await dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Beeron, Agent du Riroco, Prisonnier de la CCA, D??nonc?? par Batea'
      })
      await dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Qidan, Tailleur de harpons, Veut lib??rer son p??re (Beeron), rancune contre la CCA'
      })
      await dispatch('updateCharacter', {
        isActive: true,
        isPlayer: false,
        name: 'Le tavernier, ?? la potence pour avoir "aid?? les h??ros ?? s\'enfuir'
      })
      await dispatch('updateGoal', { isActive: true, label: 'Faire p??ter le fort de la CCA sur l\'??le' })
      await dispatch('updateGoal', { isActive: true, label: 'Faire fortune' })
      await dispatch('updateGoal', { isActive: true, label: 'Boire du rhum' })
      await dispatch('updateGoal', { isActive: true, label: 'Prot??ger sa/la libert??' })
      await dispatch('updatePlace', { isActive: true, name: 'Le port, les personnages y  sont recherch??s' })
      await dispatch('updatePlace', {
        isActive: true,
        name: 'Le fort, de la poudre et des esclaves y sont enferm??s avant d\'??tre vendus en Jaragua'
      })
      await dispatch('updatePlace', { isActive: true, name: 'La planque de Batea et Liana' })
      await dispatch('updatePlace', { isActive: true, name: 'La planque de l\'Hexe, un cabanon  dans la jungle' })
      await dispatch('updatePlace', { isActive: true, name: 'Le volcan, Ambiance sulfureuse (on y trouve du souffre)' })
      await dispatch('updateScene', {
        name: 'Grabuge ?? la taverne',
        context: 'Read et Eilissa discutent avec deux Rahuris ?? la taverne du "Vieux Faucon"',
        summary: 'Les personages (Read et Eilissa) sympathisent avec deux Rahuris (Batea et Liani). Ils boivent des ' +
          'bi??res en r??fl??chissant ?? comment porter un coup ?? la Compagnie Commerciale Atab??enne. Malheureusement, des ' +
          'brutes de la CCA dans la taverne ne l\'entende pas de cette mani??re... et c\'est la baston. Nos h??ros leur ' +
          'mettent une racl??e... puis ?? la garde de la CCA qui d??barque. '
      })
      await dispatch('updateScene', {
        name: 'Fuite dans la jungle avec les deux Rahuris. ',
        context: 'Pendant la nuit, Batea ?? un rendez vous secret',
        summary: 'Pendant la nuit, Batea ?? un rendez vous secret. S\'ensuit une filature, puis une course poursuite ' +
          'dans la jungle pour capturer Batea et le messager qu\'il envoie ?? la CCA. Liani se r??v??le ??tre aussi ?? la ' +
          'solde de la CCA, et s\'enfuit dans la jungle. '
      })
      await dispatch('addComment', 'Le messager est abandonn?? ligot?? dans la jungle')
      await dispatch('updateScene', {
        name: 'Enqu??te de grenouilles. ',
        context: 'Read re??oit la visite de Lechtouille',
        summary: 'Pendant la m??me nuit, Read re??oit la visite de Lechtouille, ' +
          'une coqui (grenouille messag??re des morts). Il guide les personnages ?? Soryana, le royaume des morts. ' +
          'Quand il realise qu\'il est dans la grotte qui abrite le nom de ses anc??tres, Batea se repent et promet ' +
          'd\'aider les personnages. ?? Soryana, ils apprennent que des anc??tres disparaissent. En retournant dans le ' +
          'monde des vivants, ils suivent une piste de coqui (mortes?) qui les m??ne ?? un cabanon dans la jungle. ' +
          'Ils y lib??rent un (2?) anc??tre apathique, qu\'ils ram??nent ?? son village ?? Soryana. '
      })
      await dispatch('updateScene', {
        name: 'Combat contre l\'Hexe',
        context: 'Les personnages sont maintenant ?? l\'aff??t au cabanon, dans l\'espoir de retrouver son mal??fique ' +
          'propri??taire. ',
        summary: 'L\'Hexe qui habite l?? tombe entre les mains des personnages, mais les anc??tres qui l\'accompagnent ' +
          's\'interposent. Apr??s avoir ??t?? bless??s, ils se transforment en mabuya. '
      })
      await dispatch('updateScene', {
        name: 'Il faut sauver les anciens',
        context: '',
        summary: 'De retour ?? Soryana, ils apprennent comment les lib??rer, et qui chercher pour trouver un objet cher ' +
          'aux anc??tres de leur vivant. \n' +
          'Tit\'Nan leur demande leur aide avec une palourde g??ante. Apr??s 2 ??checs, un peu d\'explosif en viendra ' +
          'finalement ?? bout. Elle leur donnera une belle perle (1 de richesse) en remerciement. Elle les conduits ' +
          'ensuite ?? sa grand m??re, Grand-M??re Nan, qui leur confiera le bracelet d\'esclave de Karaya. \n' +
          '\n' +
          'Kabu le chasseur, fils de Nasa, leur confie la conque de son p??re. Apr??s un bref passage ?? Soryana pour ' +
          'b??nir les objets, Kabu les guide jusqu\'au seul temple en ruines qu\'il connaisse dans la jungle, o?? ils ' +
          'ram??nent Karaya ?? la raison. \n' +
          '\n' +
          'Ils cherchent ensuite Nasa au large de son village. ?? la tomb??e de la nuit, un serpent de mer attaque leur ' +
          'bateau de p??che. Une fois le serpent mis hors d\'??tat de nuire, Nasa appara??t, et les personnages le ' +
          'ram??nent ?? lui. '
      })
      await dispatch('updateScene', {
        name: 'Quand on arrive en ville...',
        context: '',
        summary: 'Les personnages cherchent ?? se procurer une grande quantit?? de poudre pour faire p??ter le fort. ' +
          'Apr??s avoir contact?? Tit\'Nan et grand-m??re Nan sans succ??s, ils retournent discr??tement au port o?? ils ' +
          'sont maintenant recherch??s. Sur la route, un flash de lumi??re leur indique que quelqu\'un les ?? rep??r??. ' +
          'Ils visitent un peu rudement Qidan le tailleur de harpon, un contact de Batea dont le p??re (Beeron) est ' +
          'enferm?? au fort et qui a toutes les raisons d\'en vouloir ?? la CCA (et ?? Batea). Il leur indique que le ' +
          'capitaine du port a toutes les cargaisons list??s dans son registre. Que sinon, il doivent pouvoir en ' +
          'fabriquer ?? base de charbon, de salp??tre (conservateur pour le poisson) et de souffre (du volcan). \n' +
          'De retour se planquer chez Batea, ils le surprennent au milieu de la nuit en pleine discussion mouvement?? ' +
          'avec Liani.'
      })
      await dispatch('updateScene', {
        name: '',
        context: '',
        summary: ''
      })

      await dispatch('createNewGame', { name: 'Arrrhh !!', tags: ['Pirates'] })
      for (let i = 0; i < 3; i++) {
        await dispatch('updateCharacter', {
          name: randomName(),
          isActive: true,
          isPlayer: true,
          aspects: [
            await dispatch('getRandom', { query: '__aspect', tags: ['__entity'] }),
            await dispatch('getRandom', { query: '__aspect', tags: ['__entity'] }),
            await dispatch('getRandom', { query: '__aspect', tags: ['__entity'] })
          ]
        })
      }
      for (let i = 0; i < 5; i++) {
        await dispatch('updateCharacter', {
          name: randomName(),
          isActive: true,
          isPlayer: false,
          aspects: [
            await dispatch('getRandom', { query: '__aspect', tags: ['__entity'] }),
            await dispatch('getRandom', { query: '__aspect', tags: ['__entity'] }),
            await dispatch('getRandom', { query: '__aspect', tags: ['__entity'] })
          ]
        })
        await dispatch('updatePlace', { name: await dispatch('getRandom', { query: '__place_aspect' }), isActive: true })
        await dispatch('updateGoal', { label: await dispatch('getRandom', { query: '__goal' }), isActive: true })
      }
      await dispatch('updateScene', {
        name: 'A la taverne du "Poney Fringant"',
        context: 'Bonne ambiance au "Poney Fringant", l\'alcool coule ?? flot, quand soudain... Un matelot ouvre la porte en grand fracas: "Les bernards-l\'hermite attaquent !"',
        summary: 'Grosse chouffe, une attaque de crustac??s, les personnages sauvent une fillette'
      })
      for (let i = 0; i < 5; i++) {
        await dispatch('randomEvent')
      }
      await dispatch('updateScene', {
        name: ''
      })
      for (let i = 0; i < 5; i++) {
        await dispatch('randomEvent')
      }
      await dispatch('closeCurrentGame')
      // Matt le fermier
      await dispatch('createNewGame', {
        name: 'Matt le fermier et les ??les flottantes',
        tags: ['Dragons', 'Moyen-Age', 'Fantasy', 'Pirates']
      })
      await dispatch('updateScene', {
        index: -1,
        name: 'L\'Effondrement',
        context: 'Matt est en train de travailler dans son champ quand soudain le sol se met ?? trembler !'
      })

      await dispatch('updateGoal', { isActive: true, label: 'Survivre' })
      await dispatch('updateCharacter', { isActive: true, isPlayer: true, name: 'Matt le fermier' })

      await dispatch('updateSceneLog', { icon: 'fas fa-bolt', mechanical: 'Matt va voir rassurer les chevaux qui paniquent' })
      await dispatch('updateSceneLog', {
        icon: 'fas fa-bolt',
        mechanical: 'La borduere de l\'enclot tombe dans le vide suite ?? une secousse plus forte que les autres'
      })
    },
    async createNewGame ({ commit, state }, game: RSGame) {
      commit('newGame', await rsGameModule.save(game))
    },
    async listSavedGames ({ commit }) {
      commit('savedGames', (await rsGameModule.list()).reverse())
    },
    async loadSavedGame ({ commit }, id) {
      const game = await rsGameModule.get(id)
      const characterPromise = rsGameModule.characters(game).list()
      const placesPromise = rsGameModule.places(game).list()
      const goalsPromise = rsGameModule.goals(game).list()
      const scenesPromise = rsGameModule.scenes(game).list()
      await Promise.all([characterPromise, placesPromise, goalsPromise, scenesPromise])
      const [characters, places, goals, scenes] = [
        await characterPromise,
        await placesPromise,
        await goalsPromise,
        await scenesPromise
      ]
      const sceneIndex = scenes.length - 1
      const scene = sceneIndex >= 0 ? scenes[sceneIndex] : undefined
      const logs = scene ? await rsGameModule.logs(scene).list() : []
      commit('loadGame', { game, characters, places, goals, scenes, sceneIndex, logs })
    },
    async deleteGame ({ commit }, id) {
      await rsGameModule.remove(id)
      commit('deleteGame', id)
    },
    closeCurrentGame ({ commit }) {
      commit('closeGame')
    },
    async updateScene ({ commit, state, dispatch }, payload: RSScene) {
      if (!state.current) throw Error('No loaded game')
      const isNew = !payload.id
      await rsGameModule.scenes(state.current.game).save(payload)
      if (isNew) {
        const index = state.current.scenes.findIndex(s => s.id === payload.id)
        await dispatch('loadScene', index)
      }
    },
    async loadScene ({ commit, state }, index: number) {
      if (!state.current) throw Error('No loaded game')
      commit('loadScene', { index, logs: [] })
      const logs = await rsGameModule.logs(state.current.scenes[index]).list()
      commit('loadScene', { index, logs })
    },
    async updateCharacter ({ commit, state }, payload: RSCharacter) {
      if (!state.current) throw Error('No loaded game')
      await rsGameModule.characters(state.current.game).save(payload)
    },
    async updatePlace ({ commit, state }, payload: RSPlace) {
      if (!state.current) throw Error('No loaded game')
      await rsGameModule.places(state.current.game).save(payload)
    },
    async updateSceneLog ({ commit, state }, payload: RSLog) {
      if (!state.current) throw Error('No loaded game')
      const scene = state.current.scenes[state.current.sceneIndex]
      await rsGameModule.logs(scene).save(payload)
    },
    async updateGoal ({ commit, state }, payload: RSGoal) {
      if (!state.current) throw Error('No loaded game')
      await rsGameModule.goals(state.current.game).save(payload)
    },
    getCharacterById ({ state }, id: string): RSCharacter {
      if (!state.current) throw Error('No loaded game')
      const res = state.current.characters.find(p => p.id === id)
      if (!res) throw new Error(`Can't find character: '${id}'`)
      return res
    },
    getGoalById ({ state }, id: string): RSGoal {
      if (!state.current) throw Error('No loaded game')
      const res = state.current.goals.find(p => p.id === id)
      if (!res) throw new Error(`Can't find goal: '${id}'`)
      return res
    },
    getPlaceById ({ state }, id: string): RSPlace {
      if (!state.current) throw Error('No loaded game')
      const res = state.current.places.find(p => p.id === id)
      if (!res) throw new Error(`Can't find place: '${id}'`)
      return res
    },
    getSceneById ({ state }, id: string): RSScene {
      if (!state.current) throw Error('No loaded game')
      const res = state.current.scenes.find(p => p.id === id)
      if (!res) throw new Error(`Can't find scene: '${id}'`)
      return res
    },
    getLogById ({ state }, id: string): RSLog {
      if (!state.current) throw Error('No loaded game')
      const res = state.current.logs.find(p => p.id === id)
      if (!res) throw new Error(`Can't find log: '${id}'`)
      return res
    },
    async randomAnswer ({ dispatch, state }, payload: string) {
      if (!state.current) throw Error('No loaded game')
      if (!(state.current.sceneIndex === state.current.scenes.length - 1)) throw Error('Not on last scene')
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
      await dispatch('updateSceneLog', { icon: 'far fa-question-circle', mechanical: payload + ' ' + answer })
      if (Math.random() < 0.1) {
        await dispatch('randomEvent')
      }
    },
    async randomEvent ({ dispatch, getters, state }) {
      if (!state.current) throw Error('No loaded game')
      if (!(state.current.sceneIndex === state.current.scenes.length - 1)) throw Error('Not on last scene')
      let mechanical = ''
      let relatedAspects: string[] | undefined
      while (true) {
        const d100 = Math.floor(Math.random() * 100) + 1
        if (d100 <= 7) {
          mechanical = 'Ev??nement lointain'
        } else if (d100 <= 28) {
          if (getters.activeNonPlayerCharacters.length === 0) {
            continue
          }
          const item: RSCharacter = randomize(getters.activeNonPlayerCharacters)
          mechanical = 'Action du PNJ "' + item.name + '"'
          relatedAspects = item.aspects
        } else if (d100 <= 35) {
          await dispatch('updateCharacter', { name: randomName(), isActive: true, isPlayer: false })
          const lastOne = getters.activeNonPlayerCharacters.length - 1
          const item: RSCharacter = getters.activeNonPlayerCharacters[lastOne]
          mechanical = 'Nouveau PNJ "' + item.name + '"'
          relatedAspects = item.aspects
        } else if (d100 <= 45) {
          if (getters.activeNonPlayerCharacters.length === 0) {
            continue
          }
          if (getters.activeGoals.length === 0) {
            continue
          }
          const item: RSGoal = randomize(getters.activeGoals)
          mechanical = 'Rapprochement d\'objectif: "' + item.label + '"'
        } else if (d100 <= 52) {
          if (getters.activeGoals.length === 0) {
            continue
          }
          const item: RSGoal = randomize(getters.activeGoals)
          mechanical = 'Eloignement d\'objectif: "' + item.label + '"'
        } else if (d100 <= 55) {
          if (getters.activeGoals.length === 0) {
            continue
          }
          const item: RSGoal = randomize(getters.activeGoals)
          mechanical = 'Objectif termin??: "' + item.label + '"'
        } else if (d100 <= 67) {
          if (getters.activePlayerCharacters.length === 0) {
            continue
          }
          const item: RSCharacter = randomize(getters.activePlayerCharacters)
          mechanical = '??v??nement n??gatif pour le PJ "' + item.name + '"'
          relatedAspects = item.aspects
        } else if (d100 <= 75) {
          if (getters.activePlayerCharacters.length === 0) {
            continue
          }
          const item: RSCharacter = randomize(getters.activePlayerCharacters)
          mechanical = '??v??nement positif pour le PJ "' + item.name + '"'
          relatedAspects = item.aspects
        } else if (d100 <= 83) {
          mechanical = '??v??nement ambigu'
        } else if (d100 <= 92) {
          if (getters.activeNonPlayerCharacters.length === 0) {
            continue
          }
          const item: RSCharacter = randomize(getters.activeNonPlayerCharacters)
          mechanical = '??v??nement n??gatif pour le PNJ "' + item.name + '"'
          relatedAspects = item.aspects
        } else {
          if (getters.activeNonPlayerCharacters.length === 0) {
            continue
          }
          const item: RSCharacter = randomize(getters.activeNonPlayerCharacters)
          mechanical = '??v??nement positif pour un PNJ "' + item.name + '"'
          relatedAspects = item.aspects
        }
        break
      }
      const inspirations = relatedAspects?.length && Math.random() < 0.5 ? [randomize(relatedAspects)] : [
        await dispatch('getRandom', { query: '__action' }),
        await dispatch('getRandom', { query: '__action_object' })
      ]
      await dispatch('updateSceneLog', { icon: 'fas fa-bolt', mechanical, inspirations })
    },
    async getRandom (
      { state /* , dispatch */ },
      // { tag, tagSet }: { tag: string; tagSet: string[] }
      { query: tag, tags = [] }: { query: string; tags?: string[]}
    ): Promise<string> { // { res: string; tagSet: string[] }> {
      return state.tagStorage.getRandom(tag, tags) ?? 'N/A'
    },
    async addComment ({ dispatch, state }, comment: string) {
      if (!state.current) throw Error('No loaded game')
      if (!(state.current.sceneIndex === state.current.scenes.length - 1)) throw Error('Not on last scene')
      await dispatch('updateSceneLog', { icon: 'far fa-comments', interpretation: comment })
    },
    showRemoteStorageWidget ({ commit }) {
      widget.attach('remotestorage-widget')
    },
    async init ({ state, dispatch, commit }) {
      await dispatch('listSavedGames')
      rsGameModule.onChange(e => {
        console.debug('CHANGE: ' + e.relativePath, e)
        const elts = e.relativePath.split('/')
        const newValue = e.origin === 'conflict' && e?.oldValue?.createdDate > e?.newValue?.createdDate ? e.oldValue : e.newValue

        if (elts.length === 3) {
          // games/<id>/content
          console.debug('Reloading games')
          dispatch('listSavedGames')
        } else if (e.newValue) {
          // games/<id>/...
          const gameId = elts.slice(0, 2).join('/')
          if (state?.current?.game?.id === gameId) {
            if (elts.length === 4) {
              // games/<id>/<type>/<id>
              switch (elts[2]) {
                case 'characters':
                  return commit('updateCharacter', newValue)
                case 'places':
                  return commit('updatePlace', newValue)
                case 'goals':
                  return commit('updateGoal', newValue)
                default:
              }
            } else if (elts.length >= 5) {
              // games/<id>/scenes/<id>/content
              // games/<id>/scenes/<id>/logs/<id>
              const changedSceneId = elts.slice(0, 4).join('/')
              const currentScenes = state?.current?.scenes
              const currentSceneIndex = state?.current?.sceneIndex ?? -1
              const currentSceneId = currentScenes?.[currentSceneIndex]?.id
              switch (elts[4]) {
                case 'content':
                  return commit('updateScene', newValue)
                case 'logs':
                  if (currentSceneId === changedSceneId) {
                    return commit('updateSceneLog', newValue)
                  }
                  break
                default:
              }
            } else {
              console.error('Unsupported id: ', elts)
            }
          }
        }
      })
      remoteStorage.caching.enable('/gm_emulator/')
    }
  },
  modules: {}
})

export default store

remoteStorage.on('ready', () => store.dispatch('init'))
