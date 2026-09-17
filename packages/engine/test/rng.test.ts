import { describe, expect, it } from 'vitest'
import { createRng, nextFloat, nextInt, rollChance } from '../src/rng'

function sequence(seed: number, count: number): number[] {
  let rng = createRng(seed)
  const values: number[] = []
  for (let i = 0; i < count; i += 1) {
    const [value, next] = nextFloat(rng)
    values.push(value)
    rng = next
  }
  return values
}

describe('детерминированный ГПСЧ', () => {
  it('из одного зерна выдаёт одну и ту же последовательность', () => {
    expect(sequence(42, 20)).toEqual(sequence(42, 20))
  })

  it('из разных зёрен выдаёт разные последовательности', () => {
    expect(sequence(42, 20)).not.toEqual(sequence(43, 20))
  })

  it('не трогает исходное состояние', () => {
    const rng = createRng(7)
    nextFloat(rng)
    nextFloat(rng)
    expect(rng.state).toBe(7)
  })

  it('держится в заданных границах', () => {
    let rng = createRng(1)
    for (let i = 0; i < 200; i += 1) {
      const [value, next] = nextInt(rng, 3, 6)
      expect(value).toBeGreaterThanOrEqual(3)
      expect(value).toBeLessThanOrEqual(6)
      rng = next
    }
  })

  it('невозможное и неизбежное остаются такими', () => {
    let rng = createRng(99)
    for (let i = 0; i < 50; i += 1) {
      const [never, a] = rollChance(rng, 0)
      const [always, b] = rollChance(a, 1)
      expect(never).toBe(false)
      expect(always).toBe(true)
      rng = b
    }
  })
})
