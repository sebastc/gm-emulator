export function randomize<T> (elements: T[]): T {
  const index = Math.floor(elements.length * Math.random())
  let res = elements[index]
  if (typeof res === 'string' && res.indexOf('/') !== -1) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    res = randomize(res.split(/\s*\/\s*/))
  }
  return res
}
