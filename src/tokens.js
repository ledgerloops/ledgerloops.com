// rewired in tests:  FIXME could not (yet) get rewire to work for this
function generateToken() {
 return crypto.randomBytes(42).toString('base64');
}

module.exports = {
  generateToken,
};
