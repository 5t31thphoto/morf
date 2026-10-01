#!/usr/bin/env python3
"""MORF ontology compiler — packs a JSON ontology into the ESP32-S3 flash image.

Binary layout (little-endian), header 64 bytes, magic 0x46524F4D ("MORF"):

  0x00 u32 magic
  0x04 u16 version (0x0200)
  0x06 u16 flags
  0x08 u16 vocab_size
  0x0A u16 node_count
  0x0C u16 edge_count
  0x0E u16 intent_count
  0x10 u16 utterance_count
  0x12 u16 pattern_count
  0x14 u32 vocab_offset
  0x18 u32 nodes_offset
  0x1C u32 edges_offset
  0x20 u32 intents_offset
  0x24 u32 utterances_offset
  0x28 u32 patterns_offset
  0x2C u32 strings_offset
  0x30 u32 strings_size
  0x34 u32 crc32 of payload (header crc field treated as 0)
  0x38 u8  reserved[8]

This is the source of truth for the packed format. The firmware loader and
the foundry TypeScript compiler must match it bit-for-bit.
"""
from __future__ import annotations

import argparse
import json
import os
import struct
import sys
import zlib
from collections import defaultdict
from typing import Any

MAGIC = 0x46524F4D
VERSION = 0x0200
VOCAB_SLOTS = 4096
NUMBER_TOKEN = 0xFFFE
DURATION_TOKEN = 0xFFFD
UNKNOWN_TOKEN = 0xFFFF

FLAG_STOPWORD = 0x01
FLAG_PIVOT = 0x02
FLAG_NUMBER = 0x04
FLAG_UNIT = 0x08

KIND_CONCEPT = 0
KIND_PROPERTY = 1
KIND_ACTION = 2
KIND_DIRECTION = 3
KIND_INTENT = 4
KIND_SCENE = 5
KIND_TOOL = 6

SLOT_NUMBER = 1 << 0
SLOT_DIRECTION = 1 << 1
SLOT_PROPERTY = 1 << 2
SLOT_TARGET = 1 << 3
SLOT_DURATION = 1 << 4
SLOT_LEVEL = 1 << 5

TOOL_NONE = 0
TOOL_SET_VOLUME = 1
TOOL_ADJ_VOLUME = 2
TOOL_SET_BRIGHT = 3
TOOL_ADJ_BRIGHT = 4
TOOL_LIGHTS = 5
TOOL_PLAYPAUSE = 6
TOOL_TIMER_SET = 7
TOOL_TIMER_CANCEL = 8
TOOL_QUERY = 9
TOOL_MUTE = 10
TOOL_NIGHT = 11
TOOL_SPEAK = 12
TOOL_TEACH = 13

Q15_ONE = 0x7FFF


def q15(f: float) -> int:
    x = int(round(max(-1.0, min(1.0, f)) * 32767.0))
    if x > 0x7FFF:
        return 0x7FFF
    if x < -0x8000:
        return -0x8000
    return x


def murmur3_32(key: bytes, seed: int = 0x5EED) -> int:
    """Match the firmware's compact Murmur-ish mix (morf_engine.c)."""
    h = seed & 0xFFFFFFFF
    for b in key:
        h ^= b
        h = (h * 0x5BD1E995) & 0xFFFFFFFF
        h ^= h >> 15
    return h if h != 0 else 1


def crc32(data: bytes) -> int:
    return zlib.crc32(data) & 0xFFFFFFFF


STOPWORDS = {
    "a", "an", "the", "to", "for", "of", "please", "just", "my", "me",
    "in", "on", "at", "and", "or", "be", "is", "are", "it", "this", "that",
    "here", "there", "with", "from", "can", "you", "we", "i", "im", "i'm",
}
PIVOTS = {"it", "this", "that", "them"}

NUMBER_WORDS = {
    "zero": 0, "oh": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11,
    "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16,
    "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30,
    "forty": 40, "fifty": 50, "sixty": 60, "ninety": 90, "hundred": 100,
    "half": 50, "max": 100, "maximum": 100, "full": 100, "min": 0, "minimum": 0,
}

KIND_MAP = {
    "concept": KIND_CONCEPT,
    "property": KIND_PROPERTY,
    "action": KIND_ACTION,
    "direction": KIND_DIRECTION,
    "intent": KIND_INTENT,
    "scene": KIND_SCENE,
    "tool": KIND_TOOL,
}

PROP_TAG = {
    "volume": 1, "brightness": 2, "lights": 3, "timer": 4, "music": 5, "time": 4,
}
DIR_TAG = {"increase": 1, "decrease": -1, "setpoint": 2}


def concept_bias(cid: str, kind: str) -> int:
    if kind == "property":
        return PROP_TAG.get(cid, 0)
    if kind == "direction":
        return DIR_TAG.get(cid, 0)
    return 0


def default_ontology() -> dict[str, Any]:
    concepts = [
        ("volume", "property"), ("brightness", "property"), ("lights", "property"),
        ("music", "property"), ("timer", "property"), ("time", "property"),
        ("device", "concept"), ("speaker", "concept"), ("screen", "concept"),
        ("increase", "direction"), ("decrease", "direction"), ("setpoint", "direction"),
        ("toggle", "action"), ("query", "action"), ("play", "action"),
        ("pause", "action"), ("stop", "action"), ("skip", "action"),
        ("greet", "concept"), ("thanks", "concept"), ("bye", "concept"),
        ("identity", "concept"), ("help", "concept"), ("smalltalk", "concept"),
        ("confirm", "concept"), ("deny", "concept"), ("night", "concept"),
        ("day", "concept"), ("mute", "concept"), ("loud", "concept"),
        ("quiet", "concept"), ("dark", "concept"), ("bright", "concept"),
        ("duration", "concept"), ("number", "concept"), ("agent", "concept"),
        ("constraint", "concept"), ("teach", "concept"), ("status", "concept"),
        ("joke", "concept"), ("weather", "concept"), ("name", "concept"),
    ]
    intents = [
        ("greet", TOOL_SPEAK, 0, ["hello", "hi", "hey", "good morning", "good evening", "howdy", "yo"]),
        ("farewell", TOOL_SPEAK, 0, ["goodbye", "bye", "see you", "later", "good night", "night"]),
        ("thanks", TOOL_SPEAK, 0, ["thank you", "thanks", "appreciate it", "cheers"]),
        ("identity", TOOL_SPEAK, 0, ["who are you", "what are you", "your name", "what is morf"]),
        ("help", TOOL_SPEAK, 0, ["help", "what can you do", "commands", "how do i", "capabilities"]),
        ("smalltalk", TOOL_SPEAK, 0, ["how are you", "whats up", "tell me a joke", "you there", "cool", "nice"]),
        ("volume_up", TOOL_ADJ_VOLUME, SLOT_NUMBER | SLOT_PROPERTY, [
            "volume up", "turn it up", "louder", "increase volume", "raise the volume",
            "crank it", "make it louder", "boost the sound", "turn the music up",
            "i can't hear", "cannot hear", "too quiet",
        ]),
        ("volume_down", TOOL_ADJ_VOLUME, SLOT_NUMBER | SLOT_PROPERTY, [
            "volume down", "turn it down", "quieter", "decrease volume", "lower the volume",
            "make it quieter", "too loud", "its too loud", "turn the music down",
            "lower the music", "drop the volume", "quiet down",
        ]),
        ("volume_set", TOOL_SET_VOLUME, SLOT_NUMBER | SLOT_PROPERTY, [
            "set volume to {n}", "volume {n}", "set the volume to {n}",
            "make the volume {n}", "volume at {n}",
        ]),
        ("volume_query", TOOL_QUERY, SLOT_PROPERTY, [
            "what is the volume", "how loud", "current volume", "volume level",
        ]),
        ("mute", TOOL_MUTE, 0, ["mute", "silence", "shut up", "be quiet"]),
        ("unmute", TOOL_MUTE, 0, ["unmute", "sound on", "bring the sound back"]),
        ("bright_up", TOOL_ADJ_BRIGHT, SLOT_NUMBER | SLOT_PROPERTY, [
            "brighter", "increase brightness", "raise the brightness", "turn up the brightness",
            "make it brighter", "screen brighter",
        ]),
        ("bright_down", TOOL_ADJ_BRIGHT, SLOT_NUMBER | SLOT_PROPERTY, [
            "dim", "dimmer", "decrease brightness", "lower the brightness",
            "make it darker", "too bright", "turn down the brightness",
        ]),
        ("bright_set", TOOL_SET_BRIGHT, SLOT_NUMBER | SLOT_PROPERTY, [
            "set brightness to {n}", "brightness {n}", "set the brightness to {n}",
        ]),
        ("bright_query", TOOL_QUERY, SLOT_PROPERTY, [
            "what is the brightness", "how bright", "brightness level",
        ]),
        ("lights_on", TOOL_LIGHTS, SLOT_TARGET, [
            "lights on", "turn the lights on", "turn on the lights", "light on",
            "switch the lights on", "let there be light",
        ]),
        ("lights_off", TOOL_LIGHTS, SLOT_TARGET, [
            "lights off", "turn the lights off", "turn off the lights", "light off",
            "kill the lights", "make it dark in here", "switch the lights off",
        ]),
        ("lights_toggle", TOOL_LIGHTS, SLOT_TARGET, ["toggle lights", "flip the lights"]),
        ("play", TOOL_PLAYPAUSE, SLOT_TARGET, ["play", "play music", "resume", "start the music"]),
        ("pause", TOOL_PLAYPAUSE, SLOT_TARGET, ["pause", "pause music", "stop the music", "hold on"]),
        ("skip", TOOL_PLAYPAUSE, SLOT_TARGET, ["skip", "next track", "next song"]),
        ("timer_set", TOOL_TIMER_SET, SLOT_DURATION | SLOT_NUMBER, [
            "set a timer for {n} minutes", "timer {n} minutes", "set timer {n} seconds",
            "remind me in {n} minutes", "start a timer", "set a timer for {n}",
        ]),
        ("timer_cancel", TOOL_TIMER_CANCEL, 0, ["cancel timer", "stop the timer", "clear timer"]),
        ("timer_query", TOOL_QUERY, SLOT_PROPERTY, ["how long left", "timer status", "time remaining"]),
        ("time_query", TOOL_QUERY, 0, ["what time is it", "current time", "whats the time"]),
        ("status", TOOL_QUERY, 0, ["status", "how are we doing", "device status", "report"]),
        ("night_mode", TOOL_NIGHT, 0, ["night mode", "good night mode", "bedtime", "go dark"]),
        ("day_mode", TOOL_NIGHT, 0, ["day mode", "good morning mode", "wake up", "full brightness"]),
        ("confirm", TOOL_NONE, 0, ["yes", "yeah", "yep", "ok", "okay", "do it", "correct", "sure"]),
        ("deny", TOOL_NONE, 0, ["no", "nope", "cancel", "stop", "don't", "nevermind", "never mind"]),
        ("teach", TOOL_TEACH, 0, ["when i say", "that means", "learn this", "remember that"]),
    ]

    utterances = {
        "greet": ["Hey.", "I'm here.", "Listening.", "MORF online."],
        "farewell": ["Later.", "Going quiet.", "Good night."],
        "thanks": ["Anytime.", "Got it.", "Sure."],
        "identity": [
            "MORF. Tiny language engine, not a cloud model.",
            "Mixture of Rational Forms. I run on this chip.",
            "Device-native. Sparse forms, no remote brain.",
        ],
        "help": [
            "Volume, brightness, lights, timer, music. Talk normally.",
            "Commands and quips. Keep it short, I will too.",
        ],
        "smalltalk": ["Still here.", "Noted.", "Hah.", "Cool.", "I agree."],
        "volume_up": ["Volume {volume}.", "Louder. {volume}.", "Raising it."],
        "volume_down": ["Volume {volume}.", "Dialing it down.", "Quieter. {volume}."],
        "volume_set": ["Volume {volume}.", "Set."],
        "volume_query": ["Volume is {volume}."],
        "mute": ["Muted."],
        "unmute": ["Sound back. {volume}."],
        "bright_up": ["Brightness {brightness}.", "Brighter."],
        "bright_down": ["Brightness {brightness}.", "Dimming."],
        "bright_set": ["Brightness {brightness}."],
        "bright_query": ["Brightness is {brightness}."],
        "lights_on": ["Lights on.", "Screen up."],
        "lights_off": ["Lights off.", "Going dark."],
        "lights_toggle": ["Toggled."],
        "play": ["Playing.", "Music on."],
        "pause": ["Paused."],
        "skip": ["Skipping."],
        "timer_set": ["Timer {duration}s.", "Counting down."],
        "timer_cancel": ["Timer cleared."],
        "timer_query": ["Timer {remaining}s left."],
        "time_query": ["Check the clock on serial. I keep ticks, not RTC unless the board does."],
        "status": ["Vol {volume} · bright {brightness} · lights {lights}."],
        "night_mode": ["Night mode. Dim and quiet."],
        "day_mode": ["Day mode."],
        "confirm": ["Okay.", "Doing it."],
        "deny": ["Stopped.", "Cancelled."],
        "teach": ["Say the phrase, then the action. I'll bind them."],
        "unknown": ["Sorry, I didn't get that.", "Say that another way.", "Need a clearer command."],
        "clarify": ["Volume or brightness?", "Which target?", "Give me a number."],
        "constraint": ["That's out of range. 0 to 100.", "I can't do that."],
    }

    vocab_extra = [
        "turn", "set", "make", "put", "raise", "lower", "increase", "decrease",
        "boost", "dim", "crank", "kill", "shut", "switch", "play", "pause",
        "stop", "skip", "start", "cancel", "mute", "unmute", "volume", "sound",
        "music", "audio", "loudness", "loud", "quiet", "quieter", "louder",
        "brightness", "bright", "brighter", "dark", "darker", "dimmer",
        "lights", "light", "lamp", "screen", "timer", "time", "minutes",
        "minute", "seconds", "second", "hours", "hour", "up", "down",
        "higher", "lower", "max", "min", "full", "half", "bit", "little",
        "lot", "way", "more", "less", "off", "hello", "hi", "hey", "thanks",
        "thank", "bye", "goodbye", "help", "status", "who", "what", "how",
        "are", "you", "your", "name", "joke", "cool", "nice", "yes", "no",
        "okay", "ok", "sure", "yeah", "nope", "nevermind", "remember",
        "learn", "means", "when", "say", "night", "day", "mode", "bedtime",
        "resume", "track", "song", "next", "remind", "left", "remaining",
        "current", "level", "report", "online", "there", "doing", "commands",
        "too", "already", "hear", "ears", "silence", "quiet", "down",
        "morning", "evening", "good", "its", "it's", "cant", "can't",
        "cannot", "flip", "toggle", "hold", "bring", "back", "sound",
        "speaker", "device", "chip", "morf",
    ]

    word_to_concept = {
        "volume": "volume", "sound": "volume", "audio": "volume", "loudness": "volume",
        "loud": "loud", "louder": "increase", "quieter": "decrease", "quiet": "quiet",
        "music": "music", "speaker": "speaker",
        "brightness": "brightness", "bright": "bright", "brighter": "increase",
        "dark": "dark", "darker": "decrease", "dim": "decrease", "dimmer": "decrease",
        "lights": "lights", "light": "lights", "lamp": "lights", "screen": "screen",
        "timer": "timer", "minutes": "duration", "minute": "duration",
        "seconds": "duration", "second": "duration", "hours": "duration", "hour": "duration",
        "up": "increase", "raise": "increase", "increase": "increase", "boost": "increase",
        "crank": "increase", "higher": "increase", "more": "increase",
        "down": "decrease", "lower": "decrease", "decrease": "decrease", "less": "decrease",
        "drop": "decrease", "kill": "decrease",
        "set": "setpoint", "make": "setpoint", "put": "setpoint",
        "turn": "toggle", "switch": "toggle", "toggle": "toggle", "flip": "toggle",
        "play": "play", "pause": "pause", "stop": "stop", "skip": "skip",
        "resume": "play", "start": "play",
        "hello": "greet", "hi": "greet", "hey": "greet", "howdy": "greet", "yo": "greet",
        "bye": "bye", "goodbye": "bye", "later": "bye",
        "thanks": "thanks", "thank": "thanks", "cheers": "thanks",
        "who": "identity", "name": "name", "morf": "identity",
        "help": "help", "commands": "help", "capabilities": "help",
        "joke": "joke", "cool": "smalltalk", "nice": "smalltalk",
        "yes": "confirm", "yeah": "confirm", "yep": "confirm", "ok": "confirm",
        "okay": "confirm", "sure": "confirm",
        "no": "deny", "nope": "deny", "cancel": "deny", "nevermind": "deny",
        "mute": "mute", "silence": "mute", "unmute": "mute",
        "night": "night", "bedtime": "night", "day": "day",
        "status": "status", "report": "status",
        "learn": "teach", "remember": "teach", "means": "teach",
        "time": "time", "hear": "loud", "too": "constraint",
        "max": "setpoint", "min": "setpoint", "full": "setpoint", "half": "number",
        "bit": "number", "little": "number", "lot": "number",
        "off": "toggle", "on": "toggle",
        "track": "music", "song": "music", "next": "skip",
        "remind": "timer", "left": "query", "remaining": "query",
        "current": "query", "level": "query",
        "what": "query", "how": "query",
        "good": "greet", "morning": "greet", "evening": "greet",
        "device": "device", "chip": "device",
        "you": "agent", "your": "agent",
    }

    examples = []
    for intent, _tool, _slots, phrases in intents:
        for p in phrases:
            examples.append({"intent": intent, "text": p})

    return {
        "version": 2,
        "concepts": [{"id": c, "kind": k} for c, k in concepts],
        "intents": [
            {
                "id": i,
                "tool": t,
                "slot_mask": m,
                "phrases": ph,
            }
            for i, t, m, ph in intents
        ],
        "utterances": utterances,
        "vocab_extra": sorted(set(vocab_extra)),
        "word_to_concept": word_to_concept,
        "examples": examples,
        "number_words": NUMBER_WORDS,
        "stopwords": sorted(STOPWORDS),
        "pivots": sorted(PIVOTS),
        "scenes": [
            "idle_chatter",
            "task_focused",
            "user_frustrated",
            "playful",
            "low_energy",
            "confirming",
            "clarifying",
            "night",
        ],
        "tools": [
            "none", "set_volume", "adj_volume", "set_bright", "adj_bright",
            "lights", "playpause", "timer_set", "timer_cancel", "query",
            "mute", "night", "speak", "teach",
        ],
        "relative": {"bit": 8, "little": 8, "some": 12, "lot": 25, "way": 25},
    }


def tokenize_words(text: str) -> list[str]:
    raw = text.lower().replace("{n}", " 0 ")
    buf = []
    for ch in raw:
        buf.append(ch if ch.isalnum() else " ")
    return [w for w in "".join(buf).split() if w]


def is_number_token(w: str) -> bool:
    if w.isdigit():
        return True
    return w in NUMBER_WORDS


def compile_ontology(ont: dict[str, Any]) -> tuple[bytes, dict[str, Any]]:
    string_buf = bytearray()
    string_index: dict[str, tuple[int, int]] = {}

    def intern(s: str) -> tuple[int, int]:
        if s in string_index:
            return string_index[s]
        b = s.encode("utf-8")
        off = len(string_buf)
        string_buf.extend(b)
        string_buf.append(0)
        rec = (off, len(b))
        string_index[s] = rec
        return rec

    concept_ids: dict[str, int] = {}
    nodes: list[dict[str, Any]] = []
    # id 0 is empty
    nodes.append({"id": 0, "name": "", "kind": KIND_CONCEPT, "bias": 0})
    intern("")
    for c in ont["concepts"]:
        cid = len(nodes)
        concept_ids[c["id"]] = cid
        nodes.append({
            "id": cid,
            "name": c["id"],
            "kind": KIND_MAP.get(c["kind"], KIND_CONCEPT),
            "bias": concept_bias(c["id"], c["kind"]),
        })
        intern(c["id"])

    intent_recs = []
    for it in ont["intents"]:
        name = it["id"]
        if name not in concept_ids:
            cid = len(nodes)
            concept_ids[name] = cid
            nodes.append({"id": cid, "name": name, "kind": KIND_INTENT, "bias": 0})
            intern(name)
        n_off, n_len = intern(name)
        intent_recs.append({
            "name": name,
            "concept_id": concept_ids[name],
            "tool": int(it["tool"]),
            "slot_mask": int(it["slot_mask"]),
            "name_off": n_off,
            "name_len": n_len,
            "default_utt": 0,
        })

    # unknown intent
    if "unknown" not in concept_ids:
        cid = len(nodes)
        concept_ids["unknown"] = cid
        nodes.append({"id": cid, "name": "unknown", "kind": KIND_INTENT, "bias": 0})
        intern("unknown")

    word_to_concept: dict[str, str] = dict(ont.get("word_to_concept", {}))
    for w in ont.get("stopwords", []):
        word_to_concept.setdefault(w, "")
    for w, _n in ont.get("number_words", {}).items():
        word_to_concept.setdefault(w, "number")
    for w in ont.get("vocab_extra", []):
        word_to_concept.setdefault(w, word_to_concept.get(w, ""))

    # Pull words from phrases
    for it in ont["intents"]:
        for ph in it["phrases"]:
            for w in tokenize_words(ph):
                if w not in word_to_concept:
                    word_to_concept[w] = ""

    vocab_items: list[tuple[str, int, int]] = []  # word, concept_id, flags
    for w, cname in sorted(word_to_concept.items()):
        flags = 0
        if w in STOPWORDS:
            flags |= FLAG_STOPWORD
        if w in PIVOTS:
            flags |= FLAG_PIVOT
        if is_number_token(w):
            flags |= FLAG_NUMBER
        if w in {"minutes", "minute", "seconds", "second", "hours", "hour"}:
            flags |= FLAG_UNIT
        cid = concept_ids.get(cname, 0) if cname else 0
        intern(w)
        vocab_items.append((w, cid, flags))

    # Open-addressed table
    table = [(0, 0, 0) for _ in range(VOCAB_SLOTS)]  # hash, concept, flags
    occupied = 0
    for w, cid, flags in vocab_items:
        h = murmur3_32(w.encode("utf-8"))
        idx = h % VOCAB_SLOTS
        for _probe in range(VOCAB_SLOTS):
            if table[idx][0] == 0:
                table[idx] = (h, cid, flags)
                occupied += 1
                break
            if table[idx][0] == h:
                table[idx] = (h, cid, flags)
                break
            idx = (idx + 1) % VOCAB_SLOTS
        else:
            raise RuntimeError("vocab table full")

    # Edges from co-occurrence in examples
    edge_map: dict[int, dict[int, int]] = defaultdict(lambda: defaultdict(int))

    def add_edge(src: int, dst: int, w: int) -> None:
        if src == 0 or dst == 0 or src == dst:
            return
        edge_map[src][dst] = min(Q15_ONE, edge_map[src][dst] + w)

    def lookup_word(w: str) -> tuple[int, int, int]:
        h = murmur3_32(w.encode("utf-8"))
        idx = h % VOCAB_SLOTS
        for _p in range(VOCAB_SLOTS):
            hh, cid, flags = table[idx]
            if hh == 0:
                return UNKNOWN_TOKEN, 0, 0
            if hh == h:
                return idx, cid, flags
            idx = (idx + 1) % VOCAB_SLOTS
        return UNKNOWN_TOKEN, 0, 0

    patterns: list[dict[str, Any]] = []
    for ex in ont.get("examples", []):
        intent_name = ex["intent"]
        intent_cid = concept_ids.get(intent_name, 0)
        toks: list[int] = []
        concepts_hit: list[int] = []
        for w in tokenize_words(ex["text"]):
            if is_number_token(w) and not (w in STOPWORDS):
                toks.append(NUMBER_TOKEN)
                concepts_hit.append(concept_ids.get("number", 0))
                continue
            tid, cid, flags = lookup_word(w)
            if flags & FLAG_STOPWORD:
                continue
            if flags & FLAG_UNIT:
                toks.append(DURATION_TOKEN)
                concepts_hit.append(concept_ids.get("duration", 0))
                continue
            if tid == UNKNOWN_TOKEN:
                continue
            toks.append(tid)
            if cid:
                concepts_hit.append(cid)
        if not toks:
            continue
        patterns.append({"intent_id": intent_cid, "tokens": toks[:12]})
        for cid in concepts_hit:
            add_edge(cid, intent_cid, q15(0.18))
            add_edge(intent_cid, cid, q15(0.12))
        for a, b in zip(concepts_hit, concepts_hit[1:]):
            add_edge(a, b, q15(0.06))

    # Property association
    for a, b, w in [
        ("volume", "loud", 0.4), ("volume", "quiet", 0.4), ("volume", "music", 0.3),
        ("brightness", "bright", 0.4), ("brightness", "dark", 0.4),
        ("lights", "dark", 0.25), ("timer", "duration", 0.4),
    ]:
        if a in concept_ids and b in concept_ids:
            add_edge(concept_ids[a], concept_ids[b], q15(w))
            add_edge(concept_ids[b], concept_ids[a], q15(w))

    edges_flat: list[tuple[int, int, int]] = []  # src packed later as CSR
    csr_index = [0] * len(nodes)
    csr_count = [0] * len(nodes)
    packed_edges: list[tuple[int, int]] = []
    for src in range(len(nodes)):
        csr_index[src] = len(packed_edges)
        dests = edge_map.get(src, {})
        # keep strongest 8
        top = sorted(dests.items(), key=lambda kv: -kv[1])[:8]
        csr_count[src] = len(top)
        for dst, wt in top:
            packed_edges.append((dst, wt))

    utterances: list[dict[str, Any]] = []
    utt_map = ont.get("utterances", {})
    for intent_name, lines in utt_map.items():
        icid = concept_ids.get(intent_name, 0)
        for line in lines:
            off, ln = intern(line)
            utterances.append({
                "intent_id": icid,
                "scene_mask": 0xFF,
                "flags": 0,
                "str_off": off,
                "str_len": ln,
            })
    # default utt index per intent = first matching
    first_utt = {}
    for i, u in enumerate(utterances):
        first_utt.setdefault(u["intent_id"], i)
    for rec in intent_recs:
        rec["default_utt"] = first_utt.get(rec["concept_id"], 0)

    # --- pack ---
    vocab_blob = bytearray()
    for h, cid, flags in table:
        vocab_blob.extend(struct.pack("<IHH", h, cid, flags))  # 8 bytes: u32, u16, u8+pad as u16

    # Fix: flags is u8 + pad u8. Use <IHBB
    vocab_blob = bytearray()
    for h, cid, flags in table:
        vocab_blob.extend(struct.pack("<IHBB", h, cid, flags & 0xFF, 0))

    nodes_blob = bytearray()
    for i, n in enumerate(nodes):
        nodes_blob.extend(struct.pack(
            "<HBBHh",
            n["id"],
            n["kind"],
            csr_count[i] & 0xFF,
            csr_index[i],
            n["bias"],
        ))

    edges_blob = bytearray()
    for dst, wt in packed_edges:
        edges_blob.extend(struct.pack("<Hh", dst, wt))

    intents_blob = bytearray()
    for rec in intent_recs:
        intents_blob.extend(struct.pack(
            "<HBBHHHH",
            rec["concept_id"],
            rec["tool"] & 0xFF,
            rec["slot_mask"] & 0xFF,
            rec["name_off"],
            rec["name_len"],
            rec["default_utt"],
            0,
        ))

    utt_blob = bytearray()
    for u in utterances:
        utt_blob.extend(struct.pack(
            "<HBBHH",
            u["intent_id"],
            u["scene_mask"],
            u["flags"],
            u["str_off"],
            u["str_len"],
        ))

    pat_blob = bytearray()
    for p in patterns:
        toks = p["tokens"][:12]
        # 4 byte header + 2*count, pad to 4
        rec = struct.pack("<HBB", p["intent_id"], len(toks), 0)
        rec += struct.pack("<" + "H" * len(toks), *toks)
        if len(rec) % 4:
            rec += b"\x00" * (4 - len(rec) % 4)
        pat_blob.extend(rec)

    strings = bytes(string_buf)
    if len(strings) % 4:
        strings += b"\x00" * (4 - len(strings) % 4)

    header_size = 64
    off = header_size
    vocab_off = off
    off += len(vocab_blob)
    nodes_off = off
    off += len(nodes_blob)
    edges_off = off
    off += len(edges_blob)
    intents_off = off
    off += len(intents_blob)
    utt_off = off
    off += len(utt_blob)
    pat_off = off
    off += len(pat_blob)
    str_off = off
    str_size = len(strings)

    header = bytearray(64)
    struct.pack_into("<I", header, 0, MAGIC)
    struct.pack_into("<H", header, 4, VERSION)
    struct.pack_into("<H", header, 6, 0)
    struct.pack_into("<H", header, 8, VOCAB_SLOTS)
    struct.pack_into("<H", header, 10, len(nodes))
    struct.pack_into("<H", header, 12, len(packed_edges))
    struct.pack_into("<H", header, 14, len(intent_recs))
    struct.pack_into("<H", header, 16, len(utterances))
    struct.pack_into("<H", header, 18, len(patterns))
    struct.pack_into("<I", header, 20, vocab_off)
    struct.pack_into("<I", header, 24, nodes_off)
    struct.pack_into("<I", header, 28, edges_off)
    struct.pack_into("<I", header, 32, intents_off)
    struct.pack_into("<I", header, 36, utt_off)
    struct.pack_into("<I", header, 40, pat_off)
    struct.pack_into("<I", header, 44, str_off)
    struct.pack_into("<I", header, 48, str_size)
    struct.pack_into("<I", header, 52, 0)

    payload = bytes(vocab_blob + nodes_blob + edges_blob + intents_blob + utt_blob + pat_blob + strings)
    digest = crc32(bytes(header) + payload)
    struct.pack_into("<I", header, 52, digest)

    blob = bytes(header) + payload
    meta = {
        "magic": "MORF",
        "version": VERSION,
        "bytes": len(blob),
        "crc32": f"0x{digest:08X}",
        "vocab_slots": VOCAB_SLOTS,
        "vocab_occupied": occupied,
        "nodes": len(nodes),
        "edges": len(packed_edges),
        "intents": [r["name"] for r in intent_recs],
        "intent_count": len(intent_recs),
        "utterances": len(utterances),
        "patterns": len(patterns),
        "strings": str_size,
        "concept_ids": concept_ids,
        "tools": ont.get("tools", []),
        "scenes": ont.get("scenes", []),
        "relative": ont.get("relative", {}),
        "number_words": ont.get("number_words", {}),
    }
    return blob, meta


def write_c_blob(blob: bytes, path: str, symbol: str = "morf_ontology_blob") -> None:
    lines = [
        "/* Auto-generated by compile_ontology.py — do not edit. */",
        "#include <stdint.h>",
        f"const uint8_t {symbol}[] = {{",
    ]
    row = []
    for i, b in enumerate(blob):
        row.append(f"0x{b:02X}")
        if len(row) == 16:
            lines.append("  " + ", ".join(row) + ",")
            row = []
    if row:
        lines.append("  " + ", ".join(row) + ",")
    lines.append("};")
    lines.append(f"const uint32_t {symbol}_len = {len(blob)};")
    lines.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def main() -> int:
    ap = argparse.ArgumentParser(description="Compile MORF ontology to ESP32 flash image")
    ap.add_argument("--in", dest="inp", default="", help="Input ontology JSON (default: built-in seed)")
    ap.add_argument("--out", dest="out", default="firmware/data", help="Output directory")
    ap.add_argument("--write-seed", dest="write_seed", default="", help="Write default ontology JSON here")
    args = ap.parse_args()

    if args.inp:
        with open(args.inp, encoding="utf-8") as f:
            ont = json.load(f)
    else:
        ont = default_ontology()

    if args.write_seed:
        os.makedirs(os.path.dirname(args.write_seed) or ".", exist_ok=True)
        with open(args.write_seed, "w", encoding="utf-8") as f:
            json.dump(ont if args.inp else default_ontology(), f, indent=2)
            f.write("\n")
        print(f"wrote seed {args.write_seed}")

    blob, meta = compile_ontology(ont)
    os.makedirs(args.out, exist_ok=True)
    bin_path = os.path.join(args.out, "morf.bin")
    with open(bin_path, "wb") as f:
        f.write(blob)
    meta_path = os.path.join(args.out, "morf.meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
        f.write("\n")
    c_path = os.path.join(args.out, "morf_ontology_blob.c")
    # Prefer writing C blob next to firmware src if that exists
    alt_c = os.path.join(os.path.dirname(args.out), "src", "morf_ontology_blob.c")
    write_c_blob(blob, c_path)
    os.makedirs(os.path.dirname(alt_c), exist_ok=True)
    write_c_blob(blob, alt_c)
    print(f"MORF image {len(blob)} bytes  crc={meta['crc32']}")
    print(f"  nodes={meta['nodes']} edges={meta['edges']} intents={meta['intent_count']}")
    print(f"  patterns={meta['patterns']} utterances={meta['utterances']} vocab={meta['vocab_occupied']}/{meta['vocab_slots']}")
    print(f"  wrote {bin_path}")
    print(f"  wrote {c_path}")
    print(f"  wrote {alt_c}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
