import { api } from '../api/client'

export function listManagedUnits() {
  return api('/gestao-unidades')
}

export function getManagedUnit(unitId) {
  return api(`/gestao-unidades/${unitId}`)
}
