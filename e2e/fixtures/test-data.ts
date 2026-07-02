// Per-spec unique code generator — avoids collisions when reruns / multiple
// specs hit the same document_sequences row.
const N = () => Math.floor(Math.random() * 90000) + 10000

export const uniq = {
  pr:   () => `PR-E2E-${N()}`,
  po:   () => `PO-E2E-${N()}`,
  grn:  () => `GRN-E2E-${N()}`,
  pinv: () => `PINV-E2E-${N()}`,
  so:   () => `SO-E2E-${N()}`,
  do:   () => `DO-E2E-${N()}`,
  si:   () => `SI-E2E-${N()}`,
  qc:   () => `QC-E2E-${N()}`,
  mr:   () => `MR-E2E-${N()}`,
  gt:   () => `GT-E2E-${N()}`,
  gi:   () => `GI-E2E-${N()}`,
  sa:   () => `SA-E2E-${N()}`,
  mo:   () => `MO-E2E-${N()}`,
}

export const today = () => new Date().toISOString().slice(0, 10)
