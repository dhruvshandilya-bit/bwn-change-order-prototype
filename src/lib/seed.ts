import type { CatalogItem, ChangeOrder, Contract, Sel, State } from './types'

// Demo "today". Sample people and addresses are made up.
export const TODAY = '2026-11-17'

let n = 0
export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${(n++).toString(36)}`

export const SECTIONS = ['WATERPROOFING PACKAGE', 'DEMO & PREPARATIONS', 'WINDOWS', 'STRUCTURAL', 'ADDITIONAL WORK'] as const

export const CATALOG: CatalogItem[] = [
  { id: 'drain', section: 'WATERPROOFING PACKAGE', name: 'Interior floor drainage system', unit: 'LF', price: 125, description: 'Supply and install new interior, high-performance, anti-clog, below-floor drainage system. Includes BWN lifetime warranty on the interior floor drainage system. See warranty for full details.' },
  { id: 'liner', section: 'WATERPROOFING PACKAGE', name: 'Sump liner with fitted cover', unit: 'EA', price: 450, description: 'Supply and install new standard sump liner with stone bed for drainage, includes fitted cover. Homeowner responsible to keep sump liner free and clear of debris.' },
  { id: 'pump', section: 'WATERPROOFING PACKAGE', name: 'Primary sump pump - 1/3 hp (package)', unit: 'EA', price: 650, description: 'Supply and install new cast iron, high-capacity, automatically operating primary sump pump. Includes 5 year manufacturer warranty.' },
  { id: 'battery', section: 'WATERPROOFING PACKAGE', name: 'Battery backup sump pump', unit: 'EA', price: 1750, description: 'Supply and install battery backup sump pump system with high-water alarm. Battery replacement is homeowner responsibility. Manufacturer warranty applies.' },
  { id: 'spray', section: 'WATERPROOFING PACKAGE', name: 'Anti-microbial spray application', unit: 'LF', price: 5, description: 'Spray application for masonry walls where accessible. Installation only, see terms and conditions for full details.' },
  { id: 'vapor', section: 'WATERPROOFING PACKAGE', name: 'Waterproofing vapor barrier', unit: 'LF', price: 8, description: 'Supply and install new reinforced flexible membrane on masonry walls where accessible. Includes manufacturer lifetime warranty.' },
  { id: 'stair', section: 'WATERPROOFING PACKAGE', name: 'Stairwell drain', unit: 'EA', price: 850, description: 'Supply and install drain at the base of the exterior stairwell, connected to the interior drainage system.' },
  { id: 'crack', section: 'WATERPROOFING PACKAGE', name: 'Wall crack repair - injection', unit: 'EA', price: 475, description: 'Inject and seal a poured-wall crack from the interior with injection ports and staples.' },
  { id: 'demo', section: 'DEMO & PREPARATIONS', name: 'Full demo', unit: 'LF', price: 6, description: 'Removal of wall coverings, floor to ceiling, as needed to access the masonry wall. Demo debris bagged/stacked and left on jobsite.' },
  { id: 'flood', section: 'DEMO & PREPARATIONS', name: 'Flood cut', unit: 'LF', price: 4, description: 'Cut wallboard 2 ft above the floor for access to install waterproofing. Rebuild by others.' },
  { id: 'haul', section: 'DEMO & PREPARATIONS', name: 'Debris haul-away', unit: 'EA', price: 395, description: 'Remove bagged demo debris from the jobsite.' },
  { id: 'wwdrain', section: 'WINDOWS', name: 'Window well drain', unit: 'EA', price: 325, description: 'Supply and install new window well drain with grated cover, connected to interior drainage system or sump pump.' },
  { id: 'well', section: 'WINDOWS', name: 'Window well', unit: 'EA', price: 495, description: 'Supply and install new 36" wide x 24" deep galvanized steel window well with pre-punched flanges.' },
  { id: 'wwcover', section: 'WINDOWS', name: 'Window well cover', unit: 'EA', price: 185, description: 'Supply and install clear polycarbonate window well cover.' },
  { id: 'strap', section: 'STRUCTURAL', name: 'Carbon fiber wall strap', unit: 'EA', price: 595, description: 'Install carbon fiber strap to stabilize a bowing wall. Spacing per engineered layout.' },
]

const cat = (id: string) => CATALOG.find((c) => c.id === id)!

/** A catalog selection. The key stays the same on every change order copy. */
export function catalogSel(id: string, qty: number, coNote?: string, baseQty = qty): Sel {
  const c = cat(id)
  return { key: c.id, itemId: c.id, section: c.section, name: c.name, description: c.description, unit: c.unit, price: c.price, qty, baseQty, kind: 'catalog', coNote }
}

function contract(): Contract {
  const sels: Sel[] = [
    catalogSel('drain', 70),
    catalogSel('liner', 1),
    catalogSel('pump', 1),
    catalogSel('spray', 70),
    catalogSel('vapor', 70),
    catalogSel('demo', 70),
    catalogSel('wwdrain', 1),
    catalogSel('well', 1),
    {
      key: 'addl-1',
      section: 'ADDITIONAL WORK',
      name: 'Additional work',
      description: "Any contracted work outside the company's standard scope of services.",
      note: 'Anti-microbial treatment after demo and before vapor barrier. Air-quality test after waterproofing (a snapshot only, no warranty on results).',
      unit: 'EA',
      qty: 1,
      baseQty: 1,
      price: 350,
      kind: 'custom',
    },
  ]
  return {
    quoteId: 'BWN-1042',
    opportunityId: 'OPP-3318',
    opportunityName: 'Whitfield - Basement Waterproofing',
    projectId: 'P-2210',
    projectName: 'Whitfield - Basement Waterproofing',
    customer: {
      names: 'Dana & Chris Whitfield',
      primary: 'Dana Whitfield',
      additional: 'Chris Whitfield',
      phone: '410-555-0142',
      email: 'dana.whitfield@example.com',
      street: '418 Ridgeview Ct',
      city: 'Bel Air',
      county: 'Harford',
      state: 'MD',
      zip: '21014',
    },
    rep: 'Mark Ellison',
    signedAt: '2026-11-11',
    sels,
    total: 12350,
    deposit: 5800,
    depositMethod: 'Check',
    depositRef: 'Check #3889',
    start: '2026-12-28',
    completion: '2027-01-27',
  }
}

/** Change Order #1: a copy of the contract with drainage 70 → 80 LF and a battery backup pump added. */
function co1(c: Contract): ChangeOrder {
  const sels = c.sels.map((x) => (x.key === 'drain' ? { ...x, qty: 80, coNote: 'Extend system along the north wall to the stairwell.' } : { ...x }))
  sels.push(catalogSel('battery', 1, undefined, 0))
  return {
    id: 'co-1',
    number: 1,
    status: 'signed',
    createdAt: '2026-11-14',
    signedAt: '2026-11-14',
    sels,
    schedule: 'increase',
    newCompletion: '2027-01-29',
    dueOnSigning: 1000,
    dueTouched: true,
    payMethod: 'Check',
    checkNo: '3912',
    signatures: {
      customer: { kind: 'typed', name: 'Dana Whitfield', at: '2026-11-14' },
      rep: { kind: 'typed', name: 'Mark Ellison', at: '2026-11-14' },
    },
    flow: { valueBefore: 12350, valueAfter: 15350, endBefore: '2027-01-27', endAfter: '2027-01-29', balanceAfter: 8550 },
  }
}

export function seed(): State {
  const c = contract()
  return {
    contract: c,
    cos: [co1(c)],
    payments: [
      { id: 'pay-dep', date: '2026-11-11', label: 'Deposit', amount: 5800, method: 'Check', ref: 'Check #3889', source: 'deposit' },
      { id: 'pay-co1', date: '2026-11-14', label: 'Payment - Change Order #1', amount: 1000, method: 'Check', ref: 'Check #3912', source: 'co', coId: 'co-1' },
    ],
    activity: [
      { id: 'a1', at: '2026-11-11', who: 'Mark Ellison', text: 'Contract BWN-1042 signed by Dana Whitfield · $12,350.00', where: ['quote', 'opportunity'] },
      { id: 'a2', at: '2026-11-11', who: 'Merlin', text: 'Project P-2210 created from the signed contract', where: ['opportunity', 'project'] },
      { id: 'a3', at: '2026-11-11', who: 'Mark Ellison', text: 'Deposit $5,800.00 received · Check #3889', where: ['opportunity', 'project'] },
      { id: 'a4', at: '2026-11-14', who: 'Mark Ellison', text: 'Change Order #1 signed on quote BWN-1042 · +$3,000.00 · contract now $15,350.00', where: ['quote', 'opportunity', 'project'] },
      { id: 'a5', at: '2026-11-14', who: 'Mark Ellison', text: 'Payment $1,000.00 received for Change Order #1 · Check #3912', where: ['opportunity', 'project'] },
      { id: 'a6', at: '2026-11-14', who: 'Merlin', text: 'Expected end moved 01/27/2027 → 01/29/2027 by Change Order #1', where: ['project'] },
    ],
    view: 'rep',
    screen: { name: 'quote' },
  }
}

/** A few other quotes so the list looks real. Only BWN-1042 opens. */
export const OTHER_QUOTES = [
  { id: 'BWN-1047', name: 'Harper residence', addr: '22 Laurel Hill Rd, Fallston, MD', status: 'Draft', items: 4, total: 6840 },
  { id: 'BWN-1045', name: 'Okafor residence', addr: '9 Cedar Bend, Aberdeen, MD', status: 'Sent', items: 7, total: 10975 },
  { id: 'BWN-1039', name: 'Lindqvist residence', addr: '301 Pine St, Newark, DE', status: 'Signed', items: 6, total: 8420 },
]
