export function EnderecoResidencialTab({ form, isReadOnly, onChange, fieldErrors = {} }) {
  return <>
    <div className="form-row form-row-3">
      <div className="field"><label>Rua/Av./Trav./Praça</label><input value={form.residential_street} onChange={(e) => onChange('residential_street', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.residential_street)} /></div>
      <div className="field"><label>Nº</label><input value={form.residential_number} onChange={(e) => onChange('residential_number', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.residential_number)} /></div>
      <div className="field"><label>Complemento</label><input value={form.residential_complement} onChange={(e) => onChange('residential_complement', e.target.value)} disabled={isReadOnly} /></div>
    </div>
    <div className="form-row form-row-4">
      <div className="field"><label>Bairro</label><input value={form.residential_district} onChange={(e) => onChange('residential_district', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.residential_district)} /></div>
      <div className="field"><label>Município</label><input value={form.residential_city} onChange={(e) => onChange('residential_city', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.residential_city)} /></div>
      <div className="field"><label>CEP</label><input value={form.residential_zip_code} onChange={(e) => onChange('residential_zip_code', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.residential_zip_code)} /></div>
      <div className="field"><label>Telefone</label><input value={form.residential_phone} onChange={(e) => onChange('residential_phone', e.target.value)} required disabled={isReadOnly} aria-invalid={Boolean(fieldErrors.residential_phone)} /></div>
    </div>
    <div className="field"><label>Endereços e telefones para contato com a família</label><textarea value={form.residential_contact_notes} onChange={(e) => onChange('residential_contact_notes', e.target.value)} rows={4} disabled={isReadOnly} /></div>
  </>
}
