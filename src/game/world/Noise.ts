/**
 * Deterministic value-noise + fBm. No external deps.
 * Good enough for biome / heightmap generation on the scale we need.
 */

function hash2(ix: number, iy: number, seed: number): number {
  // Fast integer hash -> [0,1)
  let h = ix * 374761393 + iy * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const v00 = hash2(ix, iy, seed);
  const v10 = hash2(ix + 1, iy, seed);
  const v01 = hash2(ix, iy + 1, seed);
  const v11 = hash2(ix + 1, iy + 1, seed);

  const sx = smooth(fx);
  const sy = smooth(fy);

  const ix0 = v00 * (1 - sx) + v10 * sx;
  const ix1 = v01 * (1 - sx) + v11 * sx;
  return ix0 * (1 - sy) + ix1 * sy;
}

/** Fractional Brownian motion. */
export function fbm(
  x: number,
  y: number,
  seed: number,
  octaves = 5,
  lacunarity = 2,
  gain = 0.5,
): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise(x * freq, y * freq, seed + o * 101);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}
