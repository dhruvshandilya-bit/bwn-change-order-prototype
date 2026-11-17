# BWN change orders · Merlin prototype

A clickable prototype of change orders in BWN's quote module in Merlin. It is built from BWN's annotated Change Order form and Contract Statement (Rev. 11/16/26).

**Live:** https://dhruvshandilya-bit.github.io/bwn-change-order-prototype/

## The flow

1. **Signed quote.** The original contract is locked. Any change to scope or price goes on a change order.
2. **Create Change Order** on the quote. The change order starts as a full copy of the quote's selections as the contract stands today, including earlier change orders. Customer, address, contract date, price, deposit and balance fill in from the contract.
3. **Edit the copy.** The rep can change a quantity, remove an item, or add an item from the catalog or as a custom item. Each row shows its quantity on the contract, its new quantity, and the dollar difference. The change order amount (D) is the selections after minus before.
4. **Preview.** The customer sees two pages:
   - **Change Order form.** The scope of work lists every item on the contract after the change, marked ADDED or +/− quantity, then the items removed from the contract. The rest of the form fills in from the contract and this change order:
     - A, B, C: original price, deposit and balance.
     - D: this change order.
     - E: revised total.
     - F: payment due at signing.
     - H: date the original contract was signed.
     - Project schedule: Increase / Decrease / Remain.
   - **Contract Statement.** Contracts and credits appear under Contracts, money received appears under Payments, with a running balance.
5. **Customer signs** by touch. The customer, an optional additional customer and the rep sign. The BWN officer line is left blank.

"Show field map" in the preview puts BWN's A–H letters on the form and explains where each one comes from.

## Data

The customer, address, prices and payments are made up. Documents carry a "PROTOTYPE · SAMPLE DATA" watermark.

## Run it

```bash
npm install
npm run dev        # http://localhost:5194
npm run build      # static site in dist/
```
