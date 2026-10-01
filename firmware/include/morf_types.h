#ifndef MORF_TYPES_H
#define MORF_TYPES_H

#include <stdint.h>
#include "morf_config.h"

typedef uint16_t token_id_t;
typedef uint16_t concept_id_t;
typedef int16_t  fixed15_t;

typedef struct __attribute__((packed)) {
    uint32_t magic;
    uint16_t version;
    uint16_t flags;
    uint16_t vocab_size;
    uint16_t node_count;
    uint16_t edge_count;
    uint16_t intent_count;
    uint16_t utterance_count;
    uint16_t pattern_count;
    uint32_t vocab_offset;
    uint32_t nodes_offset;
    uint32_t edges_offset;
    uint32_t intents_offset;
    uint32_t utterances_offset;
    uint32_t patterns_offset;
    uint32_t strings_offset;
    uint32_t strings_size;
    uint32_t crc32;
    uint8_t  reserved[8];
} morf_file_header_t;

typedef struct __attribute__((packed)) {
    uint32_t token_hash;
    uint16_t concept_target_id;
    uint8_t  flags;
    uint8_t  pad;
} morf_flash_token_entry_t;

typedef struct __attribute__((packed)) {
    uint16_t node_id;
    uint8_t  kind;
    uint8_t  edge_count;
    uint16_t first_edge;
    int16_t  bias;
} morf_node_rec_t;

typedef struct __attribute__((packed)) {
    uint16_t target;
    int16_t  weight;
} morf_edge_rec_t;

typedef struct __attribute__((packed)) {
    uint16_t concept_id;
    uint8_t  tool_id;
    uint8_t  slot_mask;
    uint16_t name_off;
    uint16_t name_len;
    uint16_t default_utt;
    uint16_t reserved;
} morf_intent_rec_t;

typedef struct __attribute__((packed)) {
    uint16_t intent_id;
    uint8_t  scene_mask;
    uint8_t  flags;
    uint16_t str_off;
    uint16_t str_len;
} morf_utterance_rec_t;

typedef struct __attribute__((packed)) {
    concept_id_t concept_id;
    fixed15_t    activation_level;
    uint32_t     last_updated_tick;
} active_slot_t;

typedef struct __attribute__((packed)) {
    active_slot_t slots[MORF_MAX_ACTIVE_SLOTS];
    concept_id_t  dominant_intent_id;
    fixed15_t     intent_confidence;
    concept_id_t  historical_intents[MORF_MAX_HIST_INTENTS];
} rational_frame_t;

typedef struct __attribute__((packed)) {
    concept_id_t target_node_id;
    fixed15_t    link_weight;
} graph_edge_t;

typedef struct __attribute__((packed)) {
    concept_id_t node_id;
    uint8_t      kind;
    uint8_t      edge_count;
    fixed15_t    dynamic_activation;
    int16_t      tag; /* property id or direction: +1 up / -1 down / +2 setpoint */
    graph_edge_t edges[MORF_MAX_EDGES_PER_NODE];
} associative_node_t;

typedef struct {
    int16_t  volume;
    int16_t  brightness;
    uint8_t  lights;
    uint8_t  muted;
    uint8_t  music_playing;
    uint8_t  night;
    int32_t  timer_ms;
    uint8_t  timer_running;
    concept_id_t last_target;
    concept_id_t last_intent;
    uint8_t  scene;
    uint8_t  pending_confirm;
    concept_id_t pending_intent;
} morf_device_t;

typedef struct {
    token_id_t   token;
    int16_t      value;
    uint8_t      flags;
    concept_id_t concept_id;
} morf_token_t;

typedef struct {
    concept_id_t intent_id;
    const char*  intent_name;
    char         intent_name_buf[32];
    uint8_t      tool_id;
    uint8_t      ambiguous;
    uint8_t      need_clarify;
    uint8_t      layer;
    uint8_t      property;
    int8_t       direction;
    int16_t      number;
    int16_t      duration_s;
    fixed15_t    confidence;
    char         response[MORF_MAX_RESPONSE];
    uint8_t      token_count;
    morf_token_t tokens[MORF_MAX_TOKENS];
} morf_result_t;

#endif
