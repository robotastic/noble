var async = require('async');
var noble = require('../index');


noble.on('stateChange', function (state) {
    if (state === 'poweredOn') {
        noble.startScanning();
    } else {
        noble.stopScanning();
    }
});
var arr = [];

function checkAndAdd(address) {
    var id = arr.length + 1;
    var found = arr.some(function (el) {
        return el.address === address;
    });
    if (!found) {
        arr.push({
            id: id,
            address: address
        });
        return true;
    } else {
        return false;
    }
}

noble.on('discover', function (peripheral) {
    if (checkAndAdd(peripheral.address)) {
        noble.stopScanning();
        console.log('\n---------------------------');
        console.log('peripheral with ID ' + peripheral.id + ' found');
        var advertisement = peripheral.advertisement;

        var localName = advertisement.localName;
        var txPowerLevel = advertisement.txPowerLevel;
        var manufacturerData = advertisement.manufacturerData;
        var serviceData = advertisement.serviceData;
        var serviceUuids = advertisement.serviceUuids;

        if (localName) {
            console.log('  Local Name        = ' + localName);
        }

        if (txPowerLevel) {
            console.log('  TX Power Level    = ' + txPowerLevel);
        }

        if (manufacturerData) {
            console.log('  Manufacturer Data = ' + manufacturerData.toString('hex'));
        }

        if (serviceData) {
            console.log('  Service Data      = ' + serviceData);
        }

        if (serviceUuids) {
            console.log('  Service UUIDs     = ' + serviceUuids);
        }

        console.log();

        explore(peripheral);
    }
});

function explore(peripheral) {
    console.log('services and characteristics:');

    peripheral.on('disconnect', function () {
        noble.startScanning();
        console.log("Resuming scanning...");
    });

    peripheral.connect(function (error) {
        console.log("error1: " + error);
        if (!error) {
            peripheral.discoverServices([], function (error, services) {
                var serviceIndex = 0;
                console.log("\tServices discovered: " + services.length);
                console.log("error2: " + error);
                async.whilst(
                    function () {
                        console.log("not there yet");
                        return (serviceIndex < services.length);
                    },
                    function (callback) {
                        var service = services[serviceIndex];
                        var serviceInfo = service.uuid;

                        if (service.name) {
                            serviceInfo += ' (' + service.name + ')';
                        }
                        console.log(serviceInfo);

                        service.discoverCharacteristics([], function (error, characteristics) {
                            var characteristicIndex = 0;
                            console.log("error3: " + error);
                            console.log("\tCharecteristics discovered: " + characteristics.length);
                            async.whilst(
                                function () {
                                    console.log("still going");
                                    return (characteristicIndex < characteristics.length);
                                },
                                function (callback) {
                                    var characteristic = characteristics[characteristicIndex];
                                    var characteristicInfo = '  ' + characteristic.uuid;

                                    if (characteristic.name) {
                                        characteristicInfo += ' (' + characteristic.name + ')';
                                    }

                                    async.series([
                  function (callback) {
                                            characteristic.discoverDescriptors(function (error, descriptors) {
                                                console.log("erro41: " + error);
                                                async.detect(
                                                    descriptors,
                                                    function (descriptor, callback) {
                                                        return callback(descriptor.uuid === '2901');
                                                    },
                                                    function (userDescriptionDescriptor) {
                                                        if (userDescriptionDescriptor) {
                                                            userDescriptionDescriptor.readValue(function (error, data) {
                                                                if (data) {
                                                                    characteristicInfo += ' (' + data.toString() + ')';
                                                                }
                                                                callback();
                                                            });
                                                        } else {
                                                            callback();
                                                        }
                                                    }
                                                );
                                            });
                  },
                  function (callback) {
                                            characteristicInfo += '\n    properties  ' + characteristic.properties.join(', ');

                                            if (characteristic.properties.indexOf('read') !== -1) {
                                                characteristic.read(function (error, data) {
                                                    if (data) {
                                                        var string = data.toString('ascii');

                                                        characteristicInfo += '\n    value       ' + data.toString('hex') + ' | \'' + string + '\'';
                                                    }
                                                    callback();
                                                });
                                            } else {
                                                callback();
                                            }
                  },
                  function () {
                                            console.log(characteristicInfo);
                                            characteristicIndex++;
                                            callback();
                  }
                ]);
                                },
                                function (error) {
                                    serviceIndex++;
                                    callback();
                                }
                            );
                        });
                    },
                    function (err) {

                    }
                );
            });
        } else {
            noble.startScanning();
            console.log("Resuming scanning...");
        }
    });

}
