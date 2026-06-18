import { DatePickerBr } from '../../../../components/DatePickerBr'

export function IdentificacaoTab({ form, isReadOnly, onChange, fieldErrors = {} }) {
  return <>
    <div className="field"><label>Nome</label><input value={form.name} onChange={(e) => onChange('name', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.name)} /></div>
    <div className="form-row form-row-4">
      <div className="field">
        <DatePickerBr
          label="Data de nascimento"
          value={form.birth_date}
          onChange={(v) => onChange('birth_date', v)}
          required
          disabled={isReadOnly}
          disableFuture
        />
      </div>
      <div className="field"><label>Idade</label><input value={form.age} onChange={(e) => onChange('age', e.target.value)} disabled /></div>
      <div className="field"><label>Naturalidade</label><input value={form.birth_place} onChange={(e) => onChange('birth_place', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.birth_place)} /></div>
      <div className="field"><label>Sexo</label><select value={form.gender} onChange={(e) => onChange('gender', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.gender)}><option value="">Sexo</option><option>Masculino</option><option>Feminino</option></select></div>
    </div>
    <div className="form-row form-row-4">
      <div className="field"><label>RG</label><input value={form.rg} onChange={(e) => onChange('rg', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.rg)} /></div>
      <div className="field"><label>UF</label><input value={form.rg_uf} onChange={(e) => onChange('rg_uf', e.target.value)} maxLength={2} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.rg_uf)} /></div>
      <div className="field"><label>NIS</label><input value={form.nis_number} onChange={(e) => onChange('nis_number', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.nis_number)} /></div>
      <div className="field"><label>Turno</label><select value={form.shift} onChange={(e) => onChange('shift', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.shift)}><option value="">Turno</option><option>Manhã</option><option>Tarde</option></select></div>
    </div>
    <strong className="section-title">Filiação</strong>
    <div className="field"><label>Nome do Pai</label><input value={form.father_name} onChange={(e) => onChange('father_name', e.target.value)} disabled={isReadOnly} /></div>
    <div className="field"><label>Nome da Mãe</label><input value={form.mother_name} onChange={(e) => onChange('mother_name', e.target.value)} disabled={isReadOnly} /></div>
  </>
}
