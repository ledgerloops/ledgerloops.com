var neighborChangeConstants = require('./neighbor-change-constants');
var tokens = require('./tokens');

function Ledger(peerNick, myNick) {
  this._peerNick = peerNick;
  this._myNick = myNick;
  this._debts = {};
  this._pendingDebts = {};
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
        change: (debtorWas === this._peerNick ? neighborChangeConstants.DEBTOR_REMOVED : neighborChangeConstants.CREDITOR_REMOVED),
        peerNick: this._peerNick,
        currency,
      };
    } else {
      if (this._debts[currency].debtor === debtorWas) {
        return null;
      } else {
        return {
          change: (debtorWas === this._peerNick ? neighborChangeConstants.DEBTOR_TO_CREDITOR : neighborChangeConstants.CREDITOR_TO_DEBTOR),
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
  var neighborChanges = [];
  for (var currency in debt.addedDebts) {
    neighborChanges.push(this._addToDebts(debt.debtor, debt.addedDebts[currency], currency));
  }
  return neighborChanges;
};

Ledger.prototype.createIOU = function(amount, currency) {
  var debt = {
    transactionId: tokens.generateToken(),
    note: `IOU sent from ${this._myNick} to ${this._peerNick} on ${new Date()}`,
    debtor: this._myNick,
    addedDebts: {
      [currency]: amount,
     },
  };
  this._pendingDebts[debt.transactionId] = debt;
  return debt;
};

Ledger.prototype.createPendingSettlement = function(transactionId, amount, currency) {
  var debt = {
    transactionId,
    note: `Conditional Promise sent by ${this._myNick}, later triggered by ${this._peerNick}, see transactionId for details`,
    debtor: this._myNick,
    addedDebts: {
      [currency]: amount,
     },
  };
  this._pendingDebts[debt.transactionId] = debt;
  return debt;
};

Ledger.prototype.markIOUConfirmed = function(transactionId) {
  var debt = this._pendingDebts[transactionId];
  return this.addDebt(debt);
};

Ledger.prototype.getMyDebtAmount = function(currency) {
  if (typeof this._debts[currency] === 'undefined') {
    return 0;
  }
  if (this._debts[currency].debtor === this._myNick) {
    return this._debts[currency].amount;
  } else {
    return -this._debts[currency].amount;
  }
};

Ledger.prototype.getMyCreditAmount = function(currency) {
  return -(this.getMyDebtAmount(currency));
};

module.exports = Ledger;
