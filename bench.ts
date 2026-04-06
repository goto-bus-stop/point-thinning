import * as fs from 'node:fs'
import { Bench } from 'tinybench'
import csv from 'papaparse'
import { flattenCoordinates, thinPointsMask } from './index.ts'

const hundredK = csv.parse<[lat: number, lng: number]>(fs.readFileSync('data/100k.csv', 'utf8'), {
  dynamicTyping: true,
  skipEmptyLines: true,
}).data

const hundredKFlat = flattenCoordinates(hundredK, (row, position) => {
  position[0] = row[1]
  position[1] = row[0]
})

const slovenia = csv.parse<[lat: number, lng: number]>(fs.readFileSync('data/slovenia.csv', 'utf8'), {
  dynamicTyping: true,
  skipEmptyLines: true,
}).data

const sloveniaFlat = flattenCoordinates(slovenia, (row, position) => {
  position[0] = row[1]
  position[1] = row[0]
})

const bench100K = new Bench({
  name: '100K',
  warmupIterations: 1,
  iterations: 1,
})

bench100K.add('many points and large distance', () => {
  const _mask = thinPointsMask(hundredKFlat, 50 /* km */)
})

const benchSlovenia = new Bench({
  name: 'Slovenia',
  warmupIterations: 1,
  iterations: 1,
})

benchSlovenia.add('dense points and small distance', () => {
  const _mask = thinPointsMask(sloveniaFlat, 1 /* km */)
})

benchSlovenia.add('dense points and large distance', () => {
  const _mask = thinPointsMask(sloveniaFlat, 5 /* km */)
})

bench100K.runSync()
console.log(bench100K.name)
console.table(bench100K.table())

benchSlovenia.runSync()
console.log(benchSlovenia.name)
console.table(benchSlovenia.table())
