var querystring = require('querystring'),
	URL  = require('url'),
	http = require('http'),
	conf = require('./config/env/all');

var deviceKey;

/*** Helper Functions ***/
var getMyId = function(callback) {
	if(callback != null)
		callback(this.deviceKey);
	else return this.deviceKey;
}
var querify = function(paramsObj) {
	var query = '';
	var i = 0;
	for(prop in paramsObj){
		if(i>0){
			query += '&';
		}
		query += prop + '=' + paramsObj[prop];
		i++;
	}
	return query;
}

var doPost = function(url, params, callback, callbackError){
	var post_data = querystring.stringify(params);
	var url_parts = URL.parse(url);
	
	var post_options = {
	    host: url_parts.host,
	    method: 'POST',
	    path:url_parts.path,
	    headers: {
	        'Content-Type': 'application/x-www-form-urlencoded',
	        'Content-Length': post_data.length
	    }
	};

	var post_req = http.request(post_options, function(res) {
	    res.setEncoding('utf8');

	    res.on('data', callback);
	    res.on('error', callbackError);
	});

	post_req.write(post_data);
  	post_req.end();	  
}
var doGet = function(url, callback){
	var url_parts = URL.parse(url);

	console.log('Getting: ' + url);
	var req = http.request(post_options, function(res) {
	    res.setEncoding('utf8');

	    res.on('data', callback);
	});
  	req.end();
}

var handleMessage = function(message) {
	var message = message.payload;
	if(message != null && message != ''){
		console.log('Received message with payload: ' + message);
		if(message.indexOf('communication_base_params') > 0){
			console.log('communicationFromPayload :'+message)
		}else{
			var m = new Message();
			m.message = message;
			m.executeRequest();
		}
	} else {
		getMyId(function(myId){
			if(myId != null){
				var url = 'https://'+conf.hostName+'/getsavedmessages?key=' + myId;
				notify('', 'Getting stored messages from server...', true);
				doGet(url, function(response){
					var responseObject = JSON.parse(response);
					if(responseObject.messages.length > 0)
					{
						for (var i = 0; i < responseObject.messages.length; i++) {
							var message = responseObject.messages[i];
							if(message != null && message != ''){
								handleMessage({'payload':message});
							}
						};
					}
				});
			}else{
				notify('', 'Can\'t get messages. Personal Key is null.');
			}
		});			
	}
}
var getCommunicationFromPayload = function(payload){
	var requestJsonString =payload;
	var json = JSON.parse(requestJsonString);
	var type = json.communication_base_params.type;	
	console.log('Received communication of type: ' + type);
	var communication = new window[type]();
	communication.setPayload(payload);
	communication.fromJson(json)
	return communication;
}
function notify(title, description, system, timeToDisplay, received)
{
	if(title == null || title == '')
		console.log(description+' - System: '+system);
	else
		console.log(title+' - '+description+' - System: '+system);
}

/* TODO: Implement Device Handling */ 
function getDevice(key)
{
	return null;
}
function getExistingDevices()
{
	return [];
}
function setExistingDevices(devices)
{
}
function getForDevice(key, func)
{
	var existingDevices = getExistingDevices();
	for(var i = 0; i < existingDevices.length; i++)
	{
		var device = existingDevices[i];
		if(device.key == key)
		{
			return func(device);
		}
	}
}
function addDevice(key, name, callback)
{
	if(getDevice(key) == null){
		/* TODO: Implement URL-Shortener
		shortenUrl('https://'+conf.hostName+'/?key=' + key, function(shortUrl){
			var devices = getExistingDevices();
			device = {name: name, url: shortUrl, key: key, password: null};
			devices.push(device);
			setExistingDevices(devices);
			if(callback != null){
				callback(true);
			}
			updatemenu();
		});
		*/
		if(callback != null){
			callback(true);
		}
	}else{		
		if(callback != null){
			callback(false);
		}
	}
}




/*** Objects ***/ 

var Communication = function(){
	this.key = null;
	this.sender = getMyId();
	var payload = null;
	this.setPayload = function(payloadReceived){
		payload = payloadReceived;
	}
	this.executeRequest = function(){
		if(this.shouldRedirect()){
			this.redirect();
		}else{
			this.executeRequestSpecific();
		}
	}
	this.redirect = function(){
		console.log('Redirecting ' + this.getCommunicationType());
		var url =  this.getRedirectUrl();
        var params = payload;
        var me = this;
		doPostString(url, params, function(response){
        	var title = null;
        	var description = null;
			console.log(response);
			
			var response = getCommunicationFromPayload(response);
			response.communication_base_params.sender = response.sender;
			if(response.sendRedirectResponse()){
				response.send(true);
			}

			title = me.getCommunicationType() + ' redirected.';
			description = me.getDescription();

			notify(title, description, true);

        }, function(responseObj){
			notify('Error', 'Can\'t redirect ' + me.getCommunicationType());
        });
	}
	this.getCommunicationType = function()
	{
		return 'Communication';
	}

	this.setCommunicationBaseParams = function(){
		this.communication_base_params = {'sender':getMyId(), 'type' : this.getCommunicationType()};
	}

	this.getParams = function(){
		this.setCommunicationBaseParams();
		var json = new Object();
		for(prop in this){
			json[prop] = this[prop];
		}

		return JSON.stringify(json);
	}

	this.getParamsGCM = function(isResponse){
		var type = (isResponse ? 'response' : 'request');
		var params = {'key':this.key, 'sender':this.sender}
		params[type] = this.getParams();
		return params;
	} 

	this.fromJson = function(json){
		for(prop in json){
		  this[prop] = json[prop];
		}
	}
	this.fromJsonString = function(str){
		var json = JSON.parse(str);
		this.fromJson(json);
	}
	this.getRedirectPort = function(){
		var port =  65530;// TODO: Implement redirection
		if(port == '')
		{
			port = null;
		}
		return port;
	}

	this.getRedirectUrl = function(){
		var port = this.getRedirectPort();
		if (port == null){
			port = '1818';
		}
		return 'http://localhost:' +  port + '/';
	}
	this.shouldRedirect = function(){
		return false; // TODO: Implement redirection 
		//return (this.communication_base_params && this.communication_base_params.fallback) || localStorage['redirectAllMessages'] == 'true';
	}
	this.send = function(isResponse){		
		var url = 'https://'+conf.hostName+'/' + this.getHttpEndpoint();
        this.doBeforeSend()
        var params = this.getParamsGCM(isResponse)
		var me = this;

        doPost(url, params, function(response){
        	var title = null;
        	var description = null;
			if(response == 'OK')
			{
				var deviceSentTo = getDevice(me.key);
				if(deviceSentTo != null){
					title = me.getCommunicationType() + ' sent to ' + deviceSentTo.name + '!';
				}else{
					title = me.getCommunicationType() + ' sent!';
				}
				description = me.getDescription();
			}
			else
			{
				title = me.getCommunicationType() + ' NOT sent!';
				description = response;
			}
			notify(title, description, isResponse);
        	me.doAfterSending(response);
        }, function(responseObj){
    		notify('Error', 'Can\'t send ' + me.getCommunicationType());			
        });

	}

	this.doAfterSending = function(response){

	}
	this.getDescription = function(){

	}
	this.openUrl = function(url)
	{
		console.log('Open URL: '+url);
	}
};

var Request = function(){
	this.ttl = '0';
	this.collapseKey = null;

	this.getHttpEndpoint = function(){
		return 'sendrequest';
	}

	this.doBeforeSend = function(){
		if(this.ttl == null || this.ttl == ''){
			this.ttl = '0';
		}
		this.password = getForDevice(this.key,function(device){return device.password;});
	}
};
Request.prototype = new Communication();

var Response = function(){
	this.responseError = null;

	this.getHttpEndpoint = function(){
		return 'sendresponse';
	}

	this.handleResponse = function(){
		
	}
	this.doBeforeSend = function(){
		

	}

	this.sendRedirectResponse = function(){
		return false;
	}
};
Response.prototype = new Communication();

var ResponseNoAction = function(){  
	this.getCommunicationType = function()
	{
		return 'ResponseNoAction';
	}
};

ResponseNoAction.prototype = new Response();

var RequestVersion = function(){  
	this.getCommunicationType = function()
	{
		return 'RequestVersion';
	}
};

RequestVersion.prototype = new Request();

var ResponseVersion = function(){  
	this.version = null;
	this.getCommunicationType = function()
	{
		return 'ResponseVersion';
	}
	this.sendRedirectResponse = function(){
		return true;
	}
};

ResponseVersion.prototype = new Response();

var RequestGetRegistration = function(){  
	this.getCommunicationType = function()
	{
		return 'RequestGetRegistration';
	}
};

RequestGetRegistration.prototype = new Request();
var ResponseGetRegistration = function(){  
	this.id = null;
    this.type = null;
    this.name = null;
    this.localip = null;
    this.publicip = null;
    this.port = null;
    this.haswifi = true;
	this.getCommunicationType = function()
	{
		return 'ResponseGetRegistration';
	}
	this.sendRedirectResponse = function(){
		return true;
	}
};

ResponseGetRegistration.prototype = new Response();

var urlExpression = /^(http[s]?:\/\/(www\.)?|ftp:\/\/(www\.)?|(www\.)?){1}([0-9A-Za-z-\.@:%_\â€Œâ€‹+~#=]+)+((\.[a-zA-Z]{2,3})+)(\/(.)*)?(\?(.)*)?/g;
var Message = function(){  
	this.message = null;
	this.files = null;
	this.password = null;
	this.getCommunicationType = function()
	{
		return 'Message';
	}

	this.executeRequestSpecific = function(){
		var matches = this.message.match(urlExpression);
		if(matches != null){
			for(var i=0;i<matches.length;i++) {				
				var url = matches[i];
				if(url.indexOf('http') < 0)
				{
					url = 'http://' + this.message;
				}
			
				this.openUrl(url);
				
			}
		}
		if(this.files != null && this.files != ''){
			this.files = this.files.split(',');
			for(var i = 0;i<this.files.length;i++){
				this.openUrl(this.files[i]);
			}
		}
		notify('AutoRemote Message', this.message, false,  null, true);				
	}


	this.doAfterSending = function(response){
	}
	this.getDescription = function(){
		return this.message;
	}
};
Message.prototype = new Request();

var RequestSendRegistration = function(){  
	this.id = null;
	this.name = null;
	this.getCommunicationType = function()
	{
		return 'RequestSendRegistration';
	}

	this.executeRequestSpecific = function(){
		var me = this;
		addDevice(this.id, this.name, function(result){		
			if(result){
				notify('Received Device',   me.name + ' added to your device list.');
			}else{
				notify('Received Device',   me.name + ' was already on your list.');
			}
		});	
	}

};
RequestSendRegistration.prototype = new Request();

var RequestSendRegistrations = function(){  
	this.devices = [];
	this.getCommunicationType = function()
	{
		return 'RequestSendRegistrations';
	}

	this.executeRequestSpecific = function(){
		var me = this;
		notify('Received Devices',   'Adding ' + this.devices.length + ' devices to your device list.');
		for(var i = 0;i<this.devices.length;i++){
			var device = this.devices[i];
			addDevice(device.id, device.name);
		}
		
	}

};
RequestSendRegistrations.prototype = new Request();

/** Exports **/
exports.Message = Message;
exports.RequestSendRegistration = RequestSendRegistration;
exports.setDeviceKey = function(deviceKey) {
	this.deviceKey = deviceKey;
}