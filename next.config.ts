import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // Enable experimental features for better performance
  experimental: {
    // Enable static optimization
    optimizePackageImports: ["lucide-react", "@radix-ui/react-dialog"],
  },
  // Compile optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Performance optimizations
  reactStrictMode: true,
  compress: true,
};

export default nextConfig;
