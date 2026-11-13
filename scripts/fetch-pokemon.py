"""Refresh bundled Guess Who art and facts; no network is used during play."""
import concurrent.futures
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16, 25, 26, 35, 37, 39, 52, 54, 58,
       63, 66, 74, 77, 79, 81, 92, 94, 95, 104, 113, 123, 129, 130, 131,
       132, 133, 134, 135, 136, 143, 144, 145, 146, 149, 150, 151, 175, 448]


def fetch(url):
    return subprocess.check_output(['curl', '-fsSL', '--retry', '3', url])


def pokemon(number):
    info = json.loads(fetch(f'https://pokeapi.co/api/v2/pokemon/{number}'))
    species = json.loads(fetch(f'https://pokeapi.co/api/v2/pokemon-species/{number}'))
    art = fetch(f'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{number}.png')
    if not art.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError(f'Invalid sprite: {number}')
    (ROOT / f'assets/pokemon/{number}.png').write_bytes(art)
    return dict(id=number,
                name=next(n['name'] for n in species['names'] if n['language']['name'] == 'en'),
                types=[t['type']['name'] for t in info['types']],
                color=species['color']['name'], height=info['height'],
                legendary=species['is_legendary'] or species['is_mythical'])


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    roster = list(pool.map(pokemon, IDS))
(ROOT / 'src/games/pokemon/data.json').write_text(json.dumps(roster, indent=2) + '\n')
(ROOT / 'src/games/pokemon/images.ts').write_text(
    '// Static requires let Metro bundle every sprite for offline play.\n'
    'import { ImageSourcePropType } from "react-native";\n\n'
    'export const IMAGES: Record<number, ImageSourcePropType> = {\n' +
    ''.join(f'  {n}: require("../../../assets/pokemon/{n}.png"),\n' for n in IDS) + '};;\n'.replace(';;', ';'))
print(f'Bundled {len(roster)} Pokémon and sprites.')
