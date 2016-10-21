var neighborChangeConstants = require('./neighbor-change-constants');

function Ledger(peerNick, myNick) {
  this._peerNick = peerNick;
  this._myNick = myNick;
  this._debts = {};
  this._history = [];
}

Ledger.prototype._addToHistory = function(debt) {
  this._history.push(debt);
};

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
};

Ledger.prototype._addToDebts = function(debtor, amount, currency) {
  if (typeof this._debts[currency] === 'undefined') {
    this._debts[currency] = {
      debtor,
      amount,
    };
    if (debtor === this._myNick) {
      return {
        change: neighborChangeConstants.CREDITOR_CREATED,
        peerNick: this._peerNick,
        currency,
      };
    } else {
      return {
        change: neighborChangeConstants.DEBTOR_CREATED,
        peerNick: this._peerNick,
        currency,
      };
    }
  } else {
    var debtorWas = this._debts[currency].debtor;
    if (debtor === this._debts[currency].debtor) {
      this._debts[currency].amount += amount;
    } else {
      this._debts[currency].amount -= amount;
    }
    this._normalizeDebt(currency);
    if (typeof this._debts[currency] === 'undefined') {
      return {
        change: (debtorWas === this._peerNick ? neighborChangeConstants.DEBTOR_REMOVED : neighborChangeConstants:CREDITOR_REMOVED),
        peerNick: this._peerNick,
        currency,
      };
    } else {
      if (this._debts[currency].debtor === debtorWas) {
        return null;
      } else {
        return {
          change: (debtorWas === this._peerNick ? neighborChangeConstants.DEBTOR_TO_CREDITOR : neighborChangeConstants:CREDITOR_TO_DEBTOR),
          peerNick: this._peerNick,
          currency,
        };
      }
    }
  }
};


Ledger.prototype.toObj = function() {
  return {
    peers: [ this._peerNick, this._myNick ].sort(),
    debts: this._debts,
    history: this._history.slice(-2),
  };
};

Ledger.prototype.addDebt = function(debt) {
  this._addToHistory(debt);
  for (var currency in debt.addedDebts) {
    this._addToDebts(this._myNick, debt.addedDebts[currency], currency);
  }
};

Ledger.prototype.createIOU = function(amount, currency) {
  var debt = {
    debtor: this._myNick,
    note: `IOU sent from ${this._myNick} to ${this._peerNick} on ${new Date()}`,
    addedDebts: {
      [currency]: amount,
     },
  };
  this._pendingDebts[debt.note] = debt;
  return debt;
};

Ledger.prototype.markIOUConfirmed = function(note) {
  var debt = this._pendingDebts[note];
  return this.addDebt(debt);
};

// assume agent is potentially willing to trade any debt against any
// credit, even if the currencies don't match. later, should add option
// for user to indicate which debt they would trade against which
// credits, and at which exchange rate, see
// https://github.com/michielbdejong/opentabs.net/issues/12
Ledger.prototype.getNeighborType = function() {
  var peerIsDebtor = false;
  var peerIsCreditor = false;
  for (var currency in this._debts) {
    if (this._debts[currency].amount > 0) {
      if (this._debts[currency].debtor === this._peerNick) {
        peerIsDebtor = true;
      } else {
        peerIsCreditor = true;
      }
    }
  }
  return {
    'in': peerIsCreditor,
    out: peerIsDebtor,
  };
};

module.exports = Ledger;
