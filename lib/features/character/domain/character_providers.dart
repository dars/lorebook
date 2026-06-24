import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'character.dart';

final currentCharacterProvider = Provider<Character>((ref) => Character.mock());

final characterListProvider =
    StateNotifierProvider<CharacterListNotifier, List<Character>>((ref) {
  return CharacterListNotifier();
});

class CharacterListNotifier extends StateNotifier<List<Character>> {
  CharacterListNotifier() : super([Character.mock()]);

  void add(Character c) => state = [...state, c];

  void remove(String id) => state = state.where((c) => c.id != id).toList();
}
