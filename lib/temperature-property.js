'use strict';

const Property = require('gateway-addon').Property;

class TemperatureProperty extends Property {
  constructor(device) {
    super(device, 'temperature', {
      label: 'Temperature',
      type: 'number',
      '@type': 'TargetTemperatureProperty',
      value: 0,
      minimum: 4.5,
      maximum: 30,
      multipleOf: 0.5,
      unit: 'degree celsius',
    });

    this.device.lib.on('temperature', (val) => {
      this.setCachedValueAndNotify(val);
    });
  }

  setValue(value) {
    return new Promise(((resolve) => {
      super.setValue(value).then(((updatedValue) => {
        this.device.lib.setTemperature(value);
        resolve(updatedValue);
      }).bind(this));
    }).bind(this));
  }
}

module.exports = TemperatureProperty;
