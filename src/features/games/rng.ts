// Bộ sinh số ngẫu nhiên theo hạt giống (cùng hạt giống thì cùng chuỗi hồ sơ)
export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const int = (r: Rng, min: number, max: number) => Math.floor(r() * (max - min + 1)) + min
export const pick = <T>(r: Rng, items: readonly T[]): T => items[Math.floor(r() * items.length)]
export const chance = (r: Rng, p: number) => r() < p
