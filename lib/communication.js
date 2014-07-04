var querystring = require('querystring'),
    URL = require('url'),
    http = require('http'),
    https = require('https'),
    conf = require('./config/env/all');

var deviceKey;

/*** Helper Functions ***/
var getMyId = function(callback) {
    if (callback != null)
        callback(this.deviceKey);
    else return this.deviceKey;
}
var querify = function(paramsObj) {
    var query = '';
    var i = 0;
    for (prop in paramsObj) {
        if (i > 0) {
            query += '&';
        }
        query += prop + '=' + paramsObj[prop];
        i++;
    }
    return query;
}
var doPostString = function(ipaddress, port, paramsString, contentType, callback, callbackError) {

    var post_data = paramsString;

    var post_options = {
        host: ipaddress,
        method: 'POST',
        path: "/",
        port: port,
        headers: {
            'Content-Type': contentType,
            'Content-Length': post_data.length
        }
    };

    var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');

        res.on('data', callback);
    });
    post_req.on('error', callbackError);

    post_req.write(post_data);
    post_req.end();
}

var doPost = function(url, params, callback, callbackError) {
    var post_data = querystring.stringify(params);
    var url_parts = URL.parse(url);

    var post_options = {
        host: url_parts.host,
        method: 'POST',
        path: url_parts.path,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': post_data.length
        }
    };

    var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');

        res.on('data', callback);
    });
    post_req.on('error', callbackError);

    post_req.write(post_data);
    post_req.end();
}
var doGet = function(url, callback, callbackError) {

    var post_req = https.request(url, function(res) {
        res.setEncoding('utf8');

        res.on('data', callback);
    });
    post_req.on('error', callbackError);

    post_req.end();
}

var handleMessage = function(message) {
    var message = message.payload;
    if (message != null && message != '') {
        console.log('Received message with payload: ' + message);
        if (message.indexOf('communication_base_params') > 0) {
            console.log('communicationFromPayload :' + message)
        } else {
            var m = new Message();
            m.message = message;
            m.executeRequest();
        }
    } else {
        getMyId(function(myId) {
            if (myId != null) {
                var url = 'https://' + conf.hostName + '/getsavedmessages?key=' + myId;
                notify('', 'Getting stored messages from server...', true);
                doGet(url, function(response) {
                    var responseObject = JSON.parse(response);
                    if (responseObject.messages.length > 0) {
                        for (var i = 0; i < responseObject.messages.length; i++) {
                            var message = responseObject.messages[i];
                            if (message != null && message != '') {
                                handleMessage({
                                    'payload': message
                                });
                            }
                        };
                    }
                });
            } else {
                notify('', 'Can\'t get messages. Personal Key is null.');
            }
        });
    }
}
var getCommunicationFromPayload = function(payload) {
    var json = payload;
    var type = json.communication_base_params.type;
    console.log('Received communication of type: ' + type);
    var communication = new exports[type]();
    communication.setPayload(payload);
    communication.fromJson(json)
    return communication;
}

    function notify(title, description, system, timeToDisplay, received) {
        var notifyString = '';

        var setTitle = false;
        var setDescription = false;
        var setSystem = false;

        if (title != null) setTitle = true;
        if (description != null) setDescription = true;
        if (system != null) setSystem = true;

        if (setTitle && setDescription) notifyString = title + ' - ' + description;
        else if (setTitle) notifyString = title;
        else notifyString = description;

        if (setSystem)
            notifyString += ' - System: ' + system;

        console.log(notifyString);
    }

    /* TODO: Implement Device Handling */
    function getDevice(key) {
        return null;
    }

    function getExistingDevices() {
        return [];
    }

    function setExistingDevices(devices) {}

    function getForDevice(key, func) {
        var existingDevices = getExistingDevices();
        for (var i = 0; i < existingDevices.length; i++) {
            var device = existingDevices[i];
            if (device.key == key) {
                return func(device);
            }
        }
    }

    function getLongUrl(shortUrl, callback) {
        doGet("https://www.googleapis.com/urlshortener/v1/url?shortUrl=" + shortUrl, function(response) {
            response = JSON.parse(response);
            callback(response.longUrl);
        }, function(error) {
            console.log(error);
        });
    }

    function addDevice(key, name, callback) {
        if (getDevice(key) == null) {
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
            if (callback != null) {
                callback(true);
            }
        } else {
            if (callback != null) {
                callback(false);
            }
        }
    }




    /*** Objects ***/

var Communication = function() {
    this.key = null;
    this.sender = getMyId();
    var payload = null;
    this.setPayload = function(payloadReceived) {
        payload = payloadReceived;
    }
    this.executeRequest = function() {
        if (this.shouldRedirect()) {
            return this.redirect();
        } else {
            var response = this.executeRequestSpecific();
            if (response == null) {
                response = new ResponseNoAction();
                response.setCommunicationBaseParams();
            }
            return response;
        }
    }
    this.redirect = function() {
        console.log('Redirecting ' + this.getCommunicationType());
        var url = this.getRedirectUrl();
        var params = payload;
        var me = this;
        doPostString(url, params, function(response) {
            var title = null;
            var description = null;
            console.log(response);

            var response = getCommunicationFromPayload(response);
            response.communication_base_params.sender = response.sender;
            if (response.sendRedirectResponse()) {
                response.send(true);
            }

            title = me.getCommunicationType() + ' redirected.';
            description = me.getDescription();

            notify(title, description, true);

        }, function(responseObj) {
            notify('Error', 'Can\'t redirect ' + me.getCommunicationType());
        });
    }
    this.getCommunicationType = function() {
        return 'Communication';
    }

    this.setCommunicationBaseParams = function() {
        this.communication_base_params = {
            'sender': getMyId(),
            'type': this.getCommunicationType()
        };
    }

    this.getParams = function() {
        this.setCommunicationBaseParams();
        var json = new Object();
        for (prop in this) {
            json[prop] = this[prop];
        }

        return JSON.stringify(json);
    }

    this.getParamsGCM = function(isResponse) {
        var type = (isResponse ? 'response' : 'request');
        var params = {
            'key': this.key,
            'sender': this.sender
        }
        params[type] = this.getParams();
        return params;
    }

    this.fromJson = function(json) {
        for (prop in json) {
            this[prop] = json[prop];
        }
    }
    this.fromJsonString = function(str) {
        var json = JSON.parse(str);
        this.fromJson(json);
    }
    this.getRedirectPort = function() {
        var port = 65530; // TODO: Implement redirection
        if (port == '') {
            port = null;
        }
        return port;
    }

    this.getRedirectUrl = function() {
        var port = this.getRedirectPort();
        if (port == null) {
            port = '1818';
        }
        return 'http://localhost:' + port + '/';
    }
    this.shouldRedirect = function() {
        return false; // TODO: Implement redirection
        //return (this.communication_base_params && this.communication_base_params.fallback) || localStorage['redirectAllMessages'] == 'true';
    }
    this.send = function(device) {
        if (device == null) {
            console.log("Can't send message. No device provided");
            return;
        }
        console.log("Sending " + this.getCommunicationType() + " to " + device.name);
        this.doBeforeSend();
        this.key = device.id;
        var me = this;

        var params = this.getParams();

        doPostString(device.localip, device.port, params, "application/json", function(response) {
            response = JSON.parse(response);
            var responseObj = getCommunicationFromPayload(response);
        }, function(responseObj) {
            console.log("Couldn't send through local ip. Trying GCM");
            var url = 'https://' + conf.hostName + '/' + me.getHttpEndpoint();
            var params = me.getParamsGCM(false);
            doPost(url, params, function(response) {
                var title = null;
                var description = null;
                if (response == 'OK') {
                    var deviceSentTo = getDevice(me.key);
                    if (deviceSentTo != null) {
                        title = me.getCommunicationType() + ' sent to ' + deviceSentTo.name + '!';
                    } else {
                        title = me.getCommunicationType() + ' sent!';
                    }
                    description = me.getDescription();
                } else {
                    title = me.getCommunicationType() + ' NOT sent!';
                    description = response;
                }
                notify(title, description, false);
                me.doAfterSending(response);
            }, function(responseObj) {
                notify('Error', 'Can\'t send ' + me.getCommunicationType());
            });
        });



    }

    this.doAfterSending = function(response) {

    }
    this.getDescription = function() {

    }
    this.openUrl = function(url) {
        console.log('Open URL: ' + url);
    }
};

var Request = function() {
    this.ttl = '0';
    this.collapseKey = null;

    this.getHttpEndpoint = function() {
        return 'sendrequest';
    }

    this.doBeforeSend = function() {
        if (this.ttl == null || this.ttl == '') {
            this.ttl = '0';
        }
        this.password = getForDevice(this.key, function(device) {
            return device.password;
        });
    }
};
Request.prototype = new Communication();

var Response = function() {
    this.responseError = null;

    this.getHttpEndpoint = function() {
        return 'sendresponse';
    }

    this.handleResponse = function() {

    }
    this.doBeforeSend = function() {


    }

    this.sendRedirectResponse = function() {
        return false;
    }
};
Response.prototype = new Communication();

var ResponseNoAction = function() {
    this.getCommunicationType = function() {
        return 'ResponseNoAction';
    }
};

ResponseNoAction.prototype = new Response();
var ResponseBasic = function() {
    this.getCommunicationType = function() {
        return 'ResponseBasic';
    }
};

ResponseBasic.prototype = new Response();

var RequestVersion = function() {
    this.getCommunicationType = function() {
        return 'RequestVersion';
    }
};

RequestVersion.prototype = new Request();

var ResponseVersion = function() {
    this.version = null;
    this.getCommunicationType = function() {
        return 'ResponseVersion';
    }
    this.sendRedirectResponse = function() {
        return true;
    }
};

ResponseVersion.prototype = new Response();

var RequestGetRegistration = function() {
    this.getCommunicationType = function() {
        return 'RequestGetRegistration';
    }
};

RequestGetRegistration.prototype = new Request();
var ResponseGetRegistration = function() {
    this.id = null;
    this.type = null;
    this.name = null;
    this.localip = null;
    this.publicip = null;
    this.port = null;
    this.haswifi = true;
    this.getCommunicationType = function() {
        return 'ResponseGetRegistration';
    }
    this.sendRedirectResponse = function() {
        return true;
    }
};

ResponseGetRegistration.prototype = new Response();

var urlExpression = /^(http[s]?:\/\/(www\.)?|ftp:\/\/(www\.)?|(www\.)?){1}([0-9A-Za-z-\.@:%_\â€Œâ€‹+~#=]+)+((\.[a-zA-Z]{2,3})+)(\/(.)*)?(\?(.)*)?/g;
var Message = function() {
    this.message = null;
    this.files = null;
    this.password = null;
    this.getCommunicationType = function() {
        return 'Message';
    }

    this.executeRequestSpecific = function() {
        return null;
    }


    this.doAfterSending = function(response) {}
    this.getDescription = function() {
        return this.message;
    }
};
Message.prototype = new Request();
var Notification = function() {

    this.title = null;
    this.text = null;
    this.subtext = null;
    this.icon = null;
    this.picture = null;
    this.message = null;
    this.action = null;
    this.actionpopup = null;
    this.action1 = null;
    this.action1name = null;
    this.action1icon = null;
    this.action1iconpath = null;
    this.button1popup = null;
    this.action2 = null;
    this.action2name = null;
    this.action2icon = null;
    this.action2iconpath = null;
    this.button2popup = null;
    this.action3 = null;
    this.action3name = null;
    this.action3icon = null;
    this.action3iconpath = null;
    this.actionondismiss = null;
    this.dismisspopup = null;
    this.url = null;
    this.id = null;
    this.cancel = false;

    var me = this;

    this.getCommunicationType = function() {
        return "Notification";
    }
    this.shouldRedirect = function() {
        return false;
    }
    this.getButtonMessage = function(index) {
        if (index == 0) {
            return this.action1;
        } else if (index == 1) {
            return this.action2;
        }
    }
    this.getButtonPopup = function(index) {
        if (index == 0) {
            return this.button1popup;
        } else if (index == 1) {
            return this.button2popup;
        }
    }
    this.executeRequestSpecific = function() {
        return null;
    }
    this.sendMessage = function(text, popupText) {
        if (popupText == null || popupText == "") {
            if (text != null && text != "") {
                var message = new Message();
                message.buttonAction = true;
                message.key = this.sender;
                message.sender = getMyId();
                message.message = text;
                message.send();
            }
        } else {
            var popupInput = prompt(popupText);
            if (popupInput != null) {
                text = text + popupInput;
                this.sendMessage(text);
            }
        }
    }
    this.sendButtonMessage = function(buttonIndex) {
        this.sendMessage(this.getButtonMessage(buttonIndex), this.getButtonPopup(buttonIndex));
    }
    this.sendActionMessage = function() {
        if (this.url == null) {
            this.sendMessage(this.action, this.actionpopup);
        } else {
            this.openUrl(this.url);
        }
    }
    this.sendActionOnDismissMessage = function() {
        this.sendMessage(this.actionondismiss, this.dismisspopup);
    }
    this.notify = function(system, timeToDisplay, received) {
        if (me.cancel && me.id != null) {
            chrome.notifications.clear(me.id, function() {});
        } else {
            if (this.message != null) {
                this.sendMessage(this.message);
            }
            var showNotifications = localStorage["showNotifications"] == null || localStorage["showNotifications"] == "true";
            var showSystemNotifications = localStorage["showNotificationsSystem"] == null || localStorage["showNotificationsSystem"] == "true";
            if ((showNotifications && !system) || (showSystemNotifications && system)) {

                if (received == null) {
                    received = false;
                }
                if (timeToDisplay == null || !timeToDisplay) {
                    timeToDisplay = 3000;
                }
                var autoHideOptionSelected = localStorage["autoHideNotifications"] == "true";
                var autoHideOptionReceivedSelected = localStorage["autoHideNotificationsReceived"] == "true";
                var shouldClearNotification = (!received && autoHideOptionSelected) || (received && autoHideOptionReceivedSelected) || system;
                if (!chrome.notifications) {
                    //doGet("http://localhost:8888/getimageurl?url=http://www.gravatar.com/avatar/88f13000ab7cc1f5eaa62c6a78632b4d?s=32&d=identicon&r=PG", function(imageUrl){
                    var notification = webkitNotifications.createNotification('autoremotebig.png', this.title, this.text);
                    notification.show();
                    if (shouldClearNotification) {
                        setInterval(function() {
                            notification.cancel();
                        }, timeToDisplay);
                    }
                    //});
                } else {

                    doGetBase64Image(me.action1iconpath, function(button1IconBase64) {
                        doGetBase64Image(me.action2iconpath, function(button2IconBase64) {
                            doGetBase64Image(me.action3iconpath, function(button3IconBase64) {
                                doGetBase64Image(me.picture, function(imageBase64) {
                                    doGetBase64Image(me.icon, function(iconBase64) {
                                        if (me.title == null) {
                                            me.title = "";
                                        }
                                        if (me.text == null) {
                                            me.text = "";
                                        }
                                        var options = {
                                            type: imageBase64 != null ? "image" : "basic",
                                            title: me.title,
                                            message: me.text,
                                            expandedMessage: me.subtext,
                                            iconUrl: getIcon(iconBase64)
                                        }
                                        if (imageBase64 != null) {
                                            options.imageUrl = imageBase64;
                                        }
                                        var buttons = [];
                                        if (me.action1name != null) {
                                            var label = me.action1name;
                                            var icon = getIcon(button1IconBase64);
                                            buttons.push({
                                                title: label,
                                                iconUrl: icon
                                            });
                                        }
                                        if (me.action2name != null) {
                                            var label = me.action2name;
                                            var icon = getIcon(button2IconBase64);
                                            buttons.push({
                                                title: label,
                                                iconUrl: icon
                                            });
                                        }
                                        if (me.action3name != null) {
                                            var label = me.action3name;
                                            var icon = getIcon(button3IconBase64);
                                            buttons.push({
                                                title: label,
                                                iconUrl: icon
                                            });
                                        }
                                        options.buttons = buttons;

                                        var id = me.id;
                                        if (id == null) {
                                            id = GUID();
                                        }
                                        chrome.notifications.create(id, options, function(notificationId) {
                                            window[notificationId] = me;
                                            if (shouldClearNotification) {
                                                setInterval(function() {
                                                    chrome.notifications.clear(notificationId, function() {})
                                                }, timeToDisplay);
                                            }
                                        });

                                    });
                                });
                            });
                        });
                    });

                }
            }

        }
    }
};
Notification.prototype = new Request();
var DeviceAdditionalProperties = function() {
    this.iconUrl = null;
    this.type = null;
    this.canReceiveFiles = false;
}
var RequestSendRegistration = function() {
    this.id = null;
    this.name = null;
    this.type = null;
    this.localip = null;
    this.publicip = null;
    this.port = null;
    this.haswifi = null;
    this.additional = new DeviceAdditionalProperties();
    this.getCommunicationType = function() {
        return 'RequestSendRegistration';
    }

    this.executeRequestSpecific = function() {
        var me = this;
        addDevice(this.id, this.name, function(result) {
            if (result) {
                notify('Received Device', me.name + ' added to your device list.');
            } else {
                notify('Received Device', me.name + ' was already on your list.');
            }
        });
    }

};
RequestSendRegistration.prototype = new Request();

var RequestSendRegistrations = function() {
    this.devices = [];
    this.getCommunicationType = function() {
        return 'RequestSendRegistrations';
    }

    this.executeRequestSpecific = function() {
        var me = this;
        notify('Received Devices', 'Adding ' + this.devices.length + ' devices to your device list.');
        for (var i = 0; i < this.devices.length; i++) {
            var device = this.devices[i];
            addDevice(device.id, device.name);
        }

    }

};
RequestSendRegistrations.prototype = new Request();

/** Exports **/
exports.Message = Message;
exports.Notification = Notification;
exports.RequestSendRegistration = RequestSendRegistration;
exports.ResponseNoAction = ResponseNoAction;
exports.ResponseBasic = ResponseBasic;
exports.setDeviceKey = function(deviceKey) {
    this.deviceKey = deviceKey;
}
exports.getCommunicationFromPayload = getCommunicationFromPayload;
exports.getLongUrl = getLongUrl;