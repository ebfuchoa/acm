export function SituacaoFamiliarTab({ form, isReadOnly, onChangeSituacaoFamiliar }) {
  return <>
    <div className="field">
      <label>Informações sobre a Situação Familiar</label>
      <textarea
        rows={6}
        value={form.situacao_familiar?.informacoes_situacao_familiar || ''}
        onChange={(e) => onChangeSituacaoFamiliar('informacoes_situacao_familiar', e.target.value)}
        disabled={isReadOnly}
      />
    </div>
    <div className="field">
      <label>Por que você acha importante seu (sua) filho(a) participar do projeto? Quais são as suas expectativas?</label>
      <textarea
        rows={6}
        value={form.situacao_familiar?.expectativas_participacao_projeto || ''}
        onChange={(e) => onChangeSituacaoFamiliar('expectativas_participacao_projeto', e.target.value)}
        disabled={isReadOnly}
      />
    </div>
  </>
}
