export function ResponsavelTab({ form, isReadOnly, onChange, STATES, citiesResponsible, fieldErrors = {} }) {
  return <>
    <strong className="section-title">Identificação e Situação de Trabalho do Responsável (Pai, Mãe ou Outro)</strong>
    <div className="form-row form-row-3">
      <div className="field"><label>Nome</label><input value={form.responsible_name} onChange={(e) => onChange('responsible_name', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.responsible_name)} /></div>
      <div className="field"><label>Idade</label><input value={form.responsible_age} onChange={(e) => onChange('responsible_age', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.responsible_age)} /></div>
      <div className="field"><label>Sexo</label><select value={form.responsible_gender} onChange={(e) => onChange('responsible_gender', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.responsible_gender)}><option value="">Sexo</option><option>Masculino</option><option>Feminino</option></select></div>
    </div>
    <div className="form-row form-row-5">
      <div className="field"><label>Naturalidade</label><input value={form.responsible_birth_place} onChange={(e) => onChange('responsible_birth_place', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.responsible_birth_place)} /></div>
      <div className="field"><label>Estado Civil</label><select value={form.responsible_marital_status} onChange={(e) => onChange('responsible_marital_status', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.responsible_marital_status)}><option value="">Estado Civil</option><option value="Casado">Casado</option><option value="Solteiro">Solteiro</option><option value="Viuvo">Viúvo</option><option value="Separado">Separado</option></select></div>
      <div className="field"><label>Escolaridade</label><select value={form.responsible_education} onChange={(e) => onChange('responsible_education', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.responsible_education)}><option value="">Escolaridade</option><option>Não alfabetizado</option><option>Alfabetizado</option><option>Ensino Fundamental Incompleto</option><option>Ensino Fundamental Completo</option><option>Ensino Médio Incompleto</option><option>Ensino Médio Completo</option><option>Ensino Superior Incompleto</option><option>Ensino Superior Completo</option><option>Pós-graduação</option><option>Mestrado</option><option>Doutorado</option></select></div>
      <div className="field"><label>RG nº</label><input value={form.responsible_rg} onChange={(e) => onChange('responsible_rg', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.responsible_rg)} /></div>
      <div className="field"><label>Órgão Emissor/UF</label><input value={form.responsible_issuing_agency_uf} onChange={(e) => onChange('responsible_issuing_agency_uf', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.responsible_issuing_agency_uf)} /></div>
    </div>
    <div className="form-row form-row-3">
      <div className="field"><label>CPF</label><input value={form.responsible_cpf} onChange={(e) => onChange('responsible_cpf', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.responsible_cpf)} /></div>
      <div className="field"><label>Local de Trabalho</label><input value={form.responsible_workplace} onChange={(e) => onChange('responsible_workplace', e.target.value)} disabled={isReadOnly} /></div>
      <div className="field"><label>Renda Bruta Mensal R$</label><input value={form.responsible_income} onChange={(e) => onChange('responsible_income', e.target.value)} disabled={isReadOnly} /></div>
    </div>
    <div className="form-row form-row-4">
      <div className="field"><label>Estado</label><select value={form.responsible_state} onChange={(e) => onChange('responsible_state', e.target.value)} disabled={isReadOnly}><option value="">Estado</option>{STATES.map((s) => <option key={s.uf} value={s.uf}>{s.name}</option>)}</select></div>
      <div className="field"><label>Município</label><select value={form.responsible_city} onChange={(e) => onChange('responsible_city', e.target.value)} disabled={isReadOnly || !form.responsible_state}><option value="">Município</option>{citiesResponsible.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div className="field"><label>Telefone</label><input value={form.responsible_phone} onChange={(e) => onChange('responsible_phone', e.target.value)} disabled={isReadOnly} /></div>
      <div className="field"><label>Horário</label><input value={form.responsible_schedule} onChange={(e) => onChange('responsible_schedule', e.target.value)} maxLength={5} disabled={isReadOnly} /></div>
    </div>
    <div className="field"><label>Observação</label><textarea value={form.responsible_notes} onChange={(e) => onChange('responsible_notes', e.target.value)} rows={4} disabled={isReadOnly} /></div>
  </>
}
