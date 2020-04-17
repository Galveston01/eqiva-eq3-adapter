'use strict';

const Property = require('gateway-addon').Property;

class LockedProperty extends Property {
  constructor(device) {
    super(device, 'locked', {
      label: 'Locked',
      type: 'boolean',
      value: false,
    });

    this.device.lib.on('locked', (val, reason) => {
      this.setCachedValueAndNotify(val);
      const nro = val && reason == 'window detection';
      if (this.readOnly != nro) {
        this.readOnly = nro;
        this.device.adapter.handleDeviceUpdated(this.device);
      }
    });
  }

  setValue(value) {
    return new Promise(((resolve) => {
      super.setValue(value).then(((updatedValue) => {
        this.device.lib.selectPhysicalKeyblock(value);
        resolve(updatedValue);
      }).bind(this));
    }).bind(this));
  }
}

module.exports = LockedProperty;
