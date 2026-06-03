# Deep linking setup (TrustNear customer app)

Shareable links like `https://trustnear.in/pro/<id>` open the app directly on
that expert's profile (or the Play Store / website if the app isn't installed).

The app-side wiring is already done:

- `app.json` → `android.intentFilters` (App Links, `autoVerify`) + `ios.associatedDomains`.
- Route `app/(app)/pro/[id].tsx` matches `/pro/<id>` (Expo Router auto-linking).
- Share button on the expert profile (`src/lib/links.ts` → `shareExpert`).
- Logged-out deep links are remembered and resumed after login
  (`src/lib/pendingRedirect.ts` + the root layout guard + OTP screen).

## What YOU still need to do (one-time)

### 1. Host the two verification files on trustnear.in

Serve these at the exact paths below (HTTPS, `Content-Type: application/json`,
**no redirects**):

- `https://trustnear.in/.well-known/assetlinks.json` (Android)
- `https://trustnear.in/.well-known/apple-app-site-association` (iOS — note: NO `.json` extension)

Templates are in this folder under `.well-known/`. Fill in the placeholders:

**assetlinks.json** → `sha256_cert_fingerprints`
Get the release signing fingerprint EAS uses for the customer app:

```
eas credentials -p android
# pick the production/build profile → "Keystore" → copy the SHA-256 Fingerprint
```

(Or Play Console → Setup → App integrity → App signing → SHA-256.)

**apple-app-site-association** → `appID`
Format is `<TEAM_ID>.in.trustnear.customer`. Team ID is at
developer.apple.com → Membership. Skip if not shipping iOS yet.

### 2. Rebuild + submit the app

`intentFilters` / `associatedDomains` are native config — they only take
effect in a fresh build:

```
eas build -p android --profile production
```

Android verifies App Links automatically on install once `assetlinks.json` is
live. To check verification on a device:

```
adb shell pm get-app-links in.trustnear.customer
```

### 3. (Optional) website fallback

If the app isn't installed, the OS opens `https://trustnear.in/pro/<id>` in the
browser. Make that page show the expert + a "Get the app" button so the link is
never a dead end.

## Notes

- The custom scheme `sevalink://pro/<id>` also works for app-to-app testing
  without the web verification (use `npx uri-scheme open sevalink://pro/<id> --android`).
- Until the build + well-known files are live, the **share button still works**
  — recipients just land on the website instead of jumping straight into the app.
