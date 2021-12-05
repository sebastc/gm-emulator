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
    expect(tagInfo?.ancestors).toEqual(new Set())
    expect(tagInfo?.isInstance).toEqual(false)
  })

  it('doesn\'t store tag as self option', () => {
    const tagStorage = new TagStorage(false)
    const tag = { tag: 't' }
    tagStorage.add(tag)
    const tagInfos = tagStorage.getOptions('t')
    expect(tagInfos).toHaveLength(0)
  })

  it('find all ancestors', () => {
    const tagStorage = new TagStorage(false)
    tagStorage.add({ tag: 't', isA: ['u'] }, { tag: 'u', isA: ['v'] }, { tag: 'v' })
    const tagInfo = tagStorage.get('t')
    expect(tagInfo?.ancestors).toEqual(new Set(['u', 'v']))
  })

  it('registers under ancestors', () => {
    const tagStorage = new TagStorage(false)
    tagStorage.add({ tag: 't', isA: ['u'] }, { tag: 'u', isA: ['v'] }, { tag: 'v' })
    expect(tagStorage.getOptions('u').map(t => t.tag)).toEqual(['t'])
    expect(new Set(tagStorage.getOptions('v').map(t => t.tag))).toEqual(new Set(['t', 'u']))
  })
})
