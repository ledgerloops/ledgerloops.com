function Ledger(peerNick, myNick) {
  this._peerNick = peerNick;
  this._myNick = myNick;
  this._debts = {};
  this._history = [];
}

Ledger.prototype._addToHistory = function(debt) {
  this._history.push(debt);
}  

Ledger.prototype._normalizeDebt = function(currency) {
  if (this._debts[currency].amount === 0) {
    // remove settled debt:
    delete this._debts[currency];
  } else if (this._debts[currency].amount < 0) {
    var creditor;
    if (this._debts[currency].debtor === this._peerNick) {
      creditor = this._myNick;
    } else {
      creditor = this._peerNick;
    }
    // reverse debt direction to make amount > 0:
    this._debts[currency].debtor = creditor;
    this._debts[currency].amount = -this._debts[currency].amount;
  }
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
    this._normalizeDebt(currency);
  }
}


Ledger.prototype.toObj = function() {
  return {
    peers: [ this._peerNick, this._myNick ].sort(),
    debts: this._debts,
    history: this._history.slice(-2),
  };
}

Ledger.prototype.addDebt = function(debt) {
  this._addToHistory(debt);
  for (var currency in debt.addedDebts) {
    this._addToDebts(this._myNick, debt.addedDebts[currency], currency);
  }
}

Ledger.prototype.createIOU = function(amount, currency) {
  var debt = {
    debtor: this._myNick,
    note: `IOU sent from ${this._myNick} to ${this._peerNick} on ${new Date()}`,
    addedDebts: {
      [currency]: amount,
     },
     confirmedByPeer: false,
  };
  this.addDebt(debt);
  return debt;
}

Ledger.prototype.markIOUConfirmed = function(note) {
  for (var i=0; i<this._history.length; i++) {
    if (this._history[i].note === note) {
      this._history[i].confirmedByPeer = true;
      return true;
    }
  }
  return false;
}

module.exports = Ledger;
