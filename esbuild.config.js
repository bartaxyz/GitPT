const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Clean the dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

// Create dist directory
fs.mkdirSync('dist', { recursive: true });

// Build the application
esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/index.js',
  format: 'esm',
  banner: {
    js: '#!/usr/bin/env node',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  // Exclude node built-in modules from bundling
  external: [
    'node:*',
    'fs',
    'path',
    'url',
    'util',
    'child_process',
    'crypto',
    'os',
    'stream',
    'readline',
    'tty',
    'zlib',
    'http',
    'https',
    'net',
    'querystring',
  ],
  // Enable source maps for better debugging
  sourcemap: true,
  // Enable tsconfig paths resolution
  resolveExtensions: ['.ts', '.js'],
  plugins: [
    {
      name: 'alias-resolver',
      setup(build) {
        // Resolve path aliases from tsconfig.json
        build.onResolve({ filter: /^@services\// }, args => {
          const newPath = args.path.replace('@services/', 'src/services/');
          return { path: path.resolve(args.resolveDir, '..', '..', newPath) };
        });
        
        build.onResolve({ filter: /^@middleware\// }, args => {
          const newPath = args.path.replace('@middleware/', 'src/commands/middleware/');
          return { path: path.resolve(args.resolveDir, '..', '..', newPath) };
        });

        build.onResolve({ filter: /^@config$/ }, args => {
          return { path: path.resolve(args.resolveDir, '..', '..', 'src/config.ts') };
        });
      }
    }
  ]
}).then(() => {
  // Make the output file executable
  fs.chmodSync('dist/index.js', '755');
  console.log('Build completed successfully!');
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});