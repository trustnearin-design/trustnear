const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * @react-native-voice/voice@3.x ships a stale `com.android.support:appcompat-v7`
 * dependency in its android/build.gradle (DEFAULT_SUPPORT_LIB_VERSION = 28.0.0).
 * That transitively pulls `com.android.support:versionedparcelable:28.0.0`, which
 * collides with AndroidX's `androidx.versionedparcelable:1.1.1` and fails the
 * `:app:checkReleaseDuplicateClasses` Gradle task — the reason the customer APK
 * build errored on 2026-06-02.
 *
 * The library's own Java only references `androidx.annotation.NonNull` (verified —
 * no `android.support.*` imports), so the legacy support group is vestigial. We
 * exclude the whole `com.android.support` group app-wide; the modern Expo/RN stack
 * is 100% AndroidX, so nothing legitimately needs it.
 */
const MARKER = '// withExcludeLegacySupport';
const SNIPPET = `
${MARKER}
configurations.all {
    exclude group: 'com.android.support'
}
`;

module.exports = function withExcludeLegacySupport(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withExcludeLegacySupport: expected android/app/build.gradle to be Groovy');
    }
    if (!cfg.modResults.contents.includes(MARKER)) {
      cfg.modResults.contents += SNIPPET;
    }
    return cfg;
  });
};
