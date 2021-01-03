export function randomize<T> (elements: T[]): T {
  const index = Math.floor(elements.length * Math.random())
  return elements[index]
}
