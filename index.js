import { execSync } from "child_process";
import * as net from "net";

const {
  SRP_TIMEOUT: timeoutLengthString,
  SRP_PROXY_HOSTNAME: proxyHostname = "localhost",
  SRP_PROXY_PORT: proxyPortString,
  SRP_PORT: portString
} = process.env;
const timeoutLength = Number(timeoutLengthString);
const proxyPort = Number(proxyPortString);
const port = Number(portString);

const server = net.createServer();

const stopServer = () => execSync("poweroff");

const buildConnectionHandler = () => {
  let connections = 0;
  let closeTimeout = setTimeout(stopServer, timeoutLength);

  const buildCloseEventHandler = () => {
    let closed = false;

    return (sock) => () => {
      if (!closed) {
        closed = true;
        connections -= 1;
        sock.end();

        if (connections === 0) {
          closeTimeout = setTimeout(stopServer, timeoutLength);
        }
      }
    };
  };

  return (socket) => {
    connections += 1;
    clearTimeout(closeTimeout);
    const connection = net.createConnection(proxyPort, proxyHostname);
    socket.pipe(connection);
    connection.pipe(socket);

    const closeIfNotClosed = buildCloseEventHandler();
    socket.on("error", closeIfNotClosed(connection));
    socket.on("close", closeIfNotClosed(connection));
    connection.on("error", closeIfNotClosed(socket));
    connection.on("close", closeIfNotClosed(socket));
  };
};

server.on("connection", buildConnectionHandler());

server.listen(port, () => console.log(`Listening on port ${port}`));
