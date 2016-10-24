var debug = false;
module.exports = {
  setLevel(level) {
    debug = level;
  },
 log: function() {
    var args = [];
    Object.keys(arguments).map(key => {
      args.push(arguments[key]);
    });
    if (debug) {
      console.log.apply(console, args);
    }
  },
};
