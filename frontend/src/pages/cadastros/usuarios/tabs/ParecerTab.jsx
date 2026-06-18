export function ParecerTab({ form, isReadOnly, onChangeParecer }) {
  return <div className="field">
    <label>Parecer</label>
    <textarea
      rows={8}
      value={form.parecer?.parecer || ''}
      onChange={(e) => onChangeParecer(e.target.value)}
      disabled={isReadOnly}
    />
  </div>
}
