const ESCOLARIDADE_OPTIONS = [
  'Não alfabetizado',
  'Alfabetizado',
  'Ensino Fundamental Incompleto',
  'Ensino Fundamental Completo',
  'Ensino Médio Incompleto',
  'Ensino Médio Completo',
  'Ensino Superior Incompleto',
  'Ensino Superior Completo',
  'Pós-graduação',
  'Mestrado',
  'Doutorado',
]

export function ComposicaoTab({
  form,
  isReadOnly,
  isComposicaoModalOpen,
  composicaoEditIndex,
  composicaoDraft,
  onChangeComposicao,
  abrirModalComposicao,
  removerComposicao,
  fecharModalComposicao,
  adicionarComposicao,
}) {
  return <>
    <strong className="section-title">Composição Familiar</strong>
    {!isReadOnly && <div className="form-actions" style={{ marginBottom: 12 }}>
      <button type="button" onClick={() => abrirModalComposicao()}>Adicionar membro</button>
    </div>}
    <div className="table-wrap">
      <table className="list-table">
        <thead>
          <tr>
            <th>Nº</th><th>Nome</th><th>Parentesco</th><th>Sexo</th><th>Idade</th><th>Naturalidade</th><th>Estado Civil</th><th>Escolaridade</th>{!isReadOnly && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {(form.composicao_familiar || []).length === 0 && <tr><td colSpan={isReadOnly ? 8 : 9}>Nenhum membro adicionado.</td></tr>}
          {(form.composicao_familiar || []).map((item, index) => (
            <tr key={`${item.nome}-${index}`}>
              <td>{index + 1}</td>
              <td>{item.nome}</td>
              <td>{item.parentesco}</td>
              <td>{item.sexo}</td>
              <td>{item.idade}</td>
              <td>{item.naturalidade}</td>
              <td>{item.estado_civil}</td>
              <td>{item.escolaridade}</td>
              {!isReadOnly && <td>
                <button type="button" className="btn btn-ghost" onClick={() => abrirModalComposicao(index)}>Editar</button>
                <button type="button" className="btn btn-ghost" onClick={() => removerComposicao(index)}>Excluir</button>
              </td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {isComposicaoModalOpen && !isReadOnly && <div className="modal-overlay" onClick={fecharModalComposicao}>
      <div className="modal-card composicao-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>{composicaoEditIndex == null ? 'Adicionar membro' : 'Editar membro'}</h3>
        <div className="composicao-modal-row">
          <div className="field"><label>Nome</label><input value={composicaoDraft.nome} onChange={(e) => onChangeComposicao('nome', e.target.value)} /></div>
          <div className="field"><label>Parentesco</label><select value={composicaoDraft.parentesco} onChange={(e) => onChangeComposicao('parentesco', e.target.value)}><option value="">Selecione</option><option>Pai</option><option>Mãe</option><option>Irmão</option><option>Irmã</option><option>Primo</option><option>Prima</option><option>Padrasto</option><option>Madrasta</option><option>Tio</option><option>Tia</option><option>Avô</option><option>Avó</option></select></div>
          <div className="composicao-sexo-idade-row">
            <div className="field"><label>Sexo</label><select value={composicaoDraft.sexo} onChange={(e) => onChangeComposicao('sexo', e.target.value)}><option value="">Selecione</option><option>Masculino</option><option>Feminino</option></select></div>
            <div className="field composicao-idade-field"><label>Idade</label><input value={composicaoDraft.idade} onChange={(e) => onChangeComposicao('idade', e.target.value)} /></div>
          </div>
        </div>
        <div className="composicao-modal-row">
          <div className="field"><label>Naturalidade</label><input value={composicaoDraft.naturalidade} onChange={(e) => onChangeComposicao('naturalidade', e.target.value)} /></div>
          <div className="field"><label>Estado Civil</label><select value={composicaoDraft.estado_civil} onChange={(e) => onChangeComposicao('estado_civil', e.target.value)}><option value="">Selecione</option><option>Casado</option><option>Solteiro</option><option>Viúvo</option><option>Separado</option></select></div>
          <div className="field"><label>Escolaridade</label><select value={composicaoDraft.escolaridade} onChange={(e) => onChangeComposicao('escolaridade', e.target.value)}><option value="">Selecione</option>{ESCOLARIDADE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={fecharModalComposicao}>Cancelar</button>
          <button type="button" onClick={adicionarComposicao}>{composicaoEditIndex == null ? 'Adicionar' : 'Atualizar'}</button>
        </div>
      </div>
    </div>}
  </>
}
