export function SaudeTab({ form, isReadOnly, onChangeSaude }) {
  return <>
    <strong className="section-title">Condição de Saúde</strong>
    <div className="form-row">
      <div className="field"><label>Tem direito a Assistência Médica? Qual?</label><input value={form.condicao_saude?.assistencia_medica || ''} onChange={(e) => onChangeSaude('assistencia_medica', e.target.value)} disabled={isReadOnly} /></div>
      <div className="field"><label>Tem algum problema de saúde? Qual?</label><input value={form.condicao_saude?.problema_saude || ''} onChange={(e) => onChangeSaude('problema_saude', e.target.value)} disabled={isReadOnly} /></div>
    </div>
    <div className="form-row">
      <div className="field"><label>Tem algum tipo de alergia? A que?</label><input value={form.condicao_saude?.alergia || ''} onChange={(e) => onChangeSaude('alergia', e.target.value)} disabled={isReadOnly} /></div>
      <div className="field"><label>Toma algum medicamento? Qual?</label><input value={form.condicao_saude?.medicamento || ''} onChange={(e) => onChangeSaude('medicamento', e.target.value)} disabled={isReadOnly} /></div>
    </div>
    <div className="form-row">
      <div className="field"><label>Doenças que já teve</label><input value={form.condicao_saude?.doencas_anteriores || ''} onChange={(e) => onChangeSaude('doencas_anteriores', e.target.value)} disabled={isReadOnly} /></div>
      <div className="field"><label>Já teve alguma fratura?</label><input value={form.condicao_saude?.fratura || ''} onChange={(e) => onChangeSaude('fratura', e.target.value)} disabled={isReadOnly} /></div>
    </div>
    <div className="form-row">
      <div className="field"><label>Passou por alguma cirurgia?</label><input value={form.condicao_saude?.cirurgia || ''} onChange={(e) => onChangeSaude('cirurgia', e.target.value)} disabled={isReadOnly} /></div>
      <div className="field"><label>É portador de alguma deficiência? Qual?</label><input value={form.condicao_saude?.deficiencia || ''} onChange={(e) => onChangeSaude('deficiencia', e.target.value)} disabled={isReadOnly} /></div>
    </div>
    <div className="field"><label>Observações</label><textarea rows={4} value={form.condicao_saude?.observacoes || ''} onChange={(e) => onChangeSaude('observacoes', e.target.value)} disabled={isReadOnly} /></div>
  </>
}
