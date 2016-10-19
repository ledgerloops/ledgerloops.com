function Ledger(peerNick, myNick) {
  this._peerNick = peerNick;
  this._myNick = myNick;
  this._debts = {};
  this._history = [];
}

Ledger.prototype._addToHistory = function(debtor, note, addedDebts) {
  this._history.push({
    debtor,
    note,
    addedDebts,
  }); 
}  

Ledger.prototype._addToDebts = function(debtor, amount, currency) {
  if (typeof this._debts[currency] === 'undefined') {
    this._debts[currency] = {
      debtor,
      amount,
    };
  } else {
    if (debtor === this._debts[currency].debtor) {
      this._debts[currency].amount += amount;
    } else {
      this._debts[currency].amount -= amount;
    }
    if (this._debts[currency].amount < 0) {
      this._debts[currency].debtor = (this._debts[currency].debtor === this._peerNick ? this._myNick : this._peerNick);
      this._debts[currency].amount = -this._debts[currency].amount;
    }
  }
}

// debtor should be either peerNick or myNick
// note can be any human-readable string, or a settlement signature reference
// addedDebts should be a map { currency: amount }
Ledger.prototype.addDebt = function(debtor, note, addedDebts) {
  this._addToHistory(debtor, note, addedDebts);
  for (var currency in addedDebts) {
    this._addToDebts(debtor, addedDebts[currency], currency);
  }
}

Ledger.prototype.toObj = function() {
  return {
    peers: [ this._peerNick, this._myNick ].sort(),
    debts: this._debts,
    history: this._history,
  };
}

module.exports = Ledger;
