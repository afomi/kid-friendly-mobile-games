import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BY_ID, POKEMON, QUESTIONS, SAVE_KEY, ask, freshProgress, guess, remaining, restoreProgress, startRound, usefulQuestions } from "@/games/pokemon/logic";
import { IMAGES } from "@/games/pokemon/images";
import { useStored } from "@/lib/storage";
import { Chip, Note, Row, Screen, Stats } from "@/ui/kit";
import { SaveStatus } from "@/ui/save-status";
import { C } from "@/ui/theme";

export default function PokemonGuessWho() {
  const [progress, setProgress, ready, storage] = useStored(SAVE_KEY, freshProgress(), restoreProgress);
  const [collection, setCollection] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);
  const round = progress.round;
  const candidates = round ? remaining(round) : [];
  const questions = round ? usefulQuestions(round) : [];
  const target = round ? BY_ID.get(round.target)! : null;
  const selectedPokemon = selected === null ? null : BY_ID.get(selected);
  const begin = () => {
    setProgress((previous) => startRound(previous));
    setSelected(null);
    setConfirmNew(false);
  };

  if (!ready) return <Screen><SaveStatus {...storage} ready={ready} /></Screen>;

  return (
    <Screen>
      <Stats items={[["Collected", `${progress.caught.length}/${POKEMON.length}`], ["Rounds won", progress.wins]]} />
      <Row>
        <Chip label="Play" on={!collection} onPress={() => setCollection(false)} />
        <Chip label="My Pokémon" on={collection} onPress={() => setCollection(true)} />
      </Row>
      <SaveStatus {...storage} ready={ready} />
      {collection ? (
        <>
          <Text style={s.heading}>My Pokémon</Text>
          <Note>Your friends stay here between games. Find all {POKEMON.length}!</Note>
          <View style={s.grid}>
            {POKEMON.map((p) => (
              <View key={p.id} style={[s.card, !progress.caught.includes(p.id) && s.dim]} accessibilityLabel={`${p.name}, ${progress.caught.includes(p.id) ? "collected" : "not collected yet"}`}>
                <Image source={IMAGES[p.id]} style={s.image} />
                <Text style={s.name}>{p.name}</Text>
                <Text style={s.detail}>{progress.caught.includes(p.id) ? "✓ Collected" : "To discover"}</Text>
              </View>
            ))}
          </View>
        </>
      ) : !round ? (
        <View style={s.panel}>
          <Text style={s.heading}>Who’s the mystery Pokémon?</Text>
          <Text style={s.body}>Ask yes-or-no questions to cross off cards. Tap a Pokémon when you’re ready to guess!</Text>
          <Image source={IMAGES[25]} style={s.hero} />
          <Chip label="Let's play" primary onPress={begin} />
        </View>
      ) : round.won ? (
        <View style={s.panel} accessibilityLiveRegion="polite">
          <Text style={s.heading}>You found {target!.name}!</Text>
          <Image source={IMAGES[target!.id]} style={s.hero} />
          <Text style={s.body}>{target!.name} is in your collection. You asked {round.asked.length} questions and made {round.guesses.length + 1} guesses.</Text>
          <Chip label="Find another Pokémon" primary onPress={begin} />
        </View>
      ) : (
        <>
          <Text style={s.heading}>Who’s the mystery Pokémon?</Text>
          <Note>Ask a question, then use the answer to narrow it down. Tap a card to guess.</Note>
          <Text style={s.body} accessibilityLiveRegion="polite">{candidates.length} Pokémon left</Text>
          <View style={s.grid}>
            {round.board.map((id) => {
              const p = BY_ID.get(id)!;
              const eliminated = !candidates.includes(id);
              return (
                <Pressable key={id} disabled={eliminated} onPress={() => setSelected(id)}
                  accessibilityRole="button" accessibilityLabel={`${p.name}${eliminated ? ", crossed off" : ", select to guess"}`}
                  accessibilityState={{ disabled: eliminated, selected: selected === id }}
                  style={[s.card, eliminated && s.dim, selected === id && s.selected]}>
                  <Image source={IMAGES[id]} style={s.image} />
                  <Text style={s.name}>{p.name}</Text>
                  <Text style={s.detail}>{eliminated ? "✕ Crossed off" : p.types.join(" · ")}</Text>
                </Pressable>
              );
            })}
          </View>
          {selectedPokemon && candidates.includes(selectedPokemon.id) && (
            <View style={s.panel}>
              <Text style={s.heading}>Guess {selectedPokemon.name}?</Text>
              <Row>
                <Chip label={`Guess ${selectedPokemon.name}`} primary onPress={() => {
                  setProgress((previous) => guess(previous, selectedPokemon.id));
                  setSelected(null);
                }} />
                <Chip label="Keep looking" onPress={() => setSelected(null)} />
              </Row>
            </View>
          )}
          {round.guesses.length > 0 && <Note>{round.guesses.map((id) => BY_ID.get(id)!.name).join(", ")}: not this time. Keep going!</Note>}
          <View style={s.panel}>
            <Text style={s.heading}>Ask a question</Text>
            <Note>Colors use the Pokédex’s main body color. Some Pokémon have two types.</Note>
            <Row>
              {questions.map((q) => <Chip key={q.id} label={q.label} onPress={() => {
                setProgress((previous) => ask(previous, q.id));
                setSelected(null);
              }} />)}
            </Row>
            {!questions.length && <Note>{candidates.length === 1 ? "One left! Tap its card and make your guess." : "These friends share the same clues. Pick one to guess—you can keep trying!"}</Note>}
          </View>
          {round.asked.length > 0 && (
            <View style={s.panel} accessibilityLiveRegion="polite">
              <Text style={s.heading}>Your clues</Text>
              {[...round.asked].reverse().map((id) => {
                const q = QUESTIONS.find((item) => item.id === id)!;
                return <Text key={id} style={s.body}>{q.matches(target!) ? "Yes" : "No"} — {q.label}</Text>;
              })}
            </View>
          )}
          {confirmNew ? <View style={s.panel}>
            <Text style={s.body}>Start a new mystery? Your collection stays saved.</Text>
            <Row><Chip label="Start new mystery" onPress={begin} /><Chip label="Keep playing" onPress={() => setConfirmNew(false)} /></Row>
          </View> : <Chip label="New mystery" onPress={() => setConfirmNew(true)} />}
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  heading: { fontSize: 20, fontWeight: "800", color: C.ink },
  body: { fontSize: 15, lineHeight: 22, color: C.ink },
  panel: { backgroundColor: C.panel, borderWidth: 1.5, borderColor: C.line, borderRadius: 14, padding: 14, gap: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  card: { width: "31.5%", minHeight: 126, padding: 5, alignItems: "center", backgroundColor: C.panel, borderColor: C.line, borderWidth: 2, borderRadius: 12 },
  image: { width: "100%", height: 78, resizeMode: "contain" },
  hero: { width: 150, height: 150, alignSelf: "center", resizeMode: "contain" },
  name: { fontSize: 13, fontWeight: "700", color: C.ink, textAlign: "center" },
  detail: { fontSize: 10, color: C.muted, textAlign: "center", marginTop: 3 },
  dim: { opacity: 0.4 },
  selected: { borderColor: C.red, backgroundColor: C.face },
});
