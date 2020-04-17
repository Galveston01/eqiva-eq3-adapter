const EventEmitter = require('events');

const serviceUUID = '3e135142654f9090134aa6ff5bb77046';
const sendCommandCharacteristicUUID = '3fa4585ace4a3baddb4bb8df8179ea09';
const notificationCharacteristicUUID = 'd0e8434dcd290996af416c90f4e0eb2a';
const serviceUUIDs = [serviceUUID];
const characteristicUUIDs = [sendCommandCharacteristicUUID, notificationCharacteristicUUID];

class EQ3Scanner extends EventEmitter {

  constructor() {
    super();
    this.noble = require('noble');
    this.noble.on('stateChange', ((state) => {
      this.ready = state === 'poweredOn';
      if (this.ready) this.scan();
    }).bind(this));
    this.noble.on('discover', ((peripheral) => {
      this.noble.stopScanning();
      this.emit('discover', new EQ3Lib(peripheral));
    }).bind(this));
  }

  scan() {
    this.noble.stopScanning();
    if (!this.ready)
      throw 'Noble not ready!';
    this.noble.startScanning([serviceUUID]);
  }

}

class EQ3Lib extends EventEmitter {

  constructor(peripheral) {
    super();
    this.id = peripheral.id;
    this.setPeripheral(peripheral);
  }

  setPeripheral(peripheral) {
    this.peripheral = peripheral;

    // Don't know why I have to do these...
    this.peripheral.removeAllListeners('connect');
    this.peripheral.removeAllListeners('disconnect');
    this.peripheral.disconnect();

    this.peripheral.on('disconnect', (() => {
      this.connected = false;
      this.emit('disconnected');
    }).bind(this));

    this.peripheral.on('connect', ((error) => {
      if (error) {
        this.emit('error', error);
        return;
      }

      this.peripheral.discoverSomeServicesAndCharacteristics(
        serviceUUIDs,
        characteristicUUIDs,
        ((error, _services, characteristics) => {
          if (error) {
            this.emit('error', error);
            return;
          }
          this.sendCommandCharacteristic = characteristics[0];
          this.notificationCharacteristic = characteristics[1];

          this.notificationCharacteristic.on('data', (data, _isNotification) => {
            this.emit('notification', data);
            // status notification
            if (data[0] == 0x02 && data[1] == 0x01) {
              if (!(data[2] & 0x30)) {
                this.emit('locked', false);
              } else {
                if ((data[2] & 0x30) == 0x30) {
                  this.emit('locked', true, 'physical keyblock & window detection');
                } else if (data[2] & 0x20) {
                  this.emit('locked', true, 'physical keyblock');
                } else if (data[2] & 0x10) {
                  this.emit('locked', true, 'window detection');
                }
              }
              this.emit('boost', data[2] & 0x04);
              if (data[2] & 0x01) {
                this.emit('mode', 'manual');
              } else if (data[2] & 0x02) {
                const d = new Date();
                d.setYear(data[7]+2000);
                d.setMonth(data[9]);
                d.setDate(data[6]);
                d.setMinutes(data[6]*30);
                this.emit('mode', 'holiday', d);
              } else {
                this.emit('mode', 'auto');
              }
              this.emit('valve', data[3]);
              this.emit('temperature', data[5]/2);
            }
            // answer: setDailyProfile
            if (data[0] == 0x02 && data[1] == 0x02) {
              this.emit('setDailyProfile', data[2]); // (day of week 0...6)
            }
            // answer: requestDailyProfile
            if (data[0] == 0x21) {
              const list = [];
              for (let i = 2; i < data.length; i+=2) {
                if (data[i] == 0x22 && data[i+1] == 0x90) break;
                list[(i-2)/2] = {until: data[i]*10, temperature: data[i+1].temperature/2};
              }
              this.emit('requestDailyProfile', data[1], list); // (day of week 0...6), [{until: (minutes of day), temperature: (number)}, ...]
            }
          });
          this.notificationCharacteristic.subscribe(((error) => {
            if (error) {
              this.emit('error', error);
              return;
            }
            this.connected = true;
            this.emit('connected');
          }).bind(this));
        }).bind(this),
      );
    }).bind(this));
  }

  connect() {
    this.peripheral.connect();
  }

  disconnect() {
    this.peripheral.disconnect();
  }

  sendCommand(cmd) {
    if (!this.connected) {
      this.once('connected', (() => {
        this.sendCommandCharacteristic.write(cmd);
      }).bind(this));
      this.connect();
    } else {
      this.sendCommandCharacteristic.write(cmd);
    }
  }

  setDate() {
    const date = new Date();
    const cmd = new Buffer([0x03, date.getYear()%100, date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()]);
    this.sendCommand(cmd);
  }

  setTemperature(t) {
    const cmd = new Buffer([0x41, Math.round(2*t)]);
    this.sendCommand(cmd);
  }

  selectComfortTemperature() {
    const cmd = new Buffer([0x43]);
    this.sendCommand(cmd);
  }

  selectReducedTemperature() {
    const cmd = new Buffer([0x44]);
    this.sendCommand(cmd);
  }

  setComfortAndReducedTemperatures(ct, rt) {
    const cmd = new Buffer([0x11, Math.round(2*ct), Math.round(2*rt)]);
    this.sendCommand(cmd);
  }

  selectBoost(state) {
    const cmd = new Buffer([0x45, state ? 1 : 0]);
    this.sendCommand(cmd);
  }

  selectAutoMode() {
    const cmd = new Buffer([0x40, 0x00]);
    this.sendCommand(cmd);
  }

  selectManualMode() {
    const cmd = new Buffer([0x40, 0x40]);
    this.sendCommand(cmd);
  }

  selectHolidayMode(t, date) {
    const cmd = new Buffer([0x40, Math.round(2*t)+128, date.getDate(), date.getYear()%100, date.getHours()*2 + Math.round(date.getMinutes()/30), date.getMonth()]);
    this.sendCommand(cmd);
  }

  selectPhysicalKeyblock(state) {
    const cmd = new Buffer([0x80, state ? 1 : 0]);
    this.sendCommand(cmd);
  }

  setTemperatureOffset(t) {
    const cmd = new Buffer([0x13, Math.round(2*t)+7]);
    this.sendCommand(cmd);
  }

  setWindowMode(t, min) {
    const cmd = new Buffer([0x14, Math.round(2*t), Math.round(min/5)]);
    this.sendCommand(cmd);
  }

  // d: 0 = saturday, ..., 6 = friday
  requestDailyProfile(d) {
    const cmd = new Buffer([0x20, d]);
    this.sendCommand(cmd);
  }

  // d: 0 = saturday, ..., 6 = friday
  // list: [{until: (minutes of day), temperature: (number)}, ...]
  setDailyProfile(d, list) {
    if (list.length > 7) {
      this.emit('error', 'Too many entries!');
      return;
    }
    const cmd = new Array(16);
    cmd[0] = 0x10;
    cmd[1] = d;
    for (let i = 0; i < list.length; i++) {
      cmd[2*i+2] = Math.round(list[i].until / 10);
      cmd[2*i+3] = Math.round(2*list[i].temperature);
    }
    this.sendCommand(cmd);
  }

}

module.exports = {EQ3Lib: EQ3Lib, EQ3Scanner: EQ3Scanner};
