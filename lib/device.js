'use strict';

const Device = require('gateway-addon').Device;
const TemperatureProperty = require('./temperature-property');
const ModeProperty = require('./mode-property');
const HolidayProperty = require('./holiday-property');
const BoostProperty = require('./boost-property');
const LockedProperty = require('./locked-property');
const LockedReasonProperty = require('./locked-reason-property');

class EQ3Device extends Device {
  constructor(adapter, id, lib) {
    super(adapter, id);
    this.lib = lib;

    this['@type'] = ['Thermostat'];
    this.name = 'eQ-3 thermostat';
    this.description = 'Eqiva eQ-3 thermostat';

    this.properties.set('temperature', new TemperatureProperty(this));
    this.properties.set('mode', new ModeProperty(this));
    this.properties.set('holiday', new HolidayProperty(this));
    this.properties.set('boost', new BoostProperty(this));
    this.properties.set('locked', new LockedProperty(this));
    this.properties.set('locked-reason', new LockedReasonProperty(this));

    this.actions.set('comfortTemperature', {title: 'Comfort', description: 'Select comfort temperature'});
    this.actions.set('reducedTemperature', {title: 'Reduced', description: 'Select reduced temperature'});

    this.lib.on('notification', (data) => {
      console.log(`Received notification: ${Array.prototype.slice.call(data, 0)}`);
    });

    this.lib.on('error', console.error);

    this.lib.on('connected', () => {
      console.log('Device connected!');
      this.poll();
      if (this.adapter.config.pollInterval)
        this.pollIntervalId = setInterval(this.poll.bind(this), this.adapter.config.pollInterval*1000);
    });

    this.notifyfn = (() => {
      this.connectedNotify(true);
      this.lib.removeListener('notification', this.notifyfn);
      this.lib.removeListener('disconnected', this.disconnectfn);
    }).bind(this);
    this.disconnectfn = (() => {
      this.connectedNotify(false);
      this.lib.removeListener('notification', this.notifyfn);
      this.lib.removeListener('disconnected', this.disconnectfn);
      clearInterval(this.pollIntervalId);
    }).bind(this);
  }

  async performAction(action) {
    action.start();
    switch (action.name) {
      case 'comfortTemperature':
        this.lib.selectComfortTemperature();
        break;
      case 'reducedTemperature':
        this.lib.selectReducedTemperature();
        break;
    }
    action.finish();
  }

  run() {
    if ('dead' in this) {
      console.log(this.id, 'Already dead!');
      return;
    }
    console.log('Run!');
    this.lib.connect();
  }

  poll() {
    if (this.lib.listeners('notification').includes(this.notifyfn) || this.lib.listeners('disconnected').includes(this.disconnectfn)) {
      this.disconnectfn();
    } else {
      this.lib.on('notification', this.notifyfn);
      this.lib.on('disconnected', this.disconnectfn);
      this.lib.setDate();
    }
  }

  stop() {
    console.log(this.id, 'Stop!');
    this.dead = true;
    this.lib.disconnect();
  }

  connectedNotify(stat) {
    super.connectedNotify(stat);
    if (!('connected' in this)) {
      this.connected = stat;
      return;
    }
    if (this.connected !== stat) {
      if (stat) {
        console.log(this.id, 'Connected!');
      } else {
        console.log(this.id, 'Disconnected!');
      }
      this.connected = stat;
    }
  }
}

module.exports = EQ3Device;
