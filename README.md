# Eqiva eQ-3 Adapter
Eqiva eQ-3 thermostat (App Calor BT) adapter add-on for Mozilla WebThings Gateway.

# Setup
Install this addon through the addon list or clone it to `~/.mozilla-iot/addons/` using git. 
You may have to take some additional steps. In order to do so, connect to your Pi via SSH and execute:
- `sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev`
- `sudo npm i -g node-gyp`
- `find -path '*noble*Release/hci-ble' -exec sudo setcap cap_net_raw+eip '{}' \;`

Also make sure that bluetooth is enabled on your thermostat. 
