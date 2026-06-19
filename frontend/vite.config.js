import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import fs from 'fs';
import path from 'path';

function soundsManifestPlugin() {
  const VIRTUAL_ID = 'virtual:sounds';
  const RESOLVED   = '\0' + VIRTUAL_ID;

  function readSounds(publicDir) {
    return fs.readdirSync(publicDir)
      .filter(f => f.toLowerCase().endsWith('.mp3'))
      .map(f => `/${f}`);
  }

  return {
    name: 'sounds-manifest',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED;
    },
    load(id) {
      if (id === RESOLVED) {
        const publicDir = path.resolve(__dirname, 'public');
        const files = readSounds(publicDir);
        return `export default ${JSON.stringify(files)}`;
      }
    },
    configureServer(server) {
      // hot-reload virtual module when public/*.mp3 files change
      server.watcher.on('add',    f => { if (f.endsWith('.mp3')) invalidate(server); });
      server.watcher.on('unlink', f => { if (f.endsWith('.mp3')) invalidate(server); });
    },
  };

  function invalidate(server) {
    const mod = server.moduleGraph.getModuleById('\0virtual:sounds');
    if (mod) server.moduleGraph.invalidateModule(mod);
    server.ws.send({ type: 'full-reload' });
  }
}

export default defineConfig({
  plugins: [vue(), soundsManifestPlugin()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
