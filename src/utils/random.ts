export function randomize<T> (elements: T[]): T {
  if (!elements.length) {
    console.log('weird list: ', elements)
  }
  const index = Math.floor(elements.length * Math.random())
  let res = elements[index]
  if (typeof res === 'string' && res.indexOf('/') !== -1) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    res = randomize(res.split(/\s*\/\s*/))
  }
  return res
}

export function cleanupRandomConstruct (s: string) {
  return s
    .replace(/\b(\S+)-(une?\s+)\b/gim, '$2$1-')
    .replace(/\bdu +une\b/gim, 'de la')
    .replace(/\bdu +un\b/gim, 'de le')
    .replace(/\bde +une?\b/gim, 'de')
    .replace(/\bun +(une?)\b/gim, '$1')
    .replace(/\b([dl])[ea] +(h?[AEIUOYéÉÈÊË])/gim, '$1\'$2')
    .replace(/\bde +les\b/gim, 'des')
    .replace(/\bde +le\b/gim, 'du')
    .replace(/\s+/gim, ' ')
}
