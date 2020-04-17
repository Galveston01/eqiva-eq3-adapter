'use strict';

const Property = require('gateway-addon').Property;

class BoostProperty extends Property {
  constructor(device) {
    super(device, 'boost', {
      label: 'Boost',
      type: 'boolean',
      value: false,
    });

    this.device.lib.on('boost', ((val) => {
      this.setCachedValueAndNotify(val);
    }).bind(this));
  }

  setValue(value) {
    return new Promise(((resolve) => {
      super.setValue(value).then(((updatedValue) => {
        this.device.lib.selectBoost(value);
        resolve(updatedValue);
      }).bind(this));
    }).bind(this));
  }
}

module.exports = BoostProperty;
