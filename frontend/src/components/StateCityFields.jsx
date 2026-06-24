import { useEffect, useMemo, useState } from 'react'
import { getCitiesByState, STATES } from '../data/brLocations'

export function StateCityFields({
  stateValue,
  cityValue,
  onStateChange,
  onCityChange,
  stateLabel = 'Estado',
  cityLabel = 'Cidade',
  statePlaceholder = 'Selecione o Estado',
  cityPlaceholder = 'Selecione a Cidade',
  required = false,
  disabled = false,
  stateError,
  cityError,
}) {
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [cities, setCities] = useState([])

  const normalizedState = String(stateValue || '').trim().toUpperCase()

  useEffect(() => {
    if (!normalizedState) {
      setCities([])
      setLoadError('')
      setLoadingCities(false)
      return
    }

    setLoadingCities(true)
    setLoadError('')
    const timer = window.setTimeout(() => {
      try {
        setCities(getCitiesByState(normalizedState))
      } catch {
        setCities([])
        setLoadError('Não foi possível carregar as cidades.')
      } finally {
        setLoadingCities(false)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [normalizedState])

  const cityDisabled = disabled || !normalizedState || loadingCities || Boolean(loadError) || cities.length === 0
  const cityOptions = useMemo(() => cities, [cities])

  return (
    <>
      <div className="field">
        <label>{stateLabel}</label>
        <select
          value={stateValue || ''}
          onChange={(event) => onStateChange(event.target.value)}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(stateError)}
        >
          <option value="">{statePlaceholder}</option>
          {STATES.map((state) => (
            <option key={state.uf} value={state.uf}>{state.name} ({state.uf})</option>
          ))}
        </select>
        {stateError && <p className="error">{stateError}</p>}
      </div>

      <div className="field">
        <label>{cityLabel}</label>
        <select
          value={cityValue || ''}
          onChange={(event) => onCityChange(event.target.value)}
          required={required}
          disabled={cityDisabled}
          aria-invalid={Boolean(cityError)}
        >
          <option value="">
            {!normalizedState
              ? cityPlaceholder
              : loadingCities
                ? 'Carregando cidades...'
                : loadError || (cityOptions.length === 0 ? 'Nenhuma cidade encontrada' : cityPlaceholder)}
          </option>
          {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
        </select>
        {cityError && <p className="error">{cityError}</p>}
      </div>
    </>
  )
}
