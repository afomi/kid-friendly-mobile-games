# Medley

Six small games for kids in one Expo app, for iOS and Android.
It's a port of the Medley web page (claude.ai artifact, October 2026), with Pokémon Guess Who added in November 2026.

- **Pokémon Guess Who**: ask yes-or-no questions, narrow down twelve cards, and guess the mystery Pokémon. Collect 48 Pokémon, including Pikachu, Eevee and its original evolutions, the Kanto starters, Mew, Togepi, and Lucario. New mysteries prioritize Pokémon you haven't collected. All pictures and clues are bundled for offline play.
- **Alchemy**: drag two things together to make something new. Start with water, fire, earth and air; there are 301 things to discover.
- **Animal Pairs**: flip two cards and find the matching animals.
- **Lights Out**: each press flips a light and its neighbors. Turn every light off.
- **Minesweeper**: clear the field using the numbers. The first dig is always safe.
- **Math Steps**: add, subtract, multiply and divide. Hints fill in the written work one step at a time.

## Saved progress

Pokémon Guess Who automatically saves the collection, win count, and current mystery (including its answer, clues and incorrect guesses) in AsyncStorage on the device. Leaving the game or restarting the app restores that exact mystery. Starting a new mystery keeps the collection. No account or internet connection is needed.

The other games retain their existing saves: Alchemy discoveries, Pairs and Minesweeper best scores and difficulty, Lights Out's highest level, and Math's tally, solved count, best streak and round results. Their unfinished boards/questions are not resumed.

Games wait for their saves to load before accepting input. Writes are serialized, and Pokémon save/load failures offer a retry without replacing a collection with defaults. Existing save keys are unchanged. Clearing app data or uninstalling the app removes local saves; install updates over the existing app to keep them.

## Run it

```bash
npm install
npx expo start          # Expo Go, or a development build
```

## Check it

```bash
npm test -- --runInBand # game logic, storage failures/restarts, and Guess Who UI
npx expo lint
npx tsc --noEmit
```

## Build an APK

`eas.json` provides a `preview` profile for a standalone, internally distributed APK:

```bash
npx eas-cli@latest build --platform android --profile preview
```

The app is linked to `@civicstudio/medley`. This profile uses local signing credentials in ignored `credentials.json` and `.build/medley.keystore`. They preserve the signing certificate from the first sideloaded APK, so installing an update keeps device data. These files are local to the build machine and must be restored securely before building on another machine. Do not generate a new key for updates.

Version 1.1.0 uses Android version code 2 and package `com.afomi.medley`. APKs are handed to `~/workspace/infra/.claude/inbox/` for publication to `s3://afomi/apk/medley-expo.apk`. The original `scripts/build-apk.sh` is the legacy local Gradle/upload workflow; use EAS for this release.

## Layout

- `src/app/`: one screen per game (Expo Router).
- `src/games/<game>/`: game logic and bundled data.
- `src/games/__tests__/`: game logic and Guess Who screen tests.
- `src/games/pokemon/data.json`: 48 Pokémon with stable Pokédex IDs.
- `assets/pokemon/`: offline sprites and source attribution.
- `scripts/fetch-pokemon.py`: refresh the bundled facts/sprites from PokéAPI.
- `src/ui/`: theme and shared components.
- `src/lib/`: storage, randomness and formatting helpers; storage tests in `__tests__/`.
