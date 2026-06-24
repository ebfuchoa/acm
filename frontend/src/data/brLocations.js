import rawCities from 'cidades-estados-brasil-json/Cidades.json'
import rawStates from 'cidades-estados-brasil-json/Estados.json'

function normalizeText(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function normalizeUf(value) {
  return String(value || '').trim().toUpperCase()
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

export const STATES = rawStates
  .map((state) => ({
    id: String(state.ID),
    uf: normalizeUf(state.Sigla),
    name: String(state.Nome || '').trim(),
  }))
  .sort((a, b) => collator.compare(a.name, b.name))

const stateIdByUf = STATES.reduce((acc, state) => {
  acc[state.uf] = state.id
  return acc
}, {})

export const CITIES_BY_STATE = STATES.reduce((acc, state) => {
  const stateId = stateIdByUf[state.uf]
  const cityMap = new Map()
  rawCities
    .filter((city) => String(city.Estado) === stateId)
    .forEach((city) => {
      const cityName = String(city.Nome || '').trim()
      if (!cityName) return
      cityMap.set(normalizeText(cityName), cityName)
    })
  acc[state.uf] = Array.from(cityMap.values()).sort(collator.compare)
  return acc
}, {})

export function getCitiesByState(uf) {
  return CITIES_BY_STATE[normalizeUf(uf)] || []
}
