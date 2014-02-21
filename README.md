[autoRemote.js](http://github.com/kai-wegner/autoRemote.js)
======

A node.js Module for communication with the AutoApps-Ecosystem developed by João Dias based on AutoRemote.
I hope we can develop a plug&play Linux and Mac OS X Client which can be extended by plugins.
Currently this is only a POC and early alpha stage  

[AutoApps (joaoapps.com)](http://joaoapps.com/)

[AutoRemote for Android (Google PlayStore)](https://play.google.com/store/apps/details?id=com.joaomgcd.autoremote&hl=de)

### Install
```Shell
~$: git clone http://github.com/kai-wegner/autoRemote.js
~$: cd autoRemote.js
~$: npm install autoremote.js
```

### Use
You can use the executable file under "bin/" to send messages and test the register-api.

- Show help message
```Shell
~$: ./autoRemote --help

  Usage: autoRemote [options] [command]

  Commands:

    send <message> <receiverKey>
    register <toDevice_Key>
    getServerKey

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```
- Send a Message/Register to another AutoRemote-Device
see [AutoRemote - Key/ID](http://joaoapps.com/autoremote/personal/) for getting your deviceKey.

```Shell
~$: autoRemote send "Hello World!" yourDeviceKey
~$: autoRemote register yourDeviceKey
```

### Configuration and serverKey-file
Configuration is under "conf/" should contain self-explaining configuration files and the serverKey-File.