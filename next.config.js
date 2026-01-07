/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // See https://webpack.js.org/configuration/resolve/#resolvealias
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    
    // Externalize mongodb for server-side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('mongodb');
    }
    
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ["llamaindex", "mongodb"],
    outputFileTracingIncludes: {
      "/*": ["./cache/**/*"],
    },
  },
};

module.exports = nextConfig;
