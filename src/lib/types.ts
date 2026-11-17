export type Unit = 'LF' | 'EA'
export type PayMethod = 'Check' | 'Credit Card' | 'Cash' | 'Financed' | 'Other'
export type Schedule = 'increase' | 'decrease' | 'remain'

export interface CatalogItem {
  id: string
  section: string
  name: string
  description: string
  unit: Unit
  price: number
}

/**
 * One quote selection. A change order holds a full copy of the contract's selections:
 * `baseQty` is what was on the contract when the change order started (0 = new item),
 * `qty` is what it will be after. The change order amount is the difference.
 */
export interface Sel {
  key: string
  itemId?: string
  section: string
  name: string
  description: string
  note?: string
  /** Why it changed on this change order. Not copied into the next one. */
  coNote?: string
  unit: Unit
  price: number
  qty: number
  baseQty: number
  kind: 'catalog' | 'custom'
}

export interface Customer {
  names: string
  primary: string
  additional?: string
  phone: string
  email: string
  street: string
  city: string
  county: string
  state: string
  zip: string
}

export interface Contract {
  quoteId: string
  opportunityId: string
  opportunityName: string
  projectId: string
  projectName: string
  customer: Customer
  rep: string
  signedAt: string
  sels: Sel[]
  total: number
  deposit: number
  depositMethod: PayMethod
  depositRef?: string
  start: string
  completion: string
}

export type Sig = { kind: 'img'; src: string; at: string } | { kind: 'typed'; name: string; at: string }
export interface Signatures {
  customer?: Sig
  additional?: Sig
  rep?: Sig
}

export interface Flow {
  valueBefore: number
  valueAfter: number
  endBefore: string
  endAfter: string
  balanceAfter: number
}

export interface ChangeOrder {
  id: string
  number: number
  status: 'draft' | 'signed'
  createdAt: string
  signedAt?: string
  sels: Sel[]
  override?: number
  /** Print each item's difference on the form. Off by default, like quote line pricing. */
  showAmounts?: boolean
  schedule: Schedule
  newCompletion?: string
  dueOnSigning: number
  dueTouched: boolean
  payMethod: PayMethod
  checkNo: string
  signatures: Signatures
  flow?: Flow
}

export interface Payment {
  id: string
  date: string
  label: string
  amount: number
  method: PayMethod
  ref?: string
  source: 'deposit' | 'co' | 'office'
  coId?: string
}

export type Place = 'quote' | 'opportunity' | 'project'
export interface Activity {
  id: string
  at: string
  who: string
  text: string
  where: Place[]
}

export type View = 'rep' | 'opportunity' | 'project'
export type RepScreen =
  | { name: 'list' }
  | { name: 'quote' }
  | { name: 'co'; coId: string }
  | { name: 'preview'; coId: string }
  | { name: 'sign'; coId: string }
  | { name: 'done'; coId: string }

export interface State {
  contract: Contract
  cos: ChangeOrder[]
  payments: Payment[]
  activity: Activity[]
  view: View
  screen: RepScreen
}
