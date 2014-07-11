module.exports = {
    name: "AutoNode",
    keyFile: '~/.AutoNode/server.key',
    interfaces: {
        public: {
            hostName: 'localhost',
            port: 1337
        },
        local: {
            interface: 'eth0',
            port: 1337
        }
    }
}