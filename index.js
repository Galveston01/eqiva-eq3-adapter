/**
 * index.js - Loads the eqiva eq3 adapter.
 */

'use strict';

const EqivaEQ3Adapter = require('./lib/adapter');

module.exports = (addonManager) => {
  new EqivaEQ3Adapter(addonManager);
};
