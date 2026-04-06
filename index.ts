import { around as geoknn } from 'geokdbush'
import KDBush from 'kdbush'

/**
 * A "mask" array where each element is 0 if the coordinate at that index should be removed,
 * or 1 if the coordinate at that index should be kept.
 */
export type ThinnedMask = Uint8Array
export function thinPointsMask (coordinates: Float64Array, distance: number): ThinnedMask {
  const neighborIndices = allNearestNeighbors(coordinates, distance)
  return thinPointsByMaxNeighbors(neighborIndices)
}

export function thinPoints<T> (
  data: ArrayLike<T>,
  distance: number,
  getPosition: (item: T, array: [x: number, y: number]) => undefined,
) {
  const coordinates = flattenCoordinates(data, getPosition)
  const mask = thinPointsMask(coordinates, distance)

  const output = []
  for (let i = 0; i < data.length; i += 1) {
    if (mask[i]) {
      output.push(data[i])
    }
  }
  return output
}

/**
 * Build a coordinates array from an input array.
 */
export function flattenCoordinates<T> (
  data: ArrayLike<T>,
  getPosition: (item: T, array: [x: number, y: number]) => undefined,
): Float64Array {
  const coordinates = new Float64Array(data.length * 2)
  const position: [x: number, y: number] = [0, 0]
  for (let i = 0; i < data.length; i += 1) {
    getPosition(data[i], position)
    coordinates[i * 2] = position[0]
    coordinates[i * 2 + 1] = position[1]
  }
  return coordinates
}

/** A simple Set that allows indexed access and O(1) element swap-removal. */
class IndexSet<T> {
  // NOTE: This could be an array because we know we're working with neighbour indices
  // But it's by far not the slowest part of the algorithm, so :shrug:
  #indices = new Map<T, number>()
  #entries: T[] = []

  push (value: T) {
    if (this.#indices.has(value)) {
      throw new RangeError('duplicate value not allowed')
    }
    this.#indices.set(value, this.#entries.length)
    this.#entries.push(value)
  }

  pop () {
    const value = this.#entries.pop()
    if (value != null) {
      this.#indices.delete(value)
    }

    return value
  }

  swapRemove (value: T) {
    const index = this.#indices.get(value)
    if (index != null) {
      this.#indices.delete(value)
      const lastValue = this.#entries.pop()!
      // If we didn't pop our desired element, we have to overwrite the removed value and index
      if (index < this.#entries.length) {
        this.#entries[index] = lastValue
        this.#indices.set(lastValue, index)
      }
    }
  }

  get length () {
    return this.#entries.length
  }
}

type NeighborIndices = number[][]
function allNearestNeighbors (coordinates: Float64Array, distance: number): NeighborIndices {
  assert(coordinates.length % 2 === 0)

  const l = coordinates.length / 2

  const bush = new KDBush(l)
  for (let i = 0; i < l; i += 1) {
    bush.add(coordinates[i * 2], coordinates[i * 2 + 1])
  }
  bush.finish()

  const neighbors = []
  for (let i = 0; i < l; i += 1) {
    const x = coordinates[i * 2]
    const y = coordinates[i * 2 + 1]
    neighbors.push(geoknn(bush, x, y, Infinity, distance,
      // Don't count current point as a neighbour
      (candidate) => candidate !== i))
  }

  return neighbors
}

/** Returns the maximum value in the array. */
function max (array: ArrayLike<number>) {
  let max = 0
  for (let i = 0; i < array.length; i += 1) {
    const value = array[i]!
    if (value > max) {
      max = value
    }
  }
  return max
}

/** Thins points by deleting the ones with the most neighbours until no point has neighbours left. */
function thinPointsByMaxNeighbors (neighborIndices: NeighborIndices): ThinnedMask {
  const keptPoints = new Uint8Array(neighborIndices.length)
  keptPoints.fill(1)
  const neighborCounts = Uint32Array.from(neighborIndices, (array) => array.length)
  let maxNeighbors = max(neighborCounts)

  // We drain the whole thing on each iteration so we can reuse it
  const pointsToRemove = new IndexSet<number>()

  while (maxNeighbors > 0) {
    assert(pointsToRemove.length === 0)

    for (let n = 0; n < neighborCounts.length; n += 1) {
      if (neighborCounts[n]! === maxNeighbors) {
        pointsToRemove.push(n)
      }
    }

    while (pointsToRemove.length > 0) {
      // We'll have at least one element
      // Always popping the final element may bias results ... can we do it differently?
      const pointToRemove = pointsToRemove.pop()!

      neighborCounts[pointToRemove] = 0
      for (const neighborIndex of neighborIndices[pointToRemove]!) {
        if (neighborCounts[neighborIndex]! > 0) {
          neighborCounts[neighborIndex]! -= 1
        }
        // If this neighbour also had the max number of neighbours,
        // we should also remove it from consideration for now
        pointsToRemove.swapRemove(neighborIndex)
      }
      keptPoints[pointToRemove] = 0
    }

    maxNeighbors = max(neighborCounts)
  }

  return keptPoints
}

function assert (value: boolean) {
  if (!value) throw new Error('Assertion failed')
}
