#ifndef MORF_CONTEXT_H
#define MORF_CONTEXT_H

#include "morf_types.h"

#ifdef __cplusplus
extern "C" {
#endif

/* Logical context parser. Runs after dominant_intent_id is known.
   Fills slots from tokens + graph tags, remaps pivot ("it") via last_target,
   holds incomplete SET/TIMER intents, and completes them on the next utterance. */

void morf_context_parse_slots(const morf_token_t* toks, int n, morf_result_t* r);

/*  0 = fire tool now
    1 = waiting (clarify / pending slots) — do not apply tool
   -1 = cancelled */
int  morf_context_bind_intent(const morf_token_t* toks, int n, morf_result_t* r);

void morf_context_update_scene(const morf_result_t* r);

#ifdef __cplusplus
}
#endif

#endif
