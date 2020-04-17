'use strict';

const Property = require('gateway-addon').Property;

class ModeProperty extends Property {
  constructor(device) {
    super(device, 'mode', {
      label: 'Mode',
      type: 'string',
      enum: ['auto', 'manual', 'holiday'],
    });

    this.device.lib.on('mode', ((val, date) => {
      this.setCachedValueAndNotify(val);
      this.device.properties.get('holiday').update(val == 'holiday' ? date : null);
    }).bind(this));
  }

  selectHoliday() {
    const date = new Date(this.device.properties.get('holiday').value);
    const temp = this.device.properties.get('temperature').value;
    this.device.lib.selectHolidayMode(temp, date);
  }

  setValue(value) {
    return new Promise(((resolve) => {
      super.setValue(value).then(((updatedValue) => {
        switch (value) {
          case 'auto':
            this.device.lib.selectAutoMode();
            break;
          case 'manual':
            this.device.lib.selectManualMode();
            break;
          case 'holiday':
            const date = new Date();
            date.setDate(date.getDate()+2);
            this.device.properties.get('holiday').update(date);
            this.selectHoliday();
            break;
        }
        resolve(updatedValue);
      }).bind(this));
    }).bind(this));
  }
}

module.exports = ModeProperty;
