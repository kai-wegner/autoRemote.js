module.exports = {
	name:"autoNode.js",
	keyFile:'~/.AutoNode/server.key',
	interfaces: {
		public:{
			hostName:'ki.dyndns.org',
			port:3000
		},
		local:{
			interface:'en0',
			port:3000
		}
	}
}
