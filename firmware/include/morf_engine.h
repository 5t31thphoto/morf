#ifndef MORF_ENGINE_H
#define MORF_ENGINE_H

#include "morf_types.h"
#include <stddef.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

extern rational_frame_t active_frame;
extern associative_node_t* associative_graph_pool;
extern morf_device_t morf_device;
extern uint16_t morf_node_count;
extern uint16_t morf_intent_count;

bool     morf_engine_load(const uint8_t* blob, uint32_t len);
void     morf_engine_init(void);
void     morf_engine_reset_activations(void);

int      morf_tokenize(const char* text, morf_token_t* out, int max);
void     morf_engine_inject_token(token_id_t token, concept_id_t concept, fixed15_t charge);
void     morf_engine_relaxation_sweep(void);
void     morf_resolve_dominant_intent(concept_id_t* top, fixed15_t* top_a, concept_id_t* runner, fixed15_t* run_a);
void     morf_engine_apply_plasticity(concept_id_t src, concept_id_t dst);

bool     morf_process_utterance(const char* text, morf_result_t* result);

const char* morf_intent_name(concept_id_t id);
const morf_intent_rec_t* morf_find_intent(concept_id_t concept_id);
concept_id_t morf_intent_by_name(const char* name);
uint32_t morf_image_crc(void);
uint32_t morf_image_bytes(void);

#ifdef __cplusplus
}
#endif

#endif
