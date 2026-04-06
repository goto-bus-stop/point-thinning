import * as fs from 'node:fs'
import { test } from 'node:test'
import { flattenCoordinates, thinPoints, thinPointsMask } from './index.ts'
import csv from 'papaparse'

const caretta = csv.parse<{
  decimalLongitude: number,
  decimalLatitude: number,
}>(fs.readFileSync('data/caretta.csv', 'utf8'), {
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
})

test('flattenCoordinates', (t: test.TestContext) => {
  const coordinates = flattenCoordinates(caretta.data.slice(0, 10), (row, position) => {
    position[0] = row.decimalLongitude
    position[1] = row.decimalLatitude
  })

  t.assert.strictEqual(coordinates.length, 20)
})

test('thinPointsMask', (t: test.TestContext) => {
  const coordinates = flattenCoordinates(caretta.data, (row, position) => {
    position[0] = row.decimalLongitude
    position[1] = row.decimalLatitude
  })
  t.assert.strictEqual(coordinates.length, caretta.data.length * 2)

  const mask = thinPointsMask(coordinates, 30)
  t.assert.strictEqual(mask.length, coordinates.length / 2)
  t.assert.ok(mask.includes(1), 'should have kept some points')
  t.assert.ok(mask.includes(0), 'should have got rid of some points')

  t.assert.snapshot(Array.from(mask))
})

test('caretta thinning', (t: test.TestContext) => {
  const thinned = thinPoints(caretta.data, 30, (row, position) => {
    position[0] = row.decimalLongitude
    position[1] = row.decimalLatitude
  })

  t.assert.ok(thinned.length < caretta.data.length, 'should have got rid of some points')

  t.assert.snapshot(thinned)
})
