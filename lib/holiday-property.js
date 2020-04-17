'use strict';

const Property = require('gateway-addon').Property;

class HolidayProperty extends Property {
  constructor(device) {
    super(device, 'holiday', {
      label: 'Holiday end',
      type: 'string',
      value: '',
    });
  }

  update(date) {
    this.visible = date ? true : false;
    if (this.visible) {
      this.setCachedValueAndNotify(date.toLocaleString([], {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}));
    } else {
      this.setCachedValueAndNotify('');
    }
    this.device.adapter.handleDeviceUpdated(this.device);
  }

  setValue(value) {
    return new Promise(((resolve) => {
      super.setValue(value).then(((updatedValue) => {
        this.device.properties.get('mode').selectHoliday();
        resolve(updatedValue);
      }).bind(this));
    }).bind(this));
  }
}

module.exports = HolidayProperty;
