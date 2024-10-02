const { ExpressPeerServer } = require("peer");

function setupPeerServer(server) {
  const peerServer = ExpressPeerServer(server, {
    path: "/peerjs",
    debug: true, // Enable debugging to help track connection issues
    allow_discovery: true, // Allows peers to discover each other
  });

  // Log incoming connections for debugging purposes
  peerServer.on('connection', (client) => {
    console.log(`Peer connected: ${client.getId()}`);
  });

  peerServer.on('disconnect', (client) => {
    console.log(`Peer disconnected: ${client.getId()}`);
  });

  return peerServer;
}

module.exports = { setupPeerServer };
