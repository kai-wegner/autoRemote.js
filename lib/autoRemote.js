var http = require('http'),
    os = require('os'),
    fs = require('fs-extra'),
    dns = require('dns'),
    mustache = require('mustache'),
    when = require('when'),
    uuid = require('node-uuid'),
    googl = require('goo.gl'),
    _ = require('underscore'),
    conf = require('./config/env/all'),
    serverConf = require('./config/server'),
    arcomm = require('./communication');

serverConf.keyFile = serverConf.keyFile.replace('~', process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE);

var _serverKey = null;
try {
    _serverKey = fs.readFileSync(serverConf.keyFile, 'utf8');
} catch (exception) {
    getServerKey();
}

arcomm.setDeviceKey(_serverKey);

function getIP(interface) {
    var ipLookup = when.defer();
    // TODO implement call to server which return our public IP


    // when the ip is known just return it
    if (interface.ip != null)
        ipLookup.resolve(interface.ip);
    // resolve DNS for getting our public IP
    else if (interface.hostName != null) {
        dns.lookup(interface.hostName, 4, function(err, address) {
            ipLookup.resolve(address);
        });
    }
    // get IP from that interface
    else if (interface.interface != null)
        ipLookup.resolve(getInterfaceIP(interface.interface));

    return ipLookup.promise;
}

function getInterfaceIP(interface) {
    var ifaces = os.networkInterfaces();

    for (var dev in ifaces) {
        var alias = 0;

        for (var i = 0; i < ifaces[dev].length; i++) {
            var details = ifaces[dev][i];

            if (details.family == 'IPv4') {
                var interfaceName = dev + (alias ? ':' + alias : '');
                if (interfaceName == interface) {
                    return details.address;
                }
                ++alias;
            }
        }
    }
}

var _serverConfig = null;
var getServerConfig = function(serverConfig) {
    var promise = when.defer();

    // No initial server config found - generate one and return it
    if (_serverConfig == null && serverConfig == null) {
        var _serverConfig = {
            interfaces: {
                public: {},
                local: {}
            }
        }

        _.extend(_serverConfig, serverConf);

        var localIP_promise = getIP(_serverConfig.interfaces.local);
        var publicIP_promise = getIP(_serverConfig.interfaces.public);

        when.all([localIP_promise, publicIP_promise])
            .then(function(ips) {
                _serverConfig.interfaces.local.ip = ips[0];
                _serverConfig.interfaces.public.ip = ips[1];

                promise.resolve(_serverConfig);
            });
    }
    // merge current _serverConfig and supplied serverConfig
    else if (_serverConfig != null && serverConfig != null) {
        _.extend(serverConfig, _serverConfig);

        promise.resolve(serverConfig);
    }
    // return the supplied serverConfig since there is nothing we can merge it with
    else if (_serverConfig == null && serverConfig != null)
        promise.resolve(serverConfig);
    // otherwise
    else promise.resolve(_serverConfig);

    return promise.promise;
}
exports.getServerConfig = getServerConfig;

function getServerKey() {
    if (_serverKey == null) {
        _serverKey = uuid.v4();
        fs.outputFile(serverConf.keyFile, _serverKey, function(err) {
            if (err) {
                console.log('There has been an error saving your server key.');
                console.log(err.message);
                return;
            }
        });
    }

    return _serverKey;
}
exports.getServerKey = getServerKey;

/**
  This registers a server to another AutoRemote-device.

  example device object:
  device:{
    key:"yourDeviceKey",
  }
**/
exports.registerServerToDevice = function(serverConfig, device, callback) {
    getServerConfig(serverConfig).
    then(function(serverConfig) {
        var registration_message = new arcomm.RequestSendRegistration();

        registration_message.id = _serverKey;
        registration_message.sender = _serverKey;
        registration_message.key = device.key;
        registration_message.name = serverConfig.name;
        registration_message.type = "plugin";
        registration_message.localip = serverConfig.interfaces.local.ip;
        //registration_message.publicip = serverConfig.interfaces.public.ip;
        //registration_message.publicip = null;
        registration_message.localport = serverConfig.interfaces.local.port;

        var publicPort = serverConfig.interfaces.public.port.toString();
        registration_message.publicport = serverConfig.interfaces.public.port;
        registration_message.port = publicPort;
        registration_message.haswifi = true;
        registration_message.additional.iconUrl = "http://joaoapps.com/AutoApps/autonode.png";
        registration_message.additional.type = 'AutoNode';
        registration_message.additional.canReceiveFiles = false;
        registration_message.additional.canReceiveNotifications = true;
        registration_message.send(device, callback);
    });
}

exports.sendMessageToDevice = function(device, message, callback) {
    var out_message = new arcomm.Message();

    //in the cases where only a key is passed, create a new device with just the id
    if (device.id == null) {
        device = {
            "id": device.key
        };
    }
    out_message.sender = _serverKey;
    out_message.message = message;

    out_message.send(device, callback);
}

exports.setConfig = function(configuration) {
    this._serverConfig = configuration;
}

exports.getCommunicationFromPayload = function(payload) {
    return arcomm.getCommunicationFromPayload(payload);
}

exports.getLongUrl = arcomm.getLongUrl;