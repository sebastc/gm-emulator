import BaseClient from 'remotestoragejs/release/types/baseclient'

type Scope = 'people' | 'place' | 'object' | 'action';
type CharacterRef = string;
type PlaceRef = number;

export class Aspect {
  name = 'aspect';
  scopes: Scope[] | null = null;
  tags: string[] = [];
}

export class Goal {
  index: number
  label = 'goal';
  isActive = true;
  constructor (index: number) {
    this.index = index
  }
}

export class Character {
  id: CharacterRef;
  name = 'personne';
  isPlayer = false;
  isActive = true;
  aspects: Aspect[] = [];
  goals: string[] = [];
  relations: CharacterRef[] = [];
  places: PlaceRef[] = [];

  constructor (id: CharacterRef) {
    this.id = id
  }
}

export class Place {
  id: PlaceRef;
  name = 'lieu';
  isActive = true;
  aspects: Aspect[] = [];
  people: CharacterRef[] = [];

  constructor (id: PlaceRef) {
    this.id = id
  }
}

export class Question {
  text: string;
  result: 'exceptional_yes' | 'exceptional_no' | 'yes' | 'no';

  constructor (text: string, likelihood = 0.5) {
    this.text = text
    if (Math.random() < likelihood) {
      this.result = Math.random() < 0.2 ? 'exceptional_yes' : 'yes'
    } else {
      this.result = Math.random() < 0.2 ? 'exceptional_no' : 'no'
    }
  }
}

export class TimelineEntry {
  isMechanic = false;
  question = '';
  answer = '';
  event = '';
  relatedPC = '';
  relatedNPC = '';
  relatedThread = '';
  technicalText = '';
  interpretationText = '';
}

export class SceneLog {
  sceneIndex: number | undefined = undefined;
  index: number | undefined = undefined;
  icon: string | undefined = undefined;
  avatar: string | undefined = undefined;
  mechanical: string | undefined = undefined;
  interpretation: string | undefined = undefined;
  inspirations: string[] = [];

  constructor (sceneIndex: number, logIndex: number) {
    this.sceneIndex = sceneIndex
    this.index = logIndex
  }
}

export class GameEvent {
  type = '';
  isYes: boolean = Math.random() < 0.5;
  isExceptional: boolean = Math.random() < 0.2;

  constructor () {
    const d100 = Math.floor(Math.random() * 100) + 1
    if (d100 <= 7) {
      this.type = 'Evénement lointain'
    } else if (d100 <= 28) {
      this.type = 'Action de PNJ'
    } else if (d100 <= 35) {
      this.type = 'Nouveau PNJ'
    } else if (d100 <= 45) {
      this.type = 'Rapprochement d\'objectif'
    } else if (d100 <= 52) {
      this.type = 'Eloignement d\'objectif'
    } else if (d100 <= 55) {
      this.type = 'Objectif terminé'
    } else if (d100 <= 67) {
      this.type = 'Événement négatif pour un PJ'
    } else if (d100 <= 75) {
      this.type = 'Événement positif pour un PJ'
    } else if (d100 <= 83) {
      this.type = 'Événement ambigu'
    } else if (d100 <= 92) {
      this.type = 'Événement négatif pour un PNJ'
    } else {
      this.type = 'Événement positif pour un PNJ'
    }
  }
}

export class Scene {
  index: number;
  name = '';
  context = '';
  summary = '';
  isChanged: boolean = Math.random() < 0.1;
  isInterrupted: boolean = Math.random() < 0.5;
  alteredContext: string | null = null;
  constructor (index: number) {
    this.index = index
  }
}

export class Game {
  id: string | null = null;
  name = 'Partie';
  tags: string[] = []; // also used for themes and tone
  aspects: Aspect[] = [];
  goals: Goal[] = [];
  characters: Character[] = [];
  logs: SceneLog[] = [];
  sceneLogs: SceneLog[][] = []
  places: Place[] = [];
  scenes: Scene[] = [];
  constructor ({ id, name, tags }: RSGame) {
    this.id = id ?? ''
    this.name = name
    this.tags = tags
  }
}

let lastTs = 0

export class Repository<T extends Entity> {
  private readonly privateClient: BaseClient;
  private readonly basePath: string;
  private readonly contentSuffix: string;
  private readonly type: string;
  private readonly removeSuffix: string;

  constructor (privateClient: BaseClient, type: string, prefix = '', hasChildren = false) {
    if (prefix && !prefix.endsWith('/')) {
      prefix += '/'
    }
    this.basePath = prefix + type + 's/'
    this.contentSuffix = (hasChildren ? '/content' : '')
    this.removeSuffix = (hasChildren ? '/' : '')
    this.type = type
    this.privateClient = privateClient
  }

  public ensureId (entity: T) {
    if (!entity.id) {
      entity.id = this.basePath + this.uuidv4()
      let ts = Date.now()
      if (ts <= lastTs) {
        ts = lastTs + 1
      }
      lastTs = ts
      entity.createdDate = ts
    }
  };

  async list (): Promise<T[]> {
    const response = await this.privateClient.getListing(this.basePath) as Record<string, unknown>
    const ids = Object.keys(response)
      .filter(item => response[item] && item !== 'content')
      .map(item => item.replace(/\/$/, ''))
    return Promise.all(ids.map(id => this.get(this.basePath + id)))
      .then(l => l.sort((a, b) => {
        const vb = b.createdDate ?? 0
        const va = a.createdDate ?? 0
        return vb < va ? 1 : va < vb ? -1 : 0
      }))
  };

  async get (id: string): Promise<T> {
    const path = id + this.contentSuffix
    return await this.privateClient.getObject(path) as T
  };

  async save (entity: T) {
    if (!entity) throw new Error(`Can't save ${entity} as '${this.type}' entity`)
    this.ensureId(entity)
    const path = entity.id + this.contentSuffix
    try {
      Object.keys(entity).forEach(key => {
        const k = key as keyof T
        const v = entity[k]
        if (typeof v === 'undefined') {
          delete entity[k]
        }
      })
      console.log('SAVING ' + this.type, entity)
      await this.privateClient.storeObject(this.type, path, entity)
    } catch (e) {
      throw new Error(`Failed to store '${this.type}' entity: ${e}\n${JSON.stringify(entity)}`)
    }
    return entity
  };

  async remove (entityOrId: T | string): Promise<void> {
    let id: string
    if (typeof entityOrId === 'string') {
      id = entityOrId
    } else {
      id = entityOrId.id ?? ''
    }
    if (id) {
      return this.recursiveRemove(id + this.removeSuffix).then(() => undefined)
    } else {
      return Promise.resolve(undefined)
    }
  }

  private async recursiveRemove (path: string): Promise<void> {
    if (path.endsWith('/')) {
      const obj = await this.privateClient.getObject(path) as Record<string, unknown>
      const promises = Object.keys(obj).map(f => this.recursiveRemove(path + f))
      return await Promise.all(promises).then(() => undefined)
    } else {
      return this.privateClient.remove(path).then(() => undefined)
    }
  }

  private uuidv4 () {
    return ('' + 1e7 + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: string) =>
      (parseInt(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> parseInt(c) / 4).toString(16)
    )
  }
}

export interface Entity {
  id?: string;
  createdDate?: number;
}

export interface RSGame extends Entity {
  name: string;
  tags: string[];
  tagsByType: Record<string, string[]>;
}

export interface RSCharacter extends Entity {
  name: string;
  isPlayer: boolean;
  isActive: boolean;
}

export interface RSPlace extends Entity {
  name: string;
  isActive: boolean;
  // aspects: Aspect[];
  // people: CharacterRef[];
}

export interface RSGoal extends Entity {
  label: string;
  isActive: boolean;
}

export interface RSScene extends Entity {
  name: string;
  isActive: boolean;
  context: string;
  summary: string;
  isChanged: boolean;
  isInterrupted: boolean;
  alteredContext?: string;
}

export interface RSLog extends Entity {
  icon?: string;
  avatar?: string;
  mechanical?: string;
  interpretation?: string;
  inspirations?: string[];
}

export class RootState {
  current?: {
    game: RSGame;
    characters: RSCharacter[];
    places: RSPlace[];
    goals: RSGoal[];
    scenes: RSScene[];
    sceneIndex: number;
    logs: RSLog[];
  } = undefined;

  games: RSGame[] = [];
  tags: string[] = [];
  tagValues: {value: string; tags: string[]}[] = [];
}

/*
Fate:

 - Current issue(s)
 - Impeding issue(s)

For each issue:
 - faces
 - places

For each face/place:
 - name
 - short description
 - aspects / issues
 */

/*
Microscope:

 - Palette
 - Big Picture
 - Book ends
 */

/*
Places:

 - hierarchical
 - proxymity
 - respect planarity ( planar graph generation [[][[][]]] )
 - conceptually:
   - A sub-region can be introduced within an existing region
   - neighboring regions are stable
   - planarity is respected
 */

/*
Random ideas:
 - Alternate aspects (eg. secretive version: "une silhouette encapuchonnée", from a distance version: "un village perché au bord de la falaise")
 - MJ only visibility
 */
