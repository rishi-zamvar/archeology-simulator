/**
 * Electron Forge configuration.
 *
 * This project uses electron-builder for packaging (via npm run build).
 * Forge is included for its plugin ecosystem and can be used for
 * development lifecycle management if needed in the future.
 */

module.exports = {
  packagerConfig: {
    asar: true,
    name: 'Archeology Simulator',
    executableName: 'archeology-simulator',
    appBundleId: 'com.archeologysimulator.app',
    extraResource: ['resources'],
    ignore: [
      /^\/src(?!\/(main|shared))/,
      /^\/tests/,
      /^\/\.planning/,
      /^\/\.github/,
      /node_modules\/.bin/,
    ],
  },
  rebuildConfig: {
    // Native module rebuild for better-sqlite3
    onlyModules: ['better-sqlite3'],
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
  ],
};
