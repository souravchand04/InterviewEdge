import dns from "node:dns";
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";

const DEFAULT_MONGODB_DNS_SERVERS = ["1.1.1.1", "8.8.8.8"];

const sanitizeMongoUri = (uri) => {
  if (!uri) return null;
  const trimmed = uri.trim().replace(/^['"]|['"]$/g, "");
  return trimmed.replace(/\/+$/, "");
};

const buildMongoUri = (uri, dbName) => {
  const mongoBaseUri = sanitizeMongoUri(uri);
  if (!mongoBaseUri || !/^mongodb(\+srv)?:\/\//.test(mongoBaseUri)) {
    throw new Error(
      "Invalid or missing MONGODB_URL. Set a valid mongodb:// or mongodb+srv:// URI in .env"
    );
  }

  const queryIndex = mongoBaseUri.indexOf("?");
  const uriWithoutQuery =
    queryIndex === -1 ? mongoBaseUri : mongoBaseUri.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : mongoBaseUri.slice(queryIndex);
  const authorityStart = uriWithoutQuery.indexOf("://") + 3;
  const pathStart = uriWithoutQuery.indexOf("/", authorityStart);

  if (pathStart === -1) {
    return `${uriWithoutQuery}/${dbName}${query}`;
  }

  const path = uriWithoutQuery.slice(pathStart);
  if (!path || path === "/") {
    return `${uriWithoutQuery.slice(0, pathStart)}/${dbName}${query}`;
  }

  return `${uriWithoutQuery}${query}`;
};

const parseDnsServers = (value) =>
  String(value || "")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

const isLoopbackDnsServer = (server) =>
  server === "::1" || server === "127.0.0.1" || server.startsWith("127.");

const getMongoSrvHostname = (uri) => {
  const mongoBaseUri = sanitizeMongoUri(uri);
  if (!mongoBaseUri?.startsWith("mongodb+srv://")) return null;

  const authority = mongoBaseUri
    .slice(mongoBaseUri.indexOf("://") + 3)
    .split(/[/?#]/)[0];
  const hostWithOptionalPort = authority.includes("@")
    ? authority.slice(authority.lastIndexOf("@") + 1)
    : authority;

  return hostWithOptionalPort.split(":")[0] || null;
};

const setMongoSrvDnsServers = (servers, reason) => {
  dns.setServers(servers);
  console.log(
    `MongoDB SRV DNS servers: ${dns.getServers().join(", ")} (${reason})`
  );
};

const canResolveMongoSrv = async (hostname) => {
  try {
    await dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`);
    return true;
  } catch (error) {
    console.warn(
      `MongoDB SRV DNS lookup failed via system resolver: ${
        error.code || error.message
      }`
    );
    return false;
  }
};

const configureMongoSrvDns = async (uri) => {
  const hostname = getMongoSrvHostname(uri);
  if (!hostname) return;

  const configuredServers = parseDnsServers(process.env.MONGODB_DNS_SERVERS);
  const currentServers = dns.getServers();

  if (configuredServers.length > 0) {
    setMongoSrvDnsServers(configuredServers, "configured");
    return;
  }

  if (
    currentServers.length === 0 ||
    currentServers.every(isLoopbackDnsServer) ||
    !(await canResolveMongoSrv(hostname))
  ) {
    setMongoSrvDnsServers(DEFAULT_MONGODB_DNS_SERVERS, "fallback");
  }
};

const connectDb = async () => {
  try {
    await configureMongoSrvDns(process.env.MONGODB_URL);
    const connectionInstance = await mongoose.connect(
      buildMongoUri(process.env.MONGODB_URL, DB_NAME)
    );
    console.log(
      `\nMongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MONGODB connection Failed:", error);
    process.exit(1);
  }
};

export default connectDb;