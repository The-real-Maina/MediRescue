
const { withAndroidManifest } = require('@expo/config-plugins');

function withCleartextTraffic(config) {
  return withAndroidManifest(config, config => {
    const application = config.modResults.manifest.application[0];

    application.$['android:usesCleartextTraffic'] = 'true';

    return config;
  });
}

module.exports = withCleartextTraffic;
