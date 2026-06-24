import type { NextConfig } from "next";
import os from "os";

// Dynamically detect local network IPs to allow external access in dev mode
const devOrigins = ["localhost", "127.0.0.1"];
try {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === "IPv4" && !alias.internal) {
          const ip = alias.address;
          devOrigins.push(ip);
          // Also support standard port 3000 or custom PORT if set
          const port = process.env.PORT || "3000";
          devOrigins.push(`${ip}:${port}`);
        }
      }
    }
  }
} catch (e) {
  // Ignore interface retrieval errors
}

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
};

export default nextConfig;
