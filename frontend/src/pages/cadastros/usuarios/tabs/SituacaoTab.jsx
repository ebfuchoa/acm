export function SituacaoTab({ form, isReadOnly, onChangeSituacao, toggleSituacaoOption }) {
  return <>
    <strong className="section-title">Situação Habitacional</strong>
    <div className="situacao-columns">
      <div className="situacao-group">
        <label className="situacao-group-title">Tipo de Habitação</label>
        <div className="checkbox-list">
          {['Casa', 'Apartamento', 'Outro'].map((opt) => (
            <div key={opt} className="checkbox-line">
              <label className="checkbox-item">
                <input type="checkbox" checked={form.situacao_habitacional?.tipo_habitacao === opt} onChange={() => toggleSituacaoOption('tipo_habitacao', opt)} disabled={isReadOnly} />
                <span>{opt === 'Outro' ? 'Outro,' : opt}</span>
              </label>
              {opt === 'Outro' && (
                <div className="inline-input-slot">
                  <input
                    className={`inline-small-input ${form.situacao_habitacional?.tipo_habitacao === 'Outro' ? '' : 'is-hidden'}`}
                    value={form.situacao_habitacional?.tipo_habitacao_outro || ''}
                    onChange={(e) => onChangeSituacao('tipo_habitacao_outro', e.target.value)}
                    disabled={isReadOnly || form.situacao_habitacional?.tipo_habitacao !== 'Outro'}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="situacao-group">
        <label className="situacao-group-title">Ocupação</label>
        <div className="checkbox-list">
          {['Própria', 'Própria, em pagamento', 'Alugada', 'Cedida', 'Outro'].map((opt) => (
            <div key={opt} className="checkbox-line">
              <label className="checkbox-item">
                <input type="checkbox" checked={form.situacao_habitacional?.ocupacao === opt} onChange={() => toggleSituacaoOption('ocupacao', opt)} disabled={isReadOnly} />
                <span>
                  {opt === 'Própria, em pagamento' ? 'Própria, em pagamento R$' : opt === 'Alugada' ? 'Alugada - Valor: R$' : opt === 'Outro' ? 'Outro,' : opt}
                </span>
              </label>
              {(opt === 'Própria, em pagamento' || opt === 'Alugada' || opt === 'Outro') && (
                <div className="inline-input-slot">
                  {opt === 'Própria, em pagamento' && (
                    <input
                      className={`inline-small-input ${form.situacao_habitacional?.ocupacao === opt ? '' : 'is-hidden'}`}
                      value={form.situacao_habitacional?.valor_imovel_em_pagamento || ''}
                      onChange={(e) => onChangeSituacao('valor_imovel_em_pagamento', e.target.value)}
                      disabled={isReadOnly || form.situacao_habitacional?.ocupacao !== opt}
                    />
                  )}
                  {opt === 'Alugada' && (
                    <input
                      className={`inline-small-input ${form.situacao_habitacional?.ocupacao === opt ? '' : 'is-hidden'}`}
                      value={form.situacao_habitacional?.valor_aluguel || ''}
                      onChange={(e) => onChangeSituacao('valor_aluguel', e.target.value)}
                      disabled={isReadOnly || form.situacao_habitacional?.ocupacao !== opt}
                    />
                  )}
                  {opt === 'Outro' && (
                    <input
                      className={`inline-small-input ${form.situacao_habitacional?.ocupacao === opt ? '' : 'is-hidden'}`}
                      value={form.situacao_habitacional?.ocupacao_outro || ''}
                      onChange={(e) => onChangeSituacao('ocupacao_outro', e.target.value)}
                      disabled={isReadOnly || form.situacao_habitacional?.ocupacao !== opt}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="situacao-group">
        <label className="situacao-group-title">Nº Cômodos</label>
        <div className="checkbox-list">
          {['1', '2', '3', '4', '5', 'Mais de 5'].map((opt) => (
            <div key={opt} className={`checkbox-line ${opt === 'Mais de 5' ? 'checkbox-line-gap-top' : ''}`}>
              <label className="checkbox-item">
                <input type="checkbox" checked={form.situacao_habitacional?.numero_comodos === opt} onChange={() => toggleSituacaoOption('numero_comodos', opt)} disabled={isReadOnly} />
                <span>{opt}</span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="field">
      <label>Observações</label>
      <textarea rows={4} value={form.situacao_habitacional?.observacoes || ''} onChange={(e) => onChangeSituacao('observacoes', e.target.value)} disabled={isReadOnly} />
    </div>
  </>
}
