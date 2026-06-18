export function EscolaridadeTab({ form, isReadOnly, onChange, fieldErrors = {} }) {
  return <>
    <div className="form-row form-row-3">
      <div className="field"><label>Série</label><input value={form.school_grade} onChange={(e) => onChange('school_grade', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.school_grade)} /></div>
      <div className="field"><label>Ensino</label><select value={form.school_education_level} onChange={(e) => onChange('school_education_level', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.school_education_level)}><option value="">Ensino</option><option value="Fundamental">Fundamental</option><option value="Medio">Médio</option></select></div>
      <div className="field"><label>Está Cursando?</label><select value={form.school_is_currently_enrolled} onChange={(e) => onChange('school_is_currently_enrolled', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.school_is_currently_enrolled)}><option value="">Está Cursando?</option><option>Sim</option><option>Não</option></select></div>
    </div>
    <div className="form-row">
      <div className="field"><label>Nome da Escola</label><input value={form.school_name} onChange={(e) => onChange('school_name', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.school_name)} /></div>
      <div className="field"><label>Tipo</label><select value={form.school_type} onChange={(e) => onChange('school_type', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.school_type)}><option value="">Tipo</option><option>Municipal</option><option>Estadual</option><option>Particular</option></select></div>
    </div>
    <div className="form-row form-row-3">
      <div className="field"><label>É bolsista?</label><select value={form.school_is_scholarship_holder} onChange={(e) => onChange('school_is_scholarship_holder', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.school_is_scholarship_holder)}><option value="">É bolsista?</option><option>Sim</option><option>Não</option></select></div>
      <div className="field"><label>Qual o percentual %?</label><input value={form.school_scholarship_percentage} onChange={(e) => onChange('school_scholarship_percentage', e.target.value)} disabled={isReadOnly || form.school_is_scholarship_holder !== 'Sim'} /></div>
      <div className="field"><label>Horário da Escola</label><input value={form.school_schedule} onChange={(e) => onChange('school_schedule', e.target.value)} maxLength={5} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.school_schedule)} /></div>
    </div>
    <div className="field"><label>Observação</label><textarea value={form.school_notes} onChange={(e) => onChange('school_notes', e.target.value)} rows={4} disabled={isReadOnly} /></div>
  </>
}
