import { useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 10

export function CadastroListView({
  title,
  columns,
  rows,
  searchTerm,
  onSearchChange,
  onCadastrar,
  renderActions,
  renderAfterSearch,
  emptyMessage = 'Nenhum registro encontrado.',
  cadastrarLabel = 'Cadastrar',
}) {
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [rows, page])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, rows.length])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  return (
    <section>
      <div className="list-header">
        <h2>{title}</h2>
        {onCadastrar && <button type="button" className="btn" onClick={onCadastrar}>{cadastrarLabel}</button>}
      </div>

      <div className="card">
        <div className="search-toolbar">
          <div className="search-field">
            <label>Busca</label>
            <input
              value={searchTerm || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Digite para filtrar em qualquer coluna"
            />
          </div>
          {renderAfterSearch ? renderAfterSearch() : null}
        </div>

        <div className="table-wrap">
          <table className="list-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                {renderActions && <th className="actions-col">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + (renderActions ? 1 : 0)}>{emptyMessage}</td>
                </tr>
              )}
              {pageRows.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={`${row.id}-${col.key}`}>{col.render ? col.render(row) : row[col.key]}</td>
                  ))}
                  {renderActions && <td className="actions-col">{renderActions(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pagination-label">
          Mostrando {pageRows.length} de {rows.length} registro(s)
        </p>

        {totalPages > 1 && (
          <div className="pagination-controls">
            {page > 1 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPage((current) => current - 1)}
              >
                Anterior
              </button>
            )}
            <span className="pagination-label">Pagina {page} de {totalPages}</span>
            {page < totalPages && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setPage((current) => current + 1)}
              >
                Proxima
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
