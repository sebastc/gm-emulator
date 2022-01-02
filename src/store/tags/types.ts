import data from '@/assets/data.json'
import { cleanupRandomConstruct, randomize } from '@/utils/random'
import { randomName } from '@/utils/names'

type ParsedTag = { type: 'reference'; required: string[] } | { type: 'literal'; value: string }

export interface Tag {
  tag: string; // tagIds
  inherited?: boolean; // Whether propagated as ancestor in children, by default: true
  isInstance?: boolean; // for non generative node (eg. H.P. Themes, Cthulhu, the One Ring, etc...), by default: false
  value?: string; // can be literals or formulas
  isA?: string[]; // tagIds (inherited)
  requires?: string[]; // tagIds (inherited, how ?)
  excludes?: string[]; // tagIds (inherited, how ?)
  groups?: string[]; // tagIds (inherited, how ?)
  // How are inherited requires/excludes conflicts resolved ?
}

export interface TagInfo extends Tag {
  isInstance: boolean;
  inherited: boolean;
  value: string;
  parsedValue: ParsedTag[];
  isFormula: boolean;
  isA: string[]; // tagIds (inherited)
  requires: string[]; // tagIds (inherited, how ?)
  excludes: string[]; // tagIds (inherited, how ?)
  groups: string[]; // tagIds (inherited, how ?)
  ancestors: Set<string>;
}

export class TagStorage {
  private tagById: Record<string, Tag> = {}
  private tagInfoById: Map<string, TagInfo> = new Map<string, TagInfo>()
  private tagInfoByType: Record<string, TagInfo[]> = {}
  private types: Set<string> = new Set<string>()
  private filters: Set<string> = new Set<string>()

  public get (tag: string): TagInfo|undefined {
    return this.tagInfoById.get(tag)
  }

  public getOptions (tag: string, currentTags: string[] = []): TagInfo[] {
    currentTags = [...currentTags, ...this.filters]
    return (this.tagInfoByType[tag] ?? []).filter(t =>
      (t.isFormula || !this.tagInfoByType[t.tag]?.length) &&
      t.requires.every(t => currentTags.includes(t)) &&
      !t.excludes.some(t => currentTags.includes(t)) &&
      !t.groups.map(g => `group@${g}`).some(t => currentTags.includes(t))
    )
  }

  public getRandom (tag: string, currentTags: string[] = []): string | undefined {
    const res = this.getInternalRandom(tag, currentTags)?.res
    if (res) return cleanupRandomConstruct(res)
    return undefined
  }

  private getInternalRandom (tag: string, currentTags: string[] = []): { res: string; newTags: string[]} | undefined {
    // console.log(`getInternalRandom(${tag}, ${currentTags})`)
    const options = this.getOptions(tag, currentTags)
    // console.log('options: ', options)
    if (!options?.length) {
      return undefined
    }
    const selected = randomize(options)
    // console.log('selected: ', selected)
    let res = selected.value
    let newTags = [...currentTags, selected.tag, ...selected.ancestors, ...selected.groups.map(g => `group@${g}`)]

    if (res?.includes('/')) {
      res = randomize(res.split('/'))
    }

    if (res?.includes('#')) {
      const re = /#{([^}]*)}/
      let array
      while ((array = re.exec(res)) !== null) {
        const reference = array[0]
        const referencedTag = array[1]
        const resolvedValue = referencedTag === '__name__' ? {
          res: randomName(),
          newTags: []
        } : this.getInternalRandom(referencedTag, newTags)
        if (!resolvedValue) return undefined
        res = res.replace(reference, resolvedValue.res) // [array[1]/* , ...tagSet */]))
        newTags = resolvedValue.newTags
      }
    }
    // console.log(`getInternalRandom(${tag}, ${currentTags}) => `, { res, newTags })

    return { res, newTags }
  }

  private register (tag: string): TagInfo {
    const existingInfo = this.tagInfoById.get(tag)
    if (existingInfo) return existingInfo
    else {
      const tagObject: Tag = this.tagById[tag] ?? { tag }
      const { tag: id, value = id, isA = [], excludes = [], requires = [], groups = [], isInstance = false, inherited = true } = tagObject
      const parsedValue = TagStorage.splitTag(value)
      const referenced = parsedValue.flatMap(pv => pv.type === 'reference' ? pv.required : [])
      const ancestors = [...isA ?? [], ...(isA ?? []).flatMap(t => [...this.register(t).ancestors ?? []])]
      const ancestorInfos = ancestors.flatMap(t => this.register(t))
      const info: TagInfo = {
        tag: id,
        value,
        parsedValue,
        isFormula: parsedValue.length > 1 || !!referenced.length,
        isA,
        excludes: [...new Set([...excludes, ...ancestorInfos.flatMap(a => a.excludes)])].filter(e => !requires.includes(e)),
        requires: [...new Set([...requires, ...ancestorInfos.flatMap(a => a.requires)])].filter(i => !excludes.includes(i)),
        groups: [...new Set([...groups, ...ancestorInfos.flatMap(a => a.groups)])],
        inherited,
        isInstance,
        ancestors: new Set(ancestorInfos.filter(a => a.inherited).map(a => a.tag))
      }
      this.tagInfoById.set(tag, info)
      ancestors.forEach(t => {
        let options = this.tagInfoByType[t]
        if (!options) {
          this.tagInfoByType[t] = options = []
          this.types.add(t)
        }
        options.splice(options.length, 0, info)
      })
      referenced.forEach(t => this.register(t))
      return info
    }
  }

  private static splitTag (tag: string): ParsedTag[] {
    let res: ParsedTag[] = []
    const re = /#{([^}]*)}/g
    let index = 0
    let array
    while ((array = re.exec(tag)) !== null) {
      if (index !== array.index) {
        res = [...res, { type: 'literal', value: tag.slice(index, array.index) }]
      }
      res = [...res, { type: 'reference', required: array[1].split(',') }]
      index = re.lastIndex + 1
    }
    if (index !== tag.length) {
      res = [...res, { type: 'literal', value: tag.slice(index, tag.length) }]
    }
    return res
  }

  public add (...tags: Tag[]) {
    tags.forEach(elt => { this.tagById[elt.tag] = elt })
    tags.forEach(elt => { this.register(elt.tag) })
  }

  public constructor (init = true) {
    if (init) {
      this.add(
        ...data.values.map(t => ({
          tag: t.tag ?? t.value,
          value: t.value ?? t.tag,
          isA: t.isA ?? [],
          requires: t.requires ?? [],
          excludes: t.excludes ?? [],
          groups: t.groups ?? [],
          inherited: t.inherited
        }))
      )
    }
  }

  public setFilters (...filters: string[]) {
    if (!filters?.length) filters = ['__theme']
    const x = filters.flatMap(t => [t, ...this.tagInfoById.get(t)?.ancestors ?? []])
    this.filters = new Set(x)
    console.log('actual filters: ', this.filters)
    return this
  }

  public clearFilters () {
    this.filters.clear()
    return this
  }

  public getAllThemeInfo () {
    return [...this.tagInfoById.values()].filter(t => t.ancestors.has('__theme') || t.tag === '__theme')
  }

  public getAllNonThemeInfo () {
    return [...this.tagInfoById.values()].filter(t => !(t.ancestors.has('__theme') || t.tag === '__theme'))
  }

  public getThemes () {
    if (this.filters.size) {
      return [...this.filters]
    } else {
      return this.getAllThemeInfo().map(t => t.tag)
    }
  }

  public getAllNonThemeTags () {
    const allThemes = new Set(...this.getAllThemeInfo().map(i => i.tag))
    return [...this.getAllNonThemeInfo()].filter(t => t.requires.filter(r => allThemes.has(r)).every(r => this.filters.has(r)) && !(t.ancestors.has('__theme') || t.tag === '__theme')).map(t => t.tag)
  }
}
