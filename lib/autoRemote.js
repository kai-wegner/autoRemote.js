var http        = require('http'),
	os          = require('os'),
	dns 		= require('dns'),
	mustache    = require('mustache'),
	when		= require('when'),
	_			= require('underscore'),
	conf        = require('./config/env/all'),
	serverConf  = require('./config/server');

function getIP(interface) {
	var ipLookup = when.defer();
	// TODO implement call to server which return our public IP


	// when the ip is known just return it
	if(interface.ip != null) 
		ipLookup.resolve(interface.ip);
	// resolve DNS for getting our public IP
	else if(interface.hostName != null) {
		dns.lookup(interface.hostName,4, function(err,address) {
			ipLookup.resolve(address);
		});		
	}
	// get IP from that interface
	else if(interface.interface != null)
		ipLookup.resolve(getInterfaceIP(interface.interface));
	
	return ipLookup.promise;
}

function getInterfaceIP(interface) {
	var ifaces=os.networkInterfaces();

	for (var dev in ifaces) {
	  var alias=0;

	  for(var i=0; i < ifaces[dev].length;i++) {
	  	var details = ifaces[dev][i];

		if (details.family=='IPv4') {
		  var interfaceName = dev+(alias?':'+alias:'');

		  if(interfaceName == interface) {
		  	return details.address;
		  }
		  ++alias;
		}
	  }
	}   
}

/**
	Creates a sting for the registration of devices like:
	/registerpc?key=DEVICE_PERSONAL_KEY
		&name=DEVICE_NAME
		&id=DEVICE_ID
		&publicip=DEVICE_PUBLIC_IP:DEVICE_PUBLIC_PORT
		&localip=DEVICE_LOCAL_IP:DEVICE_LOCAL_PORT
	uses the mustache-module for rendering the pattern which
	is configured in "./conf/env/all.js".
**/
function getAutoRemoteRegisterPath(device,serverConfig) {
	if(serverConfig == null)
		serverConfig = _serverConfig;

	var pattern = conf.registerURLPattern;
	var patternConfig = {'device':{}}

	_.extend(patternConfig.device,
		device,
		serverConfig.interfaces);

	return mustache.render(pattern,patternConfig);
}
exports.getAutoRemoteRegisterPath = getAutoRemoteRegisterPath;

var _serverConfig = null;
var getServerConfig = function(serverConfig) {
	var promise = when.defer();

	// No initial server config found - generate one and return it
	if(_serverConfig == null && serverConfig == null) {
		var _serverConfig = {
			interfaces: {
				public:{
				},
				local:{
				}
			}		
		}
		
		_.extend(_serverConfig,serverConf);

		var localIP_promise	 = getIP(_serverConfig.interfaces.local);
		var publicIP_promise = getIP(_serverConfig.interfaces.public);

		when.all([localIP_promise,publicIP_promise])
			.then(function(ips) {
				_serverConfig.interfaces.local.ip  = ips[0];
				_serverConfig.interfaces.public.ip = ips[1];

				promise.resolve(_serverConfig);
			});
	}
	// merge current _serverConfig and supplied serverConfig 
	else if(_serverConfig != null && serverConfig != null) {
		_.extend(serverConfig,_serverConfig);

		promise.resolve(serverConfig);
	}
	// return the supplied serverConfig since there is nothing we can merge it with
	else if(_serverConfig == null && serverConfig != null) 
		promise.resolve(serverConfig);
	// otherwise
	else promise.resolve(_serverConfig);

	return promise.promise;
}
exports.getServerConfig = getServerConfig;

/**
	This registers a device to AutoRemote.

	example device object:
	device:{
		key:"yourDeviceKey",
		id:"MyDevice",
		name:"MyDevice"
	}
**/
exports.registerDevice = function(device,serverConfig) {
	getServerConfig(serverConfig).
		then(function(serverConfig) {
			var requestOptions = {};

			requestOptions.path = getAutoRemoteRegisterPath(device,serverConfig);
			requestOptions.host = conf.hostName;

			http.request(requestOptions, function(response) {
				var str = '';

				//another chunk of data has been recieved, so append it to `str`
				response.on('data', function (chunk) {
					str += chunk;
				});

				//the whole response has been recieved, so we just print it out here
				response.on('end', function () {
					console.log(str);
				});		
			}).end();			
		});
}

exports.sendMessageToDevice = function(device,message) {
	var pattern = conf.sendMessageURLPattern;
	var patternConfig = {'device':{},'message':message}

	_.extend(patternConfig.device, device);

	var requestOptions = {};
	requestOptions.path = mustache.render(pattern,patternConfig);
	requestOptions.host = conf.hostName;

	console.log(requestOptions);
	http.request(requestOptions, function(response) {
		var str = '';

		//another chunk of data has been recieved, so append it to `str`
		response.on('data', function (chunk) {
			str += chunk;
		});

		//the whole response has been recieved, so we just print it out here
		response.on('end', function () {
			console.log(str);
		});		
	}).end();
}