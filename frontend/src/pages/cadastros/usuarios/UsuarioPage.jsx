import { useEffect, useMemo, useState } from 'react'
import { api, apiRaw } from '../../../api/client'
import { CadastroListView } from '../../../components/CadastroListView'
import { brToIsoDate, isoToBrDate, maskDateBr } from '../../../utils/dateBr'
import { maskCurrencyBr, maskTime, parseCurrencyBr } from '../../../utils/formattersBr'
import { getAuth } from '../../../auth'
import { SaudeTab } from './tabs/SaudeTab'
import { SituacaoFamiliarTab } from './tabs/SituacaoFamiliarTab'
import { ParecerTab } from './tabs/ParecerTab'
import { IdentificacaoTab } from './tabs/IdentificacaoTab'
import { ResponsavelTab } from './tabs/ResponsavelTab'
import { EnderecoResidencialTab } from './tabs/EnderecoResidencialTab'
import { EscolaridadeTab } from './tabs/EscolaridadeTab'
import { SituacaoTab } from './tabs/SituacaoTab'
import { ComposicaoTab } from './tabs/ComposicaoTab'

const tabs = ['Identificação', 'Responsável', 'Endereço Residencial', 'Escolaridade', 'Composição', 'Situação', 'Saúde', 'Situação Familiar', 'Parecer']
const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'age', label: 'Idade' },
  { key: 'nis_number', label: 'NIS' },
  { key: 'shift', label: 'Turno' },
  { key: 'group_name', label: 'Grupo', render: (row) => row.group_name || '-' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => {
      const isActive = String(row.status || '').toLowerCase() === 'ativo'
      return (
        <span className="status-indicator" title={isActive ? 'Ativo' : 'Inativo'} aria-label={isActive ? 'Ativo' : 'Inativo'}>
          <span
            className={`status-dot ${isActive ? 'is-active' : 'is-inactive'}`}
            aria-hidden="true"
          />
        </span>
      )
    },
  },
]

const optionalFields = new Set([
  'father_name',
  'mother_name',
  'responsible_notes',
  'responsible_workplace',
  'responsible_income',
  'responsible_state',
  'responsible_city',
  'responsible_phone',
  'responsible_schedule',
  'residential_complement',
  'residential_contact_notes',
  'school_scholarship_percentage',
  'school_notes',
])

const fieldLabels = {
  father_name: 'Nome do Pai',
  mother_name: 'Nome da Mãe',
  responsible_notes: 'Observação (Responsável)',
  responsible_workplace: 'Local de Trabalho',
  responsible_income: 'Renda Bruta Mensal R$',
  responsible_state: 'Estado (Responsável)',
  responsible_city: 'Município (Responsável)',
  responsible_phone: 'Telefone (Responsável)',
  responsible_schedule: 'Horário (Responsável)',
  residential_complement: 'Complemento',
  residential_contact_notes: 'Contato com a Família',
  school_scholarship_percentage: 'Qual o percentual %?',
  school_notes: 'Observação (Escolaridade)',
}

const fieldTabIndex = {
  name: 0, birth_date: 0, birth_place: 0, gender: 0, rg: 0, rg_uf: 0, nis_number: 0, shift: 0,
  responsible_name: 1, responsible_age: 1, responsible_gender: 1, responsible_birth_place: 1,
  responsible_marital_status: 1, responsible_education: 1, responsible_rg: 1, responsible_issuing_agency_uf: 1,
  responsible_cpf: 1,
  residential_street: 2, residential_number: 2, residential_district: 2, residential_city: 2, residential_zip_code: 2, residential_phone: 2,
  school_grade: 3, school_education_level: 3, school_is_currently_enrolled: 3, school_name: 3, school_type: 3, school_is_scholarship_holder: 3, school_schedule: 3,
  composicao_familiar: 4,
}

const emptyForm = {
  unit_id: '', name: '', age: '', birth_date: '', birth_place: '', gender: '', rg: '', rg_uf: '', nis_number: '', shift: '', father_name: '', mother_name: '',
  responsible_name: '', responsible_age: '', responsible_gender: '', responsible_birth_place: '', responsible_marital_status: '',
  responsible_education: '', responsible_rg: '', responsible_issuing_agency_uf: '', responsible_cpf: '', responsible_workplace: '',
  responsible_income: '', responsible_state: '', responsible_city: '', responsible_phone: '', responsible_schedule: '', responsible_notes: '',
  residential_street: '', residential_number: '', residential_complement: '', residential_district: '', residential_city: '', residential_zip_code: '',
  residential_phone: '', residential_contact_notes: '',
  school_grade: '', school_education_level: '', school_is_currently_enrolled: '', school_name: '', school_type: '',
  school_is_scholarship_holder: '', school_scholarship_percentage: '', school_schedule: '', school_notes: '',
  composicao_familiar: [],
  situacao_habitacional: {
    tipo_habitacao: '',
    tipo_habitacao_outro: '',
    ocupacao: '',
    valor_imovel_em_pagamento: '',
    valor_aluguel: '',
    ocupacao_outro: '',
    numero_comodos: '',
    observacoes: '',
  },
  condicao_saude: {
    assistencia_medica: '',
    problema_saude: '',
    alergia: '',
    medicamento: '',
    doencas_anteriores: '',
    fratura: '',
    cirurgia: '',
    deficiencia: '',
    observacoes: '',
  },
  situacao_familiar: {
    informacoes_situacao_familiar: '',
    expectativas_participacao_projeto: '',
  },
  parecer: {
    parecer: '',
  },
}

const maskPhone = (v) => { const d = v.replace(/\D/g, '').slice(0, 11); if (d.length <= 2) return `(${d}`; if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` }
const maskCep = (v) => { const d = v.replace(/\D/g, '').slice(0, 8); return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}` }
const maskCpf = (v) => { const d = v.replace(/\D/g, '').slice(0, 11); if (d.length <= 3) return d; if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`; if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`; return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` }
const maskNis = (v) => { const d = v.replace(/\D/g, '').slice(0, 11); if (d.length <= 3) return d; if (d.length <= 8) return `${d.slice(0, 3)}.${d.slice(3)}`; if (d.length <= 10) return `${d.slice(0, 3)}.${d.slice(3, 8)}.${d.slice(8)}`; return `${d.slice(0, 3)}.${d.slice(3, 8)}.${d.slice(8, 10)}-${d.slice(10)}` }
const normalizeToken = (v) => String(v ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
const personName = (t) => /^[\p{L}\s.'-]+$/u.test(t)
const placeName = (t) => /^[\p{L}\s.'/-]+$/u.test(t)
const calcAge = (dBr) => { const iso = brToIsoDate(dBr); if (!iso) return ''; const b = new Date(`${iso}T00:00:00`); const t = new Date(); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a -= 1; return a >= 0 ? String(a) : '' }
const validCPF = (cpf) => { const d = cpf.replace(/\D/g, ''); if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false; let s = 0; for (let i = 0; i < 9; i++) s += Number(d[i]) * (10 - i); let r = (s * 10) % 11; if (r === 10) r = 0; if (r !== Number(d[9])) return false; s = 0; for (let i = 0; i < 10; i++) s += Number(d[i]) * (11 - i); r = (s * 10) % 11; if (r === 10) r = 0; return r === Number(d[10]) }

export function UsuarioPage() {
  const auth = getAuth()
  const loggedUnitId = auth?.social_unit_id ? Number(auth.social_unit_id) : null
  const [mode, setMode] = useState('list')
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ativo')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [tab, setTab] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [composicaoDraft, setComposicaoDraft] = useState({
    nome: '', parentesco: '', sexo: '', idade: '', naturalidade: '', estado_civil: '', escolaridade: '',
  })
  const [composicaoEditIndex, setComposicaoEditIndex] = useState(null)
  const [isComposicaoModalOpen, setIsComposicaoModalOpen] = useState(false)

  useEffect(() => {
    function showList() {
      setMode('list')
      setEditingId(null)
      setIsReadOnly(false)
      setForm(emptyForm)
      setTab(0)
      setFieldErrors({})
      setSubmitAttempted(false)
      setComposicaoDraft({ nome: '', parentesco: '', sexo: '', idade: '', naturalidade: '', estado_civil: '', escolaridade: '' })
      setComposicaoEditIndex(null)
      setIsComposicaoModalOpen(false)
      setError('')
      setMessage('')
    }
    window.addEventListener('usuarios:list', showList)
    return () => window.removeEventListener('usuarios:list', showList)
  }, [])

  async function loadUsers() { try { setUsers(await api(`/usuarios?status=${encodeURIComponent(statusFilter)}`)); setError('') } catch (err) { setError(err.message) } }
  useEffect(() => { loadUsers() }, [statusFilter])
  const filteredRows = useMemo(() => users.filter((r) => columns.some((c) => String(r[c.key] ?? '').toLowerCase().includes(search.toLowerCase()))), [users, search])

  function onChange(key, value) {
    let next = value
    if (key === 'birth_date') { const d = maskDateBr(value); setForm((p) => ({ ...p, birth_date: d, age: calcAge(d) })); return }
    if (key === 'responsible_state') { setForm((p) => ({ ...p, responsible_state: value, responsible_city: '' })); return }
    if (key === 'rg_uf') next = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
    if (key === 'responsible_phone' || key === 'residential_phone') next = maskPhone(value)
    if (key === 'residential_zip_code') next = maskCep(value)
    if (key === 'responsible_cpf') next = maskCpf(value)
    if (key === 'responsible_rg') next = value
    if (key === 'nis_number') next = maskNis(value)
    if (key === 'responsible_income') next = maskCurrencyBr(value)
    if (key === 'responsible_schedule' || key === 'school_schedule') next = maskTime(value)
    if (key === 'school_scholarship_percentage' || key === 'responsible_age' || key === 'age') next = value.replace(/\D/g, '')
    setForm((p) => ({ ...p, [key]: next }))
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const clean = { ...prev }
        delete clean[key]
        return clean
      })
    }
  }

  function onChangeComposicao(key, value) {
    const next = key === 'idade' ? value.replace(/\D/g, '') : value
    setComposicaoDraft((p) => ({ ...p, [key]: next }))
  }

  function onChangeSituacao(key, value) {
    setForm((p) => {
      const current = p.situacao_habitacional || {}
      let nextValue = value
      if (key === 'valor_imovel_em_pagamento' || key === 'valor_aluguel') nextValue = maskCurrencyBr(value)
      return { ...p, situacao_habitacional: { ...current, [key]: nextValue } }
    })
  }

  function onChangeSaude(key, value) {
    setForm((p) => ({ ...p, condicao_saude: { ...(p.condicao_saude || {}), [key]: value } }))
  }

  function onChangeSituacaoFamiliar(key, value) {
    setForm((p) => ({ ...p, situacao_familiar: { ...(p.situacao_familiar || {}), [key]: value } }))
  }

  function onChangeParecer(value) {
    setForm((p) => ({ ...p, parecer: { ...(p.parecer || {}), parecer: value } }))
  }

  function toggleSituacaoOption(groupKey, optionValue) {
    setForm((p) => {
      const current = p.situacao_habitacional || {}
      const same = current[groupKey] === optionValue
      const next = { ...current, [groupKey]: same ? '' : optionValue }
      if (groupKey === 'tipo_habitacao' && next[groupKey] !== 'Outro') next.tipo_habitacao_outro = ''
      if (groupKey === 'ocupacao') {
        if (next[groupKey] !== 'Própria, em pagamento') next.valor_imovel_em_pagamento = ''
        if (next[groupKey] !== 'Alugada') next.valor_aluguel = ''
        if (next[groupKey] !== 'Outro') next.ocupacao_outro = ''
      }
      return { ...p, situacao_habitacional: next }
    })
  }

  function limparDraftComposicao() {
    setComposicaoDraft({ nome: '', parentesco: '', sexo: '', idade: '', naturalidade: '', estado_civil: '', escolaridade: '' })
    setComposicaoEditIndex(null)
  }

  function abrirModalComposicao(index = null) {
    if (index == null) {
      limparDraftComposicao()
    } else {
      editarComposicao(index)
    }
    setIsComposicaoModalOpen(true)
  }

  function fecharModalComposicao() {
    setIsComposicaoModalOpen(false)
    limparDraftComposicao()
  }

  function adicionarComposicao() {
    const item = {
      nome: composicaoDraft.nome.trim(),
      parentesco: composicaoDraft.parentesco.trim(),
      sexo: composicaoDraft.sexo.trim(),
      idade: Number(composicaoDraft.idade),
      naturalidade: composicaoDraft.naturalidade.trim(),
      estado_civil: composicaoDraft.estado_civil.trim(),
      escolaridade: composicaoDraft.escolaridade.trim(),
    }
    if (!item.nome || !item.parentesco || !item.sexo || !item.idade || !item.naturalidade || !item.estado_civil || !item.escolaridade) {
      setError('Preencha todos os campos da composição familiar antes de adicionar.')
      return
    }
    if (composicaoEditIndex == null) {
      setForm((p) => ({ ...p, composicao_familiar: [...(p.composicao_familiar || []), item] }))
    } else {
      setForm((p) => ({
        ...p,
        composicao_familiar: (p.composicao_familiar || []).map((row, idx) => (idx === composicaoEditIndex ? item : row)),
      }))
    }
    fecharModalComposicao()
    setError('')
  }

  function editarComposicao(index) {
    const item = (form.composicao_familiar || [])[index]
    if (!item) return
    setComposicaoDraft({
      nome: item.nome ?? '',
      parentesco: item.parentesco ?? '',
      sexo: item.sexo ?? '',
      idade: String(item.idade ?? ''),
      naturalidade: item.naturalidade ?? '',
      estado_civil: item.estado_civil ?? '',
      escolaridade: item.escolaridade ?? '',
    })
    setComposicaoEditIndex(index)
  }

  function removerComposicao(index) {
    setForm((p) => ({ ...p, composicao_familiar: (p.composicao_familiar || []).filter((_, i) => i !== index) }))
  }

  function validate(f) {
    const e = {}
    Object.entries(f).forEach(([k, v]) => {
      if (k === 'unit_id' || optionalFields.has(k)) return
      if (!String(v ?? '').trim()) e[k] = 'Campo obrigatório.'
    })
    const birthIso = brToIsoDate(f.birth_date)
    if (f.birth_date && !birthIso) e.birth_date = 'Data deve estar no formato DD/MM/AAAA.'
    if (birthIso && new Date(`${birthIso}T00:00:00`) > new Date()) e.birth_date = 'Data de nascimento não pode estar no futuro.'
    if (f.age && calcAge(f.birth_date) !== String(f.age)) e.age = 'Idade incompatível com data de nascimento.'
    if (f.name && !personName(f.name)) e.name = 'Nome inválido.'
    if (f.birth_place && !placeName(f.birth_place)) e.birth_place = 'Naturalidade inválida.'
    if (f.father_name && !personName(f.father_name)) e.father_name = 'Nome do pai inválido.'
    if (f.mother_name && !personName(f.mother_name)) e.mother_name = 'Nome da mãe inválido.'
    if (f.responsible_name && !personName(f.responsible_name)) e.responsible_name = 'Nome inválido.'
    if (f.responsible_birth_place && !placeName(f.responsible_birth_place)) e.responsible_birth_place = 'Naturalidade inválida.'
    if (f.rg_uf && !/^[A-Z]{2}$/.test(f.rg_uf)) e.rg_uf = 'UF inválida.'
    if (f.nis_number && !/^\d{3}\.\d{5}\.\d{2}-\d$/.test(f.nis_number)) e.nis_number = 'NIS inválido.'
    if (f.shift && !['Manhã', 'Tarde'].includes(f.shift)) e.shift = 'Turno inválido.'
    if (f.responsible_rg && (f.responsible_rg.trim().length < 5 || f.responsible_rg.trim().length > 20)) e.responsible_rg = 'RG inválido.'
    if (f.responsible_cpf && (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(f.responsible_cpf) || !validCPF(f.responsible_cpf))) e.responsible_cpf = 'CPF inválido.'
    if (f.residential_zip_code && !/^\d{5}-\d{3}$/.test(f.residential_zip_code)) e.residential_zip_code = 'CEP inválido.'
    if (f.responsible_phone && !/^\(\d{2}\)\s\d{5}-\d{4}$/.test(f.responsible_phone)) e.responsible_phone = 'Telefone inválido.'
    if (f.residential_phone && !/^\(\d{2}\)\s\d{5}-\d{4}$/.test(f.residential_phone)) e.residential_phone = 'Telefone inválido.'
    if (f.responsible_schedule && !/^([01]\d|2[0-3]):[0-5]\d$/.test(f.responsible_schedule)) e.responsible_schedule = 'Use HH:MM.'
    if (f.school_schedule && !/^([01]\d|2[0-3]):[0-5]\d$/.test(f.school_schedule)) e.school_schedule = 'Use HH:MM.'
    if (String(f.school_scholarship_percentage ?? '').trim()) {
      const p = Number(f.school_scholarship_percentage)
      if (p < 0 || p > 100) e.school_scholarship_percentage = 'Percentual deve ser entre 0 e 100.'
    }
    if (!Array.isArray(f.composicao_familiar) || f.composicao_familiar.length === 0) {
      e.composicao_familiar = 'Adicione ao menos um integrante na composição familiar.'
    }
    ;(f.composicao_familiar || []).forEach((item, i) => {
      if (!item.nome?.trim()) e[`composicao_${i}_nome`] = `Composição #${i + 1}: nome obrigatório.`
      if (!item.parentesco?.trim()) e[`composicao_${i}_parentesco`] = `Composição #${i + 1}: parentesco obrigatório.`
      if (!item.sexo?.trim()) e[`composicao_${i}_sexo`] = `Composição #${i + 1}: sexo obrigatório.`
      if (!item.idade || Number(item.idade) <= 0) e[`composicao_${i}_idade`] = `Composição #${i + 1}: idade inválida.`
      if (!item.naturalidade?.trim()) e[`composicao_${i}_naturalidade`] = `Composição #${i + 1}: naturalidade obrigatória.`
      if (!item.estado_civil?.trim()) e[`composicao_${i}_estado_civil`] = `Composição #${i + 1}: estado civil obrigatório.`
      if (!item.escolaridade?.trim()) e[`composicao_${i}_escolaridade`] = `Composição #${i + 1}: escolaridade obrigatória.`
    })
    return e
  }

  function payload() {
    return {
      ...form,
      rg_uf: String(form.rg_uf ?? '').trim().toUpperCase(),
      shift: String(form.shift ?? '').trim(),
      birth_date: brToIsoDate(form.birth_date),
      unit_id: loggedUnitId,
      age: Number(form.age),
      responsible_age: Number(form.responsible_age),
      responsible_workplace: String(form.responsible_workplace ?? '').trim() || null,
      responsible_income: String(form.responsible_income ?? '').trim() ? parseCurrencyBr(form.responsible_income) : null,
      responsible_state: String(form.responsible_state ?? '').trim() || null,
      responsible_city: String(form.responsible_city ?? '').trim() || null,
      responsible_phone: String(form.responsible_phone ?? '').trim() || null,
      responsible_schedule: String(form.responsible_schedule ?? '').trim() || null,
      school_scholarship_percentage: form.school_is_scholarship_holder === 'Sim' ? Number(form.school_scholarship_percentage) : null,
      composicao_familiar: (form.composicao_familiar || []).map((item) => ({
        nome: String(item.nome ?? '').trim(),
        parentesco: String(item.parentesco ?? '').trim(),
        sexo: String(item.sexo ?? '').trim(),
        idade: Number(item.idade),
        naturalidade: String(item.naturalidade ?? '').trim(),
        estado_civil: String(item.estado_civil ?? '').trim(),
        escolaridade: String(item.escolaridade ?? '').trim(),
      })),
      situacao_habitacional: (() => {
        const s = form.situacao_habitacional || {}
        return {
          tipo_habitacao: s.tipo_habitacao || null,
          tipo_habitacao_outro: s.tipo_habitacao === 'Outro' ? (String(s.tipo_habitacao_outro ?? '').trim() || null) : null,
          ocupacao: s.ocupacao || null,
          valor_imovel_em_pagamento: s.ocupacao === 'Própria, em pagamento' ? parseCurrencyBr(s.valor_imovel_em_pagamento) : null,
          valor_aluguel: s.ocupacao === 'Alugada' ? parseCurrencyBr(s.valor_aluguel) : null,
          ocupacao_outro: s.ocupacao === 'Outro' ? (String(s.ocupacao_outro ?? '').trim() || null) : null,
          numero_comodos: s.numero_comodos || null,
          observacoes: String(s.observacoes ?? '').trim() || null,
        }
      })(),
      condicao_saude: (() => {
        const s = form.condicao_saude || {}
        return {
          assistencia_medica: String(s.assistencia_medica ?? '').trim() || null,
          problema_saude: String(s.problema_saude ?? '').trim() || null,
          alergia: String(s.alergia ?? '').trim() || null,
          medicamento: String(s.medicamento ?? '').trim() || null,
          doencas_anteriores: String(s.doencas_anteriores ?? '').trim() || null,
          fratura: String(s.fratura ?? '').trim() || null,
          cirurgia: String(s.cirurgia ?? '').trim() || null,
          deficiencia: String(s.deficiencia ?? '').trim() || null,
          observacoes: String(s.observacoes ?? '').trim() || null,
        }
      })(),
      situacao_familiar: (() => {
        const s = form.situacao_familiar || {}
        return {
          informacoes_situacao_familiar: String(s.informacoes_situacao_familiar ?? '').trim() || null,
          expectativas_participacao_projeto: String(s.expectativas_participacao_projeto ?? '').trim() || null,
        }
      })(),
      parecer: (() => {
        const s = form.parecer || {}
        return {
          parecer: String(s.parecer ?? '').trim() || null,
        }
      })(),
    }
  }

  async function save(ev) {
    ev.preventDefault(); setError(''); setMessage(''); setSubmitAttempted(true)
    if (!loggedUnitId) { setError('Não foi possível identificar a unidade social do usuário logado.'); return }
    const errs = validate(form); setFieldErrors(errs)
    if (Object.keys(errs).length > 0) {
      const firstField = Object.keys(errs)[0]
      if (fieldTabIndex[firstField] != null) setTab(fieldTabIndex[firstField])
      if (errs.composicao_familiar) setError('Existem campos inválidos na aba Composição. Revise antes de salvar.')
      else setError('Existem campos inválidos. Revise antes de salvar.')
      return
    }
    try {
      if (editingId) await api(`/usuarios/${editingId}`, { method: 'PUT', body: JSON.stringify(payload()) })
      else await api('/usuarios', { method: 'POST', body: JSON.stringify(payload()) })
      setForm(emptyForm); setEditingId(null); setIsReadOnly(false); setTab(0); setMode('list'); setMessage('Usuário salvo com sucesso.'); setSubmitAttempted(false); await loadUsers()
    } catch (err) { setError(err.message) }
  }

  async function onEdit(row, readOnly = false) {
    try {
      const u = await api(`/usuarios/${row.id}`)
      setForm({
        ...emptyForm,
        ...Object.fromEntries(Object.entries(u).map(([k, v]) => [k, v ?? ''])),
        responsible_marital_status: (() => {
          const t = normalizeToken(u.responsible_marital_status)
          if (t === 'viuvo') return 'Viuvo'
          if (t === 'casado') return 'Casado'
          if (t === 'solteiro') return 'Solteiro'
          if (t === 'separado') return 'Separado'
          return u.responsible_marital_status ?? ''
        })(),
        school_education_level: (() => {
          const t = normalizeToken(u.school_education_level)
          if (t === 'medio') return 'Medio'
          if (t === 'fundamental') return 'Fundamental'
          return u.school_education_level ?? ''
        })(),
        composicao_familiar: (u.composicao_familiar || []).map((item) => ({ ...item, idade: String(item.idade ?? '') })),
        situacao_habitacional: {
          tipo_habitacao: u.situacao_habitacional?.tipo_habitacao ?? '',
          tipo_habitacao_outro: u.situacao_habitacional?.tipo_habitacao_outro ?? '',
          ocupacao: u.situacao_habitacional?.ocupacao ?? '',
          valor_imovel_em_pagamento: u.situacao_habitacional?.valor_imovel_em_pagamento == null ? '' : Number(u.situacao_habitacional.valor_imovel_em_pagamento).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          valor_aluguel: u.situacao_habitacional?.valor_aluguel == null ? '' : Number(u.situacao_habitacional.valor_aluguel).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          ocupacao_outro: u.situacao_habitacional?.ocupacao_outro ?? '',
          numero_comodos: u.situacao_habitacional?.numero_comodos ?? '',
          observacoes: u.situacao_habitacional?.observacoes ?? '',
        },
        condicao_saude: {
          assistencia_medica: u.condicao_saude?.assistencia_medica ?? '',
          problema_saude: u.condicao_saude?.problema_saude ?? '',
          alergia: u.condicao_saude?.alergia ?? '',
          medicamento: u.condicao_saude?.medicamento ?? '',
          doencas_anteriores: u.condicao_saude?.doencas_anteriores ?? '',
          fratura: u.condicao_saude?.fratura ?? '',
          cirurgia: u.condicao_saude?.cirurgia ?? '',
          deficiencia: u.condicao_saude?.deficiencia ?? '',
          observacoes: u.condicao_saude?.observacoes ?? '',
        },
        situacao_familiar: {
          informacoes_situacao_familiar: u.situacao_familiar?.informacoes_situacao_familiar ?? '',
          expectativas_participacao_projeto: u.situacao_familiar?.expectativas_participacao_projeto ?? '',
        },
        parecer: {
          parecer: u.parecer?.parecer ?? '',
        },
        birth_date: isoToBrDate(u.birth_date),
        age: String(u.age ?? ''),
        responsible_age: String(u.responsible_age ?? ''),
        school_scholarship_percentage: u.school_scholarship_percentage == null ? '' : String(u.school_scholarship_percentage),
        responsible_income: u.responsible_income == null ? '' : Number(u.responsible_income).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      })
      setEditingId(u.id); setIsReadOnly(readOnly); setTab(0); setFieldErrors({}); setError(''); setMessage(''); setMode('form')
      setSubmitAttempted(false)
      limparDraftComposicao()
    } catch (err) {
      const details = Array.isArray(err?.details) ? err.details : []
      const backendErrors = {}
      details.forEach((item) => {
        const loc = Array.isArray(item?.loc) ? item.loc : []
        const fieldName = loc[loc.length - 1]
        if (typeof fieldName === 'string') backendErrors[fieldName] = item?.msg || 'Campo obrigatório.'
      })
      if (Object.keys(backendErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...backendErrors }))
        const firstField = Object.keys(backendErrors)[0]
        if (fieldTabIndex[firstField] != null) setTab(fieldTabIndex[firstField])
      }
      setError(err.message)
    }
  }

  async function onToggleStatus(row) {
    const isInactive = String(row.status || '').toLowerCase() === 'inativo'
    const confirmation = isInactive ? 'Confirma a ativação do usuário?' : 'Confirma a inativação do usuário?'
    if (!window.confirm(confirmation)) return
    try {
      if (isInactive) await api(`/usuarios/${row.id}/ativar`, { method: 'PATCH' })
      else await api(`/usuarios/${row.id}`, { method: 'DELETE' })
      await loadUsers()
      setMessage(isInactive ? 'Usuário ativado com sucesso.' : 'Usuário inativado com sucesso.')
    } catch (err) { setError(err.message) }
  }
  async function onPrint(row) {
    try {
      const response = await apiRaw(`/usuarios/${row.id}/ficha-matricula`)
      const bytes = await response.arrayBuffer()
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      setError(err.message)
    }
  }

  if (mode === 'form') {
    return <section>
      <h2>{isReadOnly ? 'Visualizar Usuário' : (editingId ? 'Editar Usuário' : 'Cadastrar Usuário')}</h2>
      {error && <p className="error">{error}</p>}
      <div className="tabs tabs-highlight">{tabs.map((t, i) => <button key={t} type="button" className={`tab-btn tab-highlight-btn ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>)}</div>
      <form onSubmit={save} className={`card ${submitAttempted ? 'was-validated' : ''}`} noValidate>
        {tab === 0 && <IdentificacaoTab form={form} isReadOnly={isReadOnly} onChange={onChange} fieldErrors={fieldErrors} />}
        {tab === 1 && <ResponsavelTab form={form} isReadOnly={isReadOnly} onChange={onChange} fieldErrors={fieldErrors} />}
        {tab === 2 && <EnderecoResidencialTab form={form} isReadOnly={isReadOnly} onChange={onChange} fieldErrors={fieldErrors} />}
        {tab === 3 && <EscolaridadeTab form={form} isReadOnly={isReadOnly} onChange={onChange} fieldErrors={fieldErrors} />}
        {tab === 6 && <SaudeTab form={form} isReadOnly={isReadOnly} onChangeSaude={onChangeSaude} />}
        {tab === 7 && <SituacaoFamiliarTab form={form} isReadOnly={isReadOnly} onChangeSituacaoFamiliar={onChangeSituacaoFamiliar} />}
        {tab === 8 && <ParecerTab form={form} isReadOnly={isReadOnly} onChangeParecer={onChangeParecer} />}
        {tab === 5 && <SituacaoTab form={form} isReadOnly={isReadOnly} onChangeSituacao={onChangeSituacao} toggleSituacaoOption={toggleSituacaoOption} />}
        {tab === 4 && <ComposicaoTab
          form={form}
          isReadOnly={isReadOnly}
          isComposicaoModalOpen={isComposicaoModalOpen}
          composicaoEditIndex={composicaoEditIndex}
          composicaoDraft={composicaoDraft}
          onChangeComposicao={onChangeComposicao}
          abrirModalComposicao={abrirModalComposicao}
          removerComposicao={removerComposicao}
          fecharModalComposicao={fecharModalComposicao}
          adicionarComposicao={adicionarComposicao}
        />}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => { setMode('list'); setEditingId(null); setIsReadOnly(false); setForm(emptyForm); setTab(0); setSubmitAttempted(false) }}>Voltar</button>
          {!isReadOnly && <button type="submit">Salvar</button>}
        </div>
      </form>
    </section>
  }

  return <>
    {message && <p className="success-message">{message}</p>}
    {error && <p className="error">{error}</p>}
    <CadastroListView
      title="Usuários"
      columns={columns}
      rows={filteredRows}
      searchTerm={search}
      onSearchChange={setSearch}
      renderAfterSearch={() => (
        <div className="search-filter-field usuarios-status-filter">
          <label>STATUS</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      )}
      onCadastrar={() => { setError(''); setMessage(''); setMode('form'); setEditingId(null); setIsReadOnly(false); setForm(emptyForm); setTab(0); setSubmitAttempted(false) }}
      renderActions={(row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="btn btn-ghost"
            title="Visualizar usuário"
            aria-label="Visualizar usuário"
            onClick={() => onEdit(row, true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M1 12C3.6 7.8 7.4 5.7 12 5.7C16.6 5.7 20.4 7.8 23 12C20.4 16.2 16.6 18.3 12 18.3C7.4 18.3 3.6 16.2 1 12Z" stroke="currentColor" strokeWidth="1.8"/>
              <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8"/>
            </svg>
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            title="Editar usuário"
            aria-label="Editar usuário"
            onClick={() => onEdit(row, false)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 17.25V21H6.75L17.8 9.95L14.05 6.2L3 17.25Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M13.2 7.05L16.95 10.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M18.85 8.9L15.1 5.15L16.9 3.35C17.4 2.85 18.2 2.85 18.7 3.35L20.65 5.3C21.15 5.8 21.15 6.6 20.65 7.1L18.85 8.9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          </button>
          {String(row.status || '').toLowerCase() === 'inativo' ? (
            <button
              type="button"
              className="btn btn-ghost"
              title="Ativar usuário"
              aria-label="Ativar usuário"
              onClick={() => onToggleStatus(row)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 11C11.2 11 13 9.2 13 7C13 4.8 11.2 3 9 3C6.8 3 5 4.8 5 7C5 9.2 6.8 11 9 11Z" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M3 21C3 17.7 5.7 15 9 15H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M18 14V22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M14 18H22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              title="Inativar usuário"
              aria-label="Inativar usuário"
              onClick={() => onToggleStatus(row)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 11C11.2 11 13 9.2 13 7C13 4.8 11.2 3 9 3C6.8 3 5 4.8 5 7C5 9.2 6.8 11 9 11Z" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M3 21C3 17.7 5.7 15 9 15H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M15 15L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M21 15L15 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            title="Imprimir usuário"
            aria-label="Imprimir usuário"
            onClick={() => onPrint(row)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 9V4H17V9" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <rect x="4" y="9" width="16" height="8" rx="2" stroke="currentColor" strokeWidth="1.8"/>
              <rect x="7" y="14" width="10" height="6" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M16.5 12H16.51" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}
    />
  </>
}





