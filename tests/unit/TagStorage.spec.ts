import { TagStorage } from '@/store/tags/types'

describe('TagStorage', () => {
  it('retrieves stored tag', () => {
    const tagStorage = new TagStorage(false)
    const tag = { tag: 't' }
    tagStorage.add(tag)
    const tagInfo = tagStorage.get('t')
    expect(tagInfo?.tag).toEqual(tag.tag)
    expect(tagInfo?.value).toEqual(tag.tag)
    expect(tagInfo?.isA).toHaveLength(0)
    expect(tagInfo?.excludes).toHaveLength(0)
    expect(tagInfo?.requires).toHaveLength(0)
    expect(tagInfo?.ancestors).toEqual(new Set(['__theme']))
    expect(tagInfo?.isInstance).toEqual(false)
  })

  it('doesn\'t store tag as self option', () => {
    const tagStorage = new TagStorage(false)
    const tag = { tag: 't' }
    tagStorage.add(tag)
    const tagInfos = tagStorage.getOptions('t')
    expect(tagInfos).toHaveLength(0)
  })

  it('finds all ancestors', () => {
    const tagStorage = new TagStorage(false)
    tagStorage.add({ tag: 't', isA: ['u'] }, { tag: 'u', isA: ['v'] }, { tag: 'v' })
    const tagInfo = tagStorage.get('t')
    expect(tagInfo?.ancestors).toEqual(new Set(['u', 'v', '__theme']))
  })

  it('registers under ancestors', () => {
    const tagStorage = new TagStorage(false)
    tagStorage.add({ tag: 't', isA: ['u'] }, { tag: 'u', isA: ['v'] }, { tag: 'v' })
    expect(new Set(tagStorage.getOptions('u').map(t => t.tag))).toEqual(new Set(['t']))
    expect(new Set(tagStorage.getOptions('v').map(t => t.tag))).toEqual(new Set(['t', 'u']))
  })

  it("getOptions() doesn't return unsatisfied requirements", () => {
    const tagStorage = new TagStorage(false)
    tagStorage.add({ tag: 't', isA: ['__query'], requires: ['__required'] })
    expect(new Set(tagStorage.getOptions('__query').map(t => t.tag))).toEqual(new Set([]))
  })

  it('getOptions() returns satisfied requirements', () => {
    const tagStorage = new TagStorage(false)
    tagStorage.add({ tag: 't', isA: ['__query'], requires: ['__required'] })
    expect(new Set(tagStorage.getOptions('__query', ['__required']).map(t => t.tag))).toEqual(new Set(['t']))
  })

  it("getOptions() doesn't return unsatisfied exclude", () => {
    const tagStorage = new TagStorage(false)
    tagStorage.add({ tag: 't', isA: ['__query'], excludes: ['__excluded'] })
    expect(new Set(tagStorage.getOptions('__query', ['__excluded']).map(t => t.tag))).toEqual(new Set([]))
  })

  it('getOptions() returns satisfied exclude', () => {
    const tagStorage = new TagStorage(false)
    tagStorage.add({ tag: 't', isA: ['__query'], excludes: ['__excluded'] })
    expect(new Set(tagStorage.getOptions('__query').map(t => t.tag))).toEqual(new Set(['t']))
  })

  it('getRandom do not accept group duplicates', () => {
    const tagStorage = new TagStorage(false)
    tagStorage.add(
      { tag: 't', isA: ['__query'], value: '#{A}#{B}' },
      { tag: 'a', isA: ['A'], groups: ['G'] },
      { tag: 'b', isA: ['B'] },
      { tag: 'X', isA: ['B'], groups: ['G'] }
    )
    expect(tagStorage.getRandom('__query')).toEqual('ab')
  })

  it('can be filtered by themes', () => {
    const tagStorage = new TagStorage(false)
    tagStorage.add(
      { tag: 'a', isA: ['__query'] },
      { tag: 'b', isA: ['__query', '__some_theme'] }
    )
    expect(tagStorage.getOptions('__query')).toHaveLength(2)
    tagStorage.setFilters('__some_theme')
    expect(tagStorage.getOptions('__query')).toHaveLength(1)
  })
})
