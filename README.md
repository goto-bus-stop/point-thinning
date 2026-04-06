# point-thinning

A geographical 2D point thinning algorithm for JavaScript, using the distance-based technique used in [Jorge Mestre Tomás]'s [GeoThinneR].

[Jorge Mestre Tomás]: https://github.com/jmestret
[GeoThinneR]: https://github.com/jmestret/GeoThinneR

The basic idea behind GeoThinner's distance-based technique is to build a neighbours index: for each point, it contains the other points within the requested distance.

Then, you remove the point(s) with the most neighbours, until there are no points left that have any neighbours within the requested distance.

**Note**: this library currently does _not_ use multiple random trials to produce an optimal result. I've found this to make a minimal difference in practice on my data sets (in the order of tens of points on inputs with 100K points), and I favour a deterministic result over an optimal one.

**Note**: this library only supports great-circle distances currently. Supporting non-geographical coordinates is a plausible future extension.

**Note**: this library considers all points equally important, meaning they are thinned exclusively based on position. Scoring point priority/importance is a plausible future extension.

## Install

```
npm install point-thinning
```

## Usage

Return a subset of an array of points of any data type:

```ts
import { thinPoints } from 'point-thinning'

// Assuming a collection of GeoJSON points...
declare const data: GeoJSON.FeatureCollection<GeoJSON.Point>

const thinned = thinPoints(
  data.features,
  // distance in kilometres
  5,
  // tell it how to read the position of each element
  (point, position) => {
    position[0] = point.coordinates[0]
    position[1] = point.coordinates[1]
  },
)
```

Returning a boolean mask indicating if each point is to be kept or removed:

```ts
import { flattenCoordinates, thinPointsMask } from 'point-thinning'

// Assuming a collection of GeoJSON points...
declare const data: GeoJSON.FeatureCollection<GeoJSON.Point>

// If you already have a Float64Array of [x, y] pairs, you can use it directly.
// Otherwise, you can build one with this helper function...
const coordinates = flattenCoordinates(data.features, (point, position) => {
  position[0] = point.coordinates[0]
  position[1] = point.coordinates[1]
})

const keptPointsMask = thinPointsMask(coordinates, 5) // distance in kilometres

// Now we can check the mask if points should be kept,
// eg to partition points instead of discarding
const keptPoints = []
const removedPoints = []
for (let i = 0; i < data.features.length; i += 1) {
  if (keptPointsMask[i] !== 0) {
    keptPoints.push(data.features[i])
  } else {
    removedPoints.push(data.features[i])
  }
}
```

## License

ⓒ Renée Kooi · Dual-licensed under [Apache-2.0](./LICENSE-APACHE) or [MIT](./LICENSE-MIT) at your option.

`data/caretta.csv` is from: GBIF.org (07 February 2025) GBIF Occurrence Download https://doi.org/10.15468/dl.9jcjrm
