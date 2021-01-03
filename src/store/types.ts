type Scope = 'people' | 'place' | 'object' | 'action';
type CharacterRef = number;
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
  name = 'lieu';
  aspects: Aspect[] = [];
  people: CharacterRef[] = [];
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
}

export class GameRef {
  id: string | null = null;
  name = 'Partie';
  tags: string[] = []; // also used for themes and tone
}

export class RootState {
  currentGame: Game | null = null;
  games: GameRef[] = [];
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
