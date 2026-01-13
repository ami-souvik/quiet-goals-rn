const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withManifestFix(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const manifest = androidManifest.manifest;
    const application = manifest.application[0];

    // 1. Add tools namespace if missing
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // 2. Add tools:replace to application
    // We want to replace enableOnBackInvokedCallback
    const replaceAttr = application.$['tools:replace'] || '';
    if (!replaceAttr.includes('android:enableOnBackInvokedCallback')) {
      application.$['tools:replace'] = replaceAttr 
        ? `${replaceAttr},android:enableOnBackInvokedCallback` 
        : 'android:enableOnBackInvokedCallback';
    }

    return config;
  });
};
