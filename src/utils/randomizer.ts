export function randomPick<T>(items: T[]): T | null {
  if (!items || items.length === 0) return null
  const index = Math.floor(Math.random() * items.length)
  return items[index]
}

export function shuffle<T>(array: T[]): T[] {
  const keys = Object.keys(array) as unknown[] as number[]
  const result: T[] = []
  for (let k = 0, n = keys.length; k < array.length && n > 0; k += 1) {
    const i = Math.floor(Math.random() * n)
    const key = keys[i]
    result.push(array[key])
    n -= 1
    const tmp = keys[n]
    keys[n] = key
    keys[i] = tmp
  }
  return result
}

