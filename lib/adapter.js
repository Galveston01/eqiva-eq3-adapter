'use strict';

const Adapter = require('gateway-addon').Adapter;
const Database = require('gateway-addon').Database;
const manifest = require('../manifest.json');
const EQ3Scanner = require('./eq3lib').EQ3Scanner;
const EQ3Device = require('./device');

class EqivaEQ3Adapter extends Adapter {
  constructor(addonManager) {
    super(addonManager, 'EqivaEQ3Adapter', manifest.id);
    addonManager.addAdapter(this);
    this.savedDevices = [];

    this.db = new Database(this.packageName);
    this.db.open().then((() => {
      return this.db.loadConfig();
    }).bind(this)).then(((config) => {
      this.config = config;
      return Promise.resolve();
    }).bind(this)).then((() => {
      this.scanner = new EQ3Scanner();
      this.scanner.on('discover', (lib) => {
        let d;
        if (this.devices[`eqiva-eq3-${lib.id}`]) {
          d = this.devices[`eqiva-eq3-${lib.id}`];
          d.lib.setPeripheral(lib.peripheral);
          console.log('Updated pheripheral', d.id);
        } else {
          d = new EQ3Device(this, `eqiva-eq3-${lib.id}`, lib);
          this.handleDeviceAdded(d);
        }
        if (this.savedDevices.includes(d.id)) {
          console.log('Thing saved later', d.id);
          d.run();
        }
      });
      this.scanner.scan();
      setInterval((() => {
        this.scanner.scan();
      }).bind(this), this.config.pollInterval*1000);
    }).bind(this)).catch(console.error);
  }

  handleDeviceAdded(device, reload = false) {
    super.handleDeviceAdded(device);
    if (reload) return;
    console.log('Thing added', device.id);
    device.connectedNotify(false);
  }

  handleDeviceUpdated(device) {
    super.handleDeviceAdded(device, true);
    console.log('Thing updated', device.id);
  }

  handleDeviceSaved(deviceId) {
    super.handleDeviceSaved(deviceId);
    this.savedDevices.push(deviceId);
    if (this.devices[deviceId]) {
      const device = this.devices[deviceId];
      console.log('Thing saved', deviceId);
      device.connectedNotify(false);
      device.run();
    }
  }

  startPairing(_timeoutSeconds) {
    console.log('Pairing started');
    try {
      this.scanner.scan();
    } catch (error) {
      console.error('Error during scan', error);
    }
  }

  cancelPairing() {
    console.log('Pairing cancelled');
  }

  handleDeviceRemoved(device) {
    super.handleDeviceRemoved(device);
    device.stop();
    console.log('Thing removed', device.id);
  }

  removeThing(device) {
    console.log('Remove thing', device.id);

    this.handleDeviceRemoved(device);
    if (this.savedDevices.includes(device.id))
      this.savedDevices.splice(this.savedDevices.indexOf(device.id), 1);
  }

  cancelRemoveThing(device) {
    console.log('cancel removing thing', device.id);
  }
}

module.exports = EqivaEQ3Adapter;
