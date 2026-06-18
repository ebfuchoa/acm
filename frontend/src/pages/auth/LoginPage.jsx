import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { saveAuth } from '../../auth'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginPage() {
  const navigate = useNavigate()
  const [units, setUnits] = useState([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [socialUnitId, setSocialUnitId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api('/autenticacao/unidades-sociais').then(setUnits).catch(() => setUnits([]))
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!emailRegex.test(email.trim())) return setError('Informe um e-mail valido.')
    if (!password.trim()) return setError('Informe a senha.')
    try {
      const payload = { email: email.trim(), password }
      if (socialUnitId) payload.social_unit_id = Number(socialUnitId)
      const auth = await api('/autenticacao/entrar', { method: 'POST', body: JSON.stringify(payload) })
      saveAuth(auth)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main className="login-page">
      <form className="card login-card" onSubmit={onSubmit}>
        <h2>Acesso ao sistema</h2>
        {error && <p className="error">{error}</p>}
        <div className="field">
          <label>E-mail</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Senha</label>
          <div className="password-field">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.4 5.2A10.7 10.7 0 0 1 12 5c5.3 0 9.3 4.6 10 7-.3 1.1-1.3 2.8-2.9 4.3" />
                  <path d="M6.6 6.6C4.6 8 3.3 10 2 12c.7 2.4 4.7 7 10 7 1.4 0 2.7-.2 3.8-.7" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="field">
          <label>Unidade Social</label>
          <select value={socialUnitId} onChange={(e) => setSocialUnitId(e.target.value)}>
            <option value="">Selecione</option>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
        </div>
        <div className="form-actions">
          <button type="submit">Entrar</button>
        </div>
      </form>
    </main>
  )
}


