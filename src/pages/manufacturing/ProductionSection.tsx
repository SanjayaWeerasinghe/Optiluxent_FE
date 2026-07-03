import { useState, useEffect, useMemo } from 'react'
import { Button, Input } from '../../components/ui'
import { Table, type Column } from '../../components/ui/Table'
import { StatusBadge } from '../../components/ui/Badge'
import { apiGet } from '../../lib/api'
import { LookupCell } from '../../lib/lookups'
import { ProductionModal } from './ProductionModal'

const BASE = '/api/v1/manufacturing'

const ORDER_COLS: Column<Record<string, unknown>>[] = [
  { header: 'Code',        key: 'code',        width: '120px' },
  { header: 'Product',     key: 'product_id',  width: '180px',
    render: r => <LookupCell kind="product" id={r.product_id as number} /> },
  { header: 'Planned Qty', key: 'planned_qty', width: '100px', align: 'right' },
  { header: 'Produced',    key: 'produced_qty', width: '90px',  align: 'right' },
  { header: 'Start Date',  key: 'start_date',  width: '110px' },
  { header: 'Status', key: 'status', width: '120px',
    render: r => <StatusBadge status={String(r.status ?? '')} /> },
]

export function ProductionSection() {
  const [data,     setData]     = useState<Record<string, unknown>[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modalDoc, setModalDoc] = useState<Record<string, unknown> | null | undefined>(undefined)

  function load() {
    setLoading(true)
    apiGet<Record<string, unknown>[]>(`${BASE}/orders`)
      .then(rows => setData(Array.isArray(rows) ? rows : []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(r => String(r.code ?? '').toLowerCase().includes(q))
  }, [data, search])

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <Input
          id="mo-search"
          placeholder="Search production orders..."
          iconLeft="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="primary" size="sm" iconLeft="add" onClick={() => setModalDoc(null)} className="ml-auto">
          New Order
        </Button>
      </div>

      <Table
        columns={ORDER_COLS}
        data={filtered}
        loading={loading}
        empty="No production orders found"
        onRowClick={row => setModalDoc(row)}
      />

      {modalDoc !== undefined && (
        <ProductionModal
          isOpen
          onClose={() => setModalDoc(undefined)}
          onRefresh={load}
          doc={modalDoc}
        />
      )}
    </>
  )
}
