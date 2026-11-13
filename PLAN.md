# Medley — Plan

Entrypoint for this repo. Tasks are tracked inline here.
Personal-use app; not headed for the App Store.

## Now

**First play on a device.**
Logic is tested and both platform bundles build; the screens haven't been played on a phone yet.
Run `npx expo start` (or `npx expo run:ios`) and play each game.

## Done (2026-11-13)

- Ported all five games from the Medley web page into Expo SDK 58 with Expo Router.
- Pairs uses animal emoji instead of the original's Pokémon sprites.
- Game logic is pure TypeScript with 29 Jest tests:
  - Every Lights Out puzzle is solvable by following hints.
  - The first Minesweeper dig is always safe, and chording works.
  - Math Steps' pencilled work matches the arithmetic for every operation and size.
  - All 301 Alchemy items are reachable from the four starting elements.

## Next

- Play-test each game on iOS and Android and fix whatever feels off.
  Watch Alchemy dragging inside the scrolling page, and Minesweeper long-press.
- App icon and splash (currently the Expo defaults).
- Drag from the Alchemy collection onto the table (today it's tap-to-add).
- Optional: a TestFlight script, following strikenight-mobile.

## APK

`scripts/build-apk.sh` builds a release APK and uploads it public-read to
https://afomi.s3.amazonaws.com/apk/medley-expo.apk.
It's signed with the debug keystore, which is fine for sideloading.
First build 2026-11-13: 93 MB, `com.afomi.medley` 1.0.0, Android 7+.
The older `apk/Medley.apk` (2026-10-13) in that bucket is an earlier build, left as is.
