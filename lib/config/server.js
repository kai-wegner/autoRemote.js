module.exports = {
    name: "autoNode.js",
    keyFile: '~/.AutoNode/server.key',
    interfaces: {
        public: {
            hostName: 'localhost',
            port: 3000
        },
        local: {
            interface: "lo",
            port: 3000
        }
    }
}