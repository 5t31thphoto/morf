#include "morf_context.h"
#include "morf_engine.h"
#include <stdio.h>
#include <string.h>

static uint8_t property_from_intent_name(const char* name) {
    if (!name) return PROP_NONE;
    if (strstr(name, "volume") || strcmp(name, "mute") == 0 || strcmp(name, "unmute") == 0) return PROP_VOLUME;
    if (strstr(name, "bright")) return PROP_BRIGHT;
    if (strstr(name, "light")) return PROP_LIGHTS;
    if (strstr(name, "timer")) return PROP_TIMER;
    if (strcmp(name, "play") == 0 || strcmp(name, "pause") == 0 || strcmp(name, "skip") == 0) return PROP_MUSIC;
    if (strstr(name, "night") || strstr(name, "day")) return PROP_BRIGHT;
    return PROP_NONE;
}

static int8_t direction_from_intent_name(const char* name) {
    if (!name) return 0;
    if (strstr(name, "_up") || strcmp(name, "unmute") == 0 || strstr(name, "_on") != NULL) return 1;
    if (strstr(name, "_down") || strcmp(name, "mute") == 0 || strstr(name, "_off") != NULL) return -1;
    return 0;
}

static int name_is(const char* a, const char* b) {
    return a && b && strcmp(a, b) == 0;
}

void morf_context_parse_slots(const morf_token_t* toks, int n, morf_result_t* r) {
    r->number = 0;
    r->duration_s = 0;
    r->direction = direction_from_intent_name(r->intent_name_buf);
    r->property = property_from_intent_name(r->intent_name_buf);
    int pending_num = -1;
    uint8_t saw_pivot = 0;
    uint8_t prop_from_token = PROP_NONE;
    int8_t dir_from_token = 0;

    for (int i = 0; i < n; i++) {
        if (toks[i].flags & FLAG_PIVOT) saw_pivot = 1;

        if (toks[i].token == MORF_TOKEN_NUMBER) {
            pending_num = toks[i].value;
            if (r->number == 0) r->number = toks[i].value;
            continue;
        }
        if (toks[i].token == MORF_TOKEN_DURATION) {
            int mul = toks[i].value > 0 ? toks[i].value : 1;
            int base = pending_num >= 0 ? pending_num : (r->number > 0 ? r->number : 1);
            int dur = base * mul;
            if (dur < 1) dur = 1;
            if (dur > 32767) dur = 32767;
            r->duration_s = (int16_t)dur;
            pending_num = -1;
            continue;
        }

        concept_id_t cid = toks[i].concept_id;
        if (!cid || cid >= morf_node_count || !associative_graph_pool) continue;
        uint8_t kind = associative_graph_pool[cid].kind;
        int16_t tag = associative_graph_pool[cid].tag;
        if (kind == KIND_PROPERTY && tag > 0) prop_from_token = (uint8_t)tag;
        if (kind == KIND_DIRECTION) {
            if (tag > 0) dir_from_token = (tag == 2) ? 0 : 1;
            else if (tag < 0) dir_from_token = -1;
        }
    }

    if (prop_from_token) r->property = prop_from_token;
    if (dir_from_token) r->direction = dir_from_token;

    if (saw_pivot && morf_device.last_target) {
        r->property = (uint8_t)morf_device.last_target;
    }
}

static concept_id_t remap_adj_intent(uint8_t prop, int8_t dir) {
    const char* want = NULL;
    if (prop == PROP_VOLUME) want = dir < 0 ? "volume_down" : "volume_up";
    else if (prop == PROP_BRIGHT) want = dir < 0 ? "bright_down" : "bright_up";
    else if (prop == PROP_LIGHTS) want = dir < 0 ? "lights_off" : "lights_on";
    else if (prop == PROP_MUSIC) want = dir < 0 ? "pause" : "play";
    else return 0;
    return morf_intent_by_name(want);
}

int morf_context_bind_intent(const morf_token_t* toks, int n, morf_result_t* r) {
    morf_context_parse_slots(toks, n, r);

    /* Confirm / deny against a held action */
    if (name_is(r->intent_name_buf, "deny") || name_is(r->intent_name_buf, "cancel")) {
        if (morf_device.pending_intent || morf_device.pending_confirm) {
            morf_device.pending_intent = 0;
            morf_device.pending_confirm = 0;
            snprintf(r->response, sizeof(r->response), "Cancelled.");
            r->tool_id = TOOL_NONE;
            return -1;
        }
    }
    if (name_is(r->intent_name_buf, "confirm") && morf_device.pending_intent) {
        concept_id_t held = morf_device.pending_intent;
        morf_device.pending_intent = 0;
        morf_device.pending_confirm = 0;
        r->intent_id = held;
        const char* nm = morf_intent_name(held);
        strncpy(r->intent_name_buf, nm ? nm : "", sizeof(r->intent_name_buf) - 1);
        r->intent_name = r->intent_name_buf;
        const morf_intent_rec_t* it = morf_find_intent(held);
        if (it) r->tool_id = it->tool_id;
        morf_context_parse_slots(toks, n, r);
    }

    /* Bare number / duration completes a pending SET/TIMER */
    if (!r->intent_id && morf_device.pending_intent && (r->number > 0 || r->duration_s > 0)) {
        concept_id_t held = morf_device.pending_intent;
        r->intent_id = held;
        const char* nm = morf_intent_name(held);
        strncpy(r->intent_name_buf, nm ? nm : "", sizeof(r->intent_name_buf) - 1);
        r->intent_name = r->intent_name_buf;
        const morf_intent_rec_t* it = morf_find_intent(held);
        if (it) r->tool_id = it->tool_id;
        r->layer = 2;
        morf_device.pending_intent = 0;
    }

    /* Pivot "it": retarget adj intents to last property */
    if (r->intent_id && morf_device.last_target) {
        uint8_t saw_pivot = 0;
        for (int i = 0; i < n; i++) if (toks[i].flags & FLAG_PIVOT) saw_pivot = 1;
        if (saw_pivot) {
            uint8_t cur = property_from_intent_name(r->intent_name_buf);
            uint8_t want = (uint8_t)morf_device.last_target;
            if (cur && want && cur != want) {
                int8_t dir = r->direction ? r->direction : direction_from_intent_name(r->intent_name_buf);
                concept_id_t alt = remap_adj_intent(want, dir);
                if (alt) {
                    r->intent_id = alt;
                    const char* nm = morf_intent_name(alt);
                    strncpy(r->intent_name_buf, nm ? nm : "", sizeof(r->intent_name_buf) - 1);
                    r->intent_name = r->intent_name_buf;
                    const morf_intent_rec_t* it = morf_find_intent(alt);
                    if (it) r->tool_id = it->tool_id;
                    r->property = want;
                    r->layer = 2;
                }
            }
        }
    }

    const morf_intent_rec_t* it = morf_find_intent(r->intent_id);
    uint8_t mask = it ? it->slot_mask : 0;

    if (r->intent_id && (r->tool_id == TOOL_SET_VOLUME || r->tool_id == TOOL_SET_BRIGHT) && r->number <= 0) {
        morf_device.pending_intent = r->intent_id;
        r->need_clarify = 1;
        snprintf(r->response, sizeof(r->response),
                 r->tool_id == TOOL_SET_VOLUME ? "What volume?" : "What brightness?");
        return 1;
    }
    if (r->intent_id && r->tool_id == TOOL_TIMER_SET && r->duration_s <= 0 && r->number <= 0 && (mask & SLOT_DURATION)) {
        morf_device.pending_intent = r->intent_id;
        r->need_clarify = 1;
        snprintf(r->response, sizeof(r->response), "For how long?");
        return 1;
    }

    (void)mask;
    return 0;
}

void morf_context_update_scene(const morf_result_t* r) {
    uint8_t next = morf_device.scene;
    if (r->need_clarify) next = SCENE_CLARIFYING;
    else if (!r->intent_id) next = SCENE_CLARIFYING;
    else if (r->tool_id == TOOL_NIGHT) next = morf_device.night ? SCENE_NIGHT : SCENE_TASK;
    else if (r->tool_id == TOOL_SPEAK) {
        if (strstr(r->intent_name_buf, "smalltalk") || strstr(r->intent_name_buf, "greet"))
            next = SCENE_IDLE;
        else next = SCENE_TASK;
    } else if (r->tool_id != TOOL_NONE) next = SCENE_TASK;

    /* Tiny HMM inertia: stay in frustrated if we keep missing */
    if (!r->intent_id || r->need_clarify) {
        if (morf_device.scene == SCENE_CLARIFYING) next = SCENE_FRUSTRATED;
    } else if (morf_device.scene == SCENE_FRUSTRATED) {
        next = SCENE_TASK;
    }
    morf_device.scene = next;
}
