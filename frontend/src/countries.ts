import countriesTopo from 'world-atlas/countries-110m.json'
import { feature } from 'topojson-client'

// Country polygons (same world-atlas source as the globe's land) used to work out
// which country a flight is currently over, via point-in-polygon on lat/lon.
type Ring = number[][]
type Country = { name: string; polygons: Ring[][] }

const fc = feature(countriesTopo as any, (countriesTopo as any).objects.countries) as any

const COUNTRIES: Country[] = fc.features.map((f: any) => {
  const g = f.geometry
  // normalise Polygon -> single-entry MultiPolygon so every country is Ring[][]
  const polygons: Ring[][] = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  return { name: f.properties.name as string, polygons }
})

// Even-odd ray cast across all rings of one polygon (handles holes).
function inPolygon(lon: number, lat: number, polygon: Ring[]): boolean {
  let inside = false
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      const intersects =
        yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
      if (intersects) inside = !inside
    }
  }
  return inside
}

// Name of the country at (lat, lon), or null over open water. (The low-res
// boundaries can be slightly off right at coastlines / the antimeridian.)
export function countryAt(lat: number, lon: number): string | null {
  for (const country of COUNTRIES) {
    for (const polygon of country.polygons) {
      if (inPolygon(lon, lat, polygon)) return country.name
    }
  }
  return null
}
