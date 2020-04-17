'use strict';

const Property = require('gateway-addon').Property;

class LockedReasonProperty extends Property {
  constructor(device) {
    super(device, 'locked-reason', {
      label: 'Reason for lock',
      type: 'string',
      value: '',
      readOnly: true,
    });

    this.device.lib.on('locked', ((val, reason) => {
      this.visible = val;
      this.device.adapter.handleDeviceUpdated(this.device);
      setTimeout((() => {
        this.setCachedValueAndNotify(reason ? reason : '');
      }).bind(this), 100);
    }).bind(this));
  }
}

module.exports = LockedReasonProperty;
