import { expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import PokemonGuessWho from "@/app/pokemon";
import { BY_ID, Progress, SAVE_KEY } from "../pokemon/logic";

jest.mock("@react-native-async-storage/async-storage", () => jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"));

it("plays, collects, and restores the saved collection and next mystery", async () => {
  await AsyncStorage.clear();
  const first = await render(<PokemonGuessWho />);
  await fireEvent.press(await screen.findByRole("button", { name: "Let's play" }));
  await waitFor(() => expect(screen.getByText("Progress saved on this device")).toBeTruthy());
  const progress = JSON.parse((await AsyncStorage.getItem(SAVE_KEY))!) as Progress;
  const target = BY_ID.get(progress.round!.target)!;
  await fireEvent.press(screen.getByRole("button", { name: `${target.name}, select to guess` }));
  await fireEvent.press(screen.getByRole("button", { name: `Guess ${target.name}` }));
  expect(screen.getByText(`You found ${target.name}!`)).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "Find another Pokémon" }));
  const question = screen.getAllByRole("button", { name: /^Is / })[0];
  await fireEvent.press(question);
  await waitFor(() => expect(screen.getByText("Progress saved on this device")).toBeTruthy());
  const saved = await AsyncStorage.getItem(SAVE_KEY);
  await first.unmount();

  await render(<PokemonGuessWho />);
  expect(await screen.findByText("Your clues")).toBeTruthy();
  expect(await AsyncStorage.getItem(SAVE_KEY)).toBe(saved);
  await fireEvent.press(screen.getByRole("button", { name: "My Pokémon" }));
  expect(screen.getByLabelText(`${target.name}, collected`)).toBeTruthy();
  expect(screen.getByText("1/48")).toBeTruthy();
});
