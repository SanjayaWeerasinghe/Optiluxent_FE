import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'
import { loaderForFieldKind } from '../../pages/master-data/useOptions'
import { FieldControl, type FieldDef } from '../../pages/master-data/CrudSection'

// A picker slot as returned by GET /document-types/:id/fields.
interface FieldSchema {
  id:             number
  code:           string
  label:          string
  kind:           string
  is_required:    boolean
  display_order:  number
}

// A resolved value returned by GET /documents/:kind/:id/fields.
interface ValueRow {
  field_id: number
  code:     string
  label:    string
  kind:     string
  ref_id:   number | null
}

// The state we hand up to the parent form on every change.
export type DocumentFieldValues = Record<number, number | null> // field_id → ref_id

interface Props {
  docKind:      string               // 'GRN' | 'PR' | ... (matches document_types.model)
  docId?:       number               // undefined when creating; used to prime values
  typeId?:      number               // the DocumentType currently selected on the doc
  values:       DocumentFieldValues  // controlled from the parent
  onChange:     (next: DocumentFieldValues) => void
}

// Renders the picker slots attached to a DocumentType. Empty when no Type is
// picked or the Type has no fields. Values round-trip through the parent so
// the parent modal can persist them with a single batch call on save.
export function DocumentTypeFields({ docKind, docId, typeId, values, onChange }: Props) {
  const [fields, setFields] = useState<FieldSchema[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!typeId) { setFields([]); return }
    setLoading(true)
    apiGet<FieldSchema[]>(`/api/v1/masterdata/document-types/${typeId}/fields`)
      .then(rows => setFields(Array.isArray(rows) ? rows : []))
      .catch(() => setFields([]))
      .finally(() => setLoading(false))
  }, [typeId])

  // Prime values from the doc when opened. Only runs when we have a docId —
  // create-mode leaves the picker slots at whatever the parent seeded.
  useEffect(() => {
    if (!typeId || !docId) return
    apiGet<ValueRow[]>(`/api/v1/documents/${docKind}/${docId}/fields?type_id=${typeId}`)
      .then(rows => {
        if (!Array.isArray(rows)) return
        const next: DocumentFieldValues = { ...values }
        for (const r of rows) next[r.field_id] = r.ref_id
        onChange(next)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId, docId])

  // Empty / loading states render nothing so the pickers appear inline in the
  // parent form's grid without introducing extra layout. Loading is silent
  // because the whole modal already has its own "Loading…" indicator.
  if (!typeId || loading || fields.length === 0) return null

  return (
    <>
      {fields.map(f => {
        // Build a FieldDef on the fly so we reuse FieldControl's select rendering.
        const def: FieldDef = {
          key:         `dt_${f.id}`,
          label:       f.label,
          type:        'select',
          required:    f.is_required,
          loadOptions: loaderForFieldKind(f.kind),
        }
        return (
          <div key={f.id} data-testid={`dt-field-${f.code}`}>
            <FieldControl
              field={def}
              value={values[f.id] ?? ''}
              onChange={v => {
                const next: DocumentFieldValues = { ...values }
                const asNum = Number(v)
                next[f.id] = Number.isFinite(asNum) && asNum > 0 ? asNum : null
                onChange(next)
              }}
            />
          </div>
        )
      })}
    </>
  )
}

// A helper for the parent doc modal — call this on save to persist the batch.
export async function saveDocumentTypeValues(docKind: string, docId: number, values: DocumentFieldValues) {
  const entries = Object.entries(values).map(([fieldID, refID]) => ({
    field_id: Number(fieldID),
    ref_id:   refID,
  }))
  const { apiPost } = await import('../../lib/api')
  await apiPost(`/api/v1/documents/${docKind}/${docId}/fields`, { values: entries })
}
