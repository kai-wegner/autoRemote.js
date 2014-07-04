module.exports = {
    name: "autoNode.js",
    keyFile: '~/.AutoNode/server.key',
    interfaces: {
        public: {
            hostName: 'localhost',
            port: 3000
        },
        local: {
            hostName: '192.168.1.72',
            port: 3000
        }
    }
}