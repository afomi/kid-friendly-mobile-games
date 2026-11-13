# Medley

Five small games for kids in one Expo app, for iOS and Android.
It's a port of the Medley web page (claude.ai artifact, October 2026).

- **Alchemy**: drag two things together to make something new.
  Start with water, fire, earth and air; there are 301 things to discover.
- **Animal Pairs**: flip two cards and find the matching animals.
- **Lights Out**: each press flips a light and its neighbors.
  Turn every light off.
- **Minesweeper**: clear the field using the numbers.
  The first dig is always safe.
- **Math Steps**: add, subtract, multiply and divide.
  Hints fill in the written work one step at a time.

Progress is saved on the device.

## Run it

```bash
npm install
npx expo start          # Expo Go, or a dev build
npx expo run:ios        # local native build
npx expo run:android
```

## Check it

```bash
npm test                # game logic: rules, solvability, worked math
npm run typecheck
```

## Layout

- `src/app/`: one screen per game (Expo Router).
- `src/games/<game>/`: pure game logic with no UI, so it can be tested.
  Tests live in `src/games/__tests__/`.
- `src/games/alchemy/data.json`: the 301 items and 447 recipes.
- `src/ui/`: theme and shared components.
- `src/lib/`: storage, randomness and formatting helpers.
