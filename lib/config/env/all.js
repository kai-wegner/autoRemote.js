module.exports = {
	hostName:'autoremotejoaomgcd.appspot.com',
	registerURLPattern: '/registerpc'+
				'?key={{device.key}}&'+
				'name={{device.name}}&'+
				'id={{device.id}}&'+
				'publicip={{device.public.ip}}:{{device.public.port}}&'+
				'localip={{device.local.ip}}:{{device.local.port}}',
	sendMessageURLPattern: '/sendmessage?key={{device.key}}&message={{message}}'
}