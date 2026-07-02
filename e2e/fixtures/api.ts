// Thin REST helper used both by the auth fixture (to mint a token) and by
// individual specs that want to "arrange" backend state without clicking through
// the UI (e.g. seeding a PO before testing a GRN flow).
//
// All requests go directly to the API (bypassing the FE) — this is intentional:
// fixtures should be fast and deterministic, while the assertion is what the
// FE displays.
import { request as plRequest, APIRequestContext } from '@playwright/test'
import { API_URL, EMAIL, PASSWORD } from './config'

export interface Token { access_token: string; refresh_token: string; expires_at: number }

export async function login(email = EMAIL, password = PASSWORD): Promise<Token> {
  const ctx = await plRequest.newContext()
  const res = await ctx.post(`${API_URL}/api/v1/auth/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok()) {
    throw new Error(`Login failed (${res.status()}): ${await res.text()}`)
  }
  const body = await res.json()
  await ctx.dispose()
  return body.data as Token
}

/** Authenticated API context — pass to api.get/post for any subsequent call. */
export async function authedContext(token: string): Promise<APIRequestContext> {
  return plRequest.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
}

/** Read a JSON envelope { success, data, meta } and return `data` (or throw). */
export async function getData<T = unknown>(ctx: APIRequestContext, path: string): Promise<T> {
  const res = await ctx.get(path)
  if (!res.ok()) throw new Error(`GET ${path} → ${res.status()}: ${await res.text()}`)
  const body = await res.json()
  return body.data as T
}

export async function postData<T = unknown>(ctx: APIRequestContext, path: string, payload: unknown): Promise<T> {
  const res = await ctx.post(path, { data: payload })
  if (!res.ok()) throw new Error(`POST ${path} → ${res.status()}: ${await res.text()}`)
  const body = await res.json()
  return body.data as T
}

/** Quick stock lookup used by stock-gating assertions. */
export async function stockQty(ctx: APIRequestContext, warehouseID: number, productID: number): Promise<number> {
  const res = await ctx.get(`/api/v1/inventory/stock?warehouse_id=${warehouseID}&product_id=${productID}`)
  if (!res.ok()) return 0
  const body = await res.json()
  const rows = (body.data ?? []) as Array<{ quantity?: number }>
  return rows.reduce((sum, r) => sum + Number(r.quantity ?? 0), 0)
}

/** Pull common master-data IDs once per spec — keeps tests independent of the DB. */
export interface MasterIDs {
  uomKg: number;     uomPkt: number
  whMain: number;    whFG: number
  locA1: number;     locFG: number
  currLkr: number;   currUsd: number;  currGbp: number
  termNet30: number; termNet60: number
  cinnStick: number; blackPepper: number; cloves: number; ceylonTea: number; cinnPwd: number; cardamom: number
  ceylonSpiceSupp: number; galleClovesSupp: number; indianSpiceSupp: number; matSpiceSupp: number
  cust1: number; cust2: number; cust3: number
}

export async function loadMasterIDs(ctx: APIRequestContext): Promise<MasterIDs> {
  const products = await getData<Array<{ id: number; code: string }>>(ctx, '/api/v1/masterdata/products?per_page=100')
  const uoms     = await getData<Array<{ id: number; code: string }>>(ctx, '/api/v1/masterdata/products/uoms?per_page=20')
  const whs      = await getData<Array<{ id: number; code: string }>>(ctx, '/api/v1/masterdata/inventory/warehouses?per_page=20')
  const currs    = await getData<Array<{ id: number; code: string }>>(ctx, '/api/v1/masterdata/financial/currencies?per_page=20')
  const terms    = await getData<Array<{ id: number; code: string }>>(ctx, '/api/v1/masterdata/financial/payment-terms?per_page=20')
  const supps    = await getData<Array<{ id: number; code: string }>>(ctx, '/api/v1/masterdata/contacts/parties?party_type=SUPPLIER&per_page=20')
  const custs    = await getData<Array<{ id: number; code: string }>>(ctx, '/api/v1/masterdata/contacts/parties?party_type=CUSTOMER&per_page=20')
  const wh1Locs  = await getData<Array<{ id: number; code: string }>>(ctx, '/api/v1/masterdata/inventory/warehouses/1/locations')
  const wh2Locs  = await getData<Array<{ id: number; code: string }>>(ctx, '/api/v1/masterdata/inventory/warehouses/2/locations')

  const byCode = <T extends { id: number; code: string }>(rows: T[], code: string) =>
    rows.find(r => r.code === code)?.id ?? 0

  return {
    uomKg:     byCode(uoms,     'KG'),
    uomPkt:    byCode(uoms,     'PKT'),
    whMain:    byCode(whs,      'WH001'),
    whFG:      byCode(whs,      'WH002'),
    locA1:     wh1Locs.find(l => /A1/i.test(l.code))?.id ?? wh1Locs[0]?.id ?? 0,
    locFG:     wh2Locs[0]?.id ?? 0,
    currLkr:   byCode(currs,    'LKR'),
    currUsd:   byCode(currs,    'USD'),
    currGbp:   byCode(currs,    'GBP'),
    termNet30: byCode(terms,    'NET30'),
    termNet60: byCode(terms,    'NET60'),
    cinnStick:   byCode(products, 'CINN-STCK'),
    blackPepper: byCode(products, 'BLKPEP'),
    cloves:      byCode(products, 'CLOVES'),
    ceylonTea:   byCode(products, 'CEYTEA'),
    cinnPwd:     byCode(products, 'CINN-PWD-250'),
    cardamom:    byCode(products, 'CARDM'),
    ceylonSpiceSupp:  byCode(supps, 'SUPP001'),
    matSpiceSupp:     byCode(supps, 'SUPP002'),
    indianSpiceSupp:  byCode(supps, 'SUPP004'),
    galleClovesSupp:  byCode(supps, 'SUPP005'),
    cust1: byCode(custs, 'CUST001'),
    cust2: byCode(custs, 'CUST002'),
    cust3: byCode(custs, 'CUST003'),
  }
}
