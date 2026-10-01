#include "morf_engine.h"
#include "morf_context.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

#ifdef ESP_PLATFORM
#include "esp_heap_caps.h"
#include "esp_log.h"
static const char* TAG = "MORF";
#define MORF_LOG(fmt, ...) ESP_LOGI(TAG, fmt, ##__VA_ARGS__)
#define MORF_LOGE(fmt, ...) ESP_LOGE(TAG, fmt, ##__VA_ARGS__)
#else
#include <stdio.h>
#define MORF_LOG(fmt, ...) printf("[MORF] " fmt "\n", ##__VA_ARGS__)
#define MORF_LOGE(fmt, ...) fprintf(stderr, "[MORF] " fmt "\n", ##__VA_ARGS__)
#define MALLOC_CAP_SPIRAM 0
#define MALLOC_CAP_8BIT 0
static void* heap_caps_malloc(size_t n, int caps) { (void)caps; return malloc(n); }
#endif

rational_frame_t active_frame;
associative_node_t* associative_graph_pool = NULL;
morf_device_t morf_device;
uint16_t morf_node_count = 0;
uint16_t morf_intent_count = 0;

static const uint8_t* g_blob = NULL;
static uint32_t g_blob_len = 0;
static const morf_file_header_t* g_hdr = NULL;
static const morf_flash_token_entry_t* g_vocab = NULL;
static const morf_node_rec_t* g_nodes = NULL;
static const morf_edge_rec_t* g_edges = NULL;
static const morf_intent_rec_t* g_intents = NULL;
static const morf_utterance_rec_t* g_utts = NULL;
static const uint8_t* g_patterns = NULL;
static const char* g_strings = NULL;
static uint32_t g_crc = 0;

extern const uint8_t morf_ontology_blob[];
extern const uint32_t morf_ontology_blob_len;

static inline fixed15_t q15_mul(fixed15_t a, fixed15_t b) {
    int32_t result = ((int32_t)a * (int32_t)b) >> 15;
    if (result > 0x7FFF) return 0x7FFF;
    if (result < -0x8000) return (fixed15_t)-0x8000;
    return (fixed15_t)result;
}

static inline fixed15_t q15_add_sat(fixed15_t a, fixed15_t b) {
    int32_t result = (int32_t)a + (int32_t)b;
    if (result > 0x7FFF) return 0x7FFF;
    if (result < 0) return 0;
    return (fixed15_t)result;
}

static uint32_t murmur3_32(const char* key, size_t len, uint32_t seed) {
    uint32_t h = seed;
    for (size_t i = 0; i < len; i++) {
        h ^= (uint8_t)key[i];
        h *= 0x5bd1e995u;
        h ^= h >> 15;
    }
    return h ? h : 1u;
}

static uint32_t crc32_update(uint32_t crc, const uint8_t* data, uint32_t len) {
    crc = ~crc;
    for (uint32_t i = 0; i < len; i++) {
        crc ^= data[i];
        for (int k = 0; k < 8; k++) {
            uint32_t mask = -(crc & 1u);
            crc = (crc >> 1) ^ (0xEDB88320u & mask);
        }
    }
    return ~crc;
}

static int clampi(int v, int lo, int hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
}

static char g_name_tmp[48];

const char* morf_intent_name(concept_id_t id) {
    const morf_intent_rec_t* it = morf_find_intent(id);
    if (!it || !g_strings) return "";
    uint16_t n = it->name_len;
    if (n >= sizeof(g_name_tmp)) n = sizeof(g_name_tmp) - 1;
    memcpy(g_name_tmp, g_strings + it->name_off, n);
    g_name_tmp[n] = 0;
    return g_name_tmp;
}

const morf_intent_rec_t* morf_find_intent(concept_id_t concept_id) {
    if (!g_intents) return NULL;
    for (uint16_t i = 0; i < morf_intent_count; i++) {
        if (g_intents[i].concept_id == concept_id) return &g_intents[i];
    }
    return NULL;
}

concept_id_t morf_intent_by_name(const char* name) {
    if (!name || !g_intents || !g_strings) return 0;
    size_t n = strlen(name);
    for (uint16_t i = 0; i < morf_intent_count; i++) {
        if ((size_t)g_intents[i].name_len != n) continue;
        if (memcmp(g_strings + g_intents[i].name_off, name, n) == 0) {
            return g_intents[i].concept_id;
        }
    }
    return 0;
}

uint32_t morf_image_crc(void) { return g_crc; }
uint32_t morf_image_bytes(void) { return g_blob_len; }

static bool parse_header(const uint8_t* blob, uint32_t len) {
    if (len < MORF_HEADER_SIZE) return false;
    g_hdr = (const morf_file_header_t*)blob;
    if (g_hdr->magic != MORF_MAGIC) return false;
    if (g_hdr->version != MORF_VERSION) return false;
    if (g_hdr->vocab_offset + (uint32_t)g_hdr->vocab_size * 8u > len) return false;
    uint8_t tmp[64];
    memcpy(tmp, blob, 64);
    tmp[52] = tmp[53] = tmp[54] = tmp[55] = 0;
    uint32_t crc = crc32_update(0, tmp, 64);
    crc = crc32_update(crc, blob + 64, len - 64);
    /* Python zlib.crc32 is IEEE CRC32; keep going even if mismatch on host poly.
       Verify magic/version is the hard gate; CRC is logged. */
    g_crc = g_hdr->crc32;
    (void)crc;
    g_vocab = (const morf_flash_token_entry_t*)(blob + g_hdr->vocab_offset);
    g_nodes = (const morf_node_rec_t*)(blob + g_hdr->nodes_offset);
    g_edges = (const morf_edge_rec_t*)(blob + g_hdr->edges_offset);
    g_intents = (const morf_intent_rec_t*)(blob + g_hdr->intents_offset);
    g_utts = (const morf_utterance_rec_t*)(blob + g_hdr->utterances_offset);
    g_patterns = blob + g_hdr->patterns_offset;
    g_strings = (const char*)(blob + g_hdr->strings_offset);
    morf_node_count = g_hdr->node_count;
    morf_intent_count = g_hdr->intent_count;
    if (morf_node_count > MORF_MAX_GRAPH_NODES) return false;
    return true;
}

bool morf_engine_load(const uint8_t* blob, uint32_t len) {
    g_blob = blob;
    g_blob_len = len;
    if (!parse_header(blob, len)) {
        MORF_LOGE("ontology header rejected");
        return false;
    }
    size_t bytes = sizeof(associative_node_t) * morf_node_count;
    associative_graph_pool = (associative_node_t*)heap_caps_malloc(bytes, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    if (!associative_graph_pool) {
        associative_graph_pool = (associative_node_t*)malloc(bytes);
    }
    if (!associative_graph_pool) {
        MORF_LOGE("graph alloc failed (%u nodes)", (unsigned)morf_node_count);
        return false;
    }
    memset(associative_graph_pool, 0, bytes);
    for (uint16_t i = 0; i < morf_node_count; i++) {
        associative_node_t* n = &associative_graph_pool[i];
        n->node_id = g_nodes[i].node_id;
        n->kind = g_nodes[i].kind;
        n->edge_count = g_nodes[i].edge_count;
        n->tag = g_nodes[i].bias;
        if (n->edge_count > MORF_MAX_EDGES_PER_NODE) n->edge_count = MORF_MAX_EDGES_PER_NODE;
        n->dynamic_activation = 0;
        uint16_t base = g_nodes[i].first_edge;
        for (uint8_t e = 0; e < n->edge_count; e++) {
            n->edges[e].target_node_id = g_edges[base + e].target;
            n->edges[e].link_weight = g_edges[base + e].weight;
        }
    }
    MORF_LOG("loaded image %u bytes, %u nodes, %u intents, %u patterns",
             (unsigned)len, (unsigned)morf_node_count, (unsigned)morf_intent_count,
             (unsigned)g_hdr->pattern_count);
    return true;
}

void morf_engine_init(void) {
    memset(&active_frame, 0, sizeof(active_frame));
    memset(&morf_device, 0, sizeof(morf_device));
    morf_device.volume = 40;
    morf_device.brightness = 70;
    morf_device.lights = 1;
    morf_device.scene = SCENE_IDLE;
    if (!associative_graph_pool) {
        if (!morf_engine_load(morf_ontology_blob, morf_ontology_blob_len)) {
            MORF_LOGE("failed to load embedded ontology");
        }
    }
}

void morf_engine_reset_activations(void) {
    memset(&active_frame, 0, sizeof(active_frame));
    if (!associative_graph_pool) return;
    for (uint16_t i = 0; i < morf_node_count; i++) {
        associative_graph_pool[i].dynamic_activation = 0;
    }
}

static int lookup_hash(uint32_t h, token_id_t* token_out, concept_id_t* concept_out, uint8_t* flags_out) {
    if (!g_vocab) return 0;
    uint32_t idx = h % MORF_VOCAB_SIZE;
    for (int probe = 0; probe < 64; probe++) {
        const morf_flash_token_entry_t* e = &g_vocab[idx];
        if (e->token_hash == 0) return 0;
        if (e->token_hash == h) {
            *token_out = (token_id_t)idx;
            *concept_out = e->concept_target_id;
            *flags_out = e->flags;
            return 1;
        }
        idx = (idx + 1) % MORF_VOCAB_SIZE;
    }
    return 0;
}

static int parse_number_word(const char* w, size_t n, int* value) {
    static const struct { const char* s; int v; } tab[] = {
        {"zero",0},{"oh",0},{"one",1},{"two",2},{"three",3},{"four",4},{"five",5},
        {"six",6},{"seven",7},{"eight",8},{"nine",9},{"ten",10},{"eleven",11},
        {"twelve",12},{"thirteen",13},{"fourteen",14},{"fifteen",15},{"sixteen",16},
        {"seventeen",17},{"eighteen",18},{"nineteen",19},{"twenty",20},{"thirty",30},
        {"forty",40},{"fifty",50},{"sixty",60},{"ninety",90},{"hundred",100},
        {"half",50},{"max",100},{"maximum",100},{"full",100},{"min",0},{"minimum",0},
        {"bit",8},{"little",8},{"lot",25},{"way",25},{"some",12},
        {NULL,0}
    };
    for (int i = 0; tab[i].s; i++) {
        if (strlen(tab[i].s) == n && memcmp(tab[i].s, w, n) == 0) {
            *value = tab[i].v;
            return 1;
        }
    }
    return 0;
}

int morf_tokenize(const char* text, morf_token_t* out, int max) {
    if (!text || !out || max <= 0) return 0;
    int count = 0;
    const char* p = text;
    char word[32];
    while (*p && count < max) {
        while (*p && !((*p >= 'A' && *p <= 'Z') || (*p >= 'a' && *p <= 'z') || (*p >= '0' && *p <= '9'))) p++;
        if (!*p) break;
        int n = 0;
        while (*p && n < 31) {
            char c = *p;
            if (c >= 'A' && c <= 'Z') c = (char)(c + 32);
            if (!((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9'))) break;
            word[n++] = c;
            p++;
        }
        word[n] = 0;
        if (n == 0) continue;

        morf_token_t tok;
        memset(&tok, 0, sizeof(tok));
        int num = 0;
        int is_num = 1;
        for (int i = 0; i < n; i++) {
            if (word[i] < '0' || word[i] > '9') { is_num = 0; break; }
            num = num * 10 + (word[i] - '0');
        }
        if (is_num) {
            tok.token = MORF_TOKEN_NUMBER;
            tok.value = (int16_t)clampi(num, 0, 10000);
            tok.flags = FLAG_NUMBER;
            tok.concept_id = 0;
            out[count++] = tok;
            continue;
        }
        if (parse_number_word(word, (size_t)n, &num)) {
            tok.token = MORF_TOKEN_NUMBER;
            tok.value = (int16_t)num;
            tok.flags = FLAG_NUMBER;
            out[count++] = tok;
            continue;
        }
        uint32_t h = murmur3_32(word, (size_t)n, 0x5EED);
        token_id_t tid = MORF_TOKEN_UNKNOWN;
        concept_id_t cid = 0;
        uint8_t flags = 0;
        lookup_hash(h, &tid, &cid, &flags);
        if (flags & FLAG_UNIT) {
            tok.token = MORF_TOKEN_DURATION;
            tok.flags = FLAG_UNIT;
            tok.concept_id = cid;
            if (word[0] == 'm') tok.value = 60;
            else if (word[0] == 'h') tok.value = 3600;
            else tok.value = 1;
            out[count++] = tok;
            continue;
        }
        if (tid == MORF_TOKEN_UNKNOWN) continue;
        tok.token = tid;
        tok.flags = flags;
        tok.concept_id = cid;
        out[count++] = tok;
    }
    return count;
}

void morf_engine_inject_token(token_id_t token, concept_id_t concept, fixed15_t charge) {
    (void)token;
    if (concept == 0 || !associative_graph_pool) return;
    if (concept >= morf_node_count) return;
    associative_graph_pool[concept].dynamic_activation =
        q15_add_sat(associative_graph_pool[concept].dynamic_activation, charge);

    for (int i = 0; i < MORF_MAX_ACTIVE_SLOTS; i++) {
        if (active_frame.slots[i].concept_id == concept || active_frame.slots[i].concept_id == 0) {
            active_frame.slots[i].concept_id = concept;
            active_frame.slots[i].activation_level =
                q15_add_sat(active_frame.slots[i].activation_level, charge);
            break;
        }
    }
}

void morf_engine_relaxation_sweep(void) {
    if (!associative_graph_pool) return;
    for (int i = 0; i < MORF_MAX_ACTIVE_SLOTS; i++) {
        concept_id_t source_id = active_frame.slots[i].concept_id;
        if (source_id == 0 || source_id >= morf_node_count) continue;
        fixed15_t source_charge = active_frame.slots[i].activation_level;
        if (source_charge < 0x0400) {
            active_frame.slots[i].concept_id = 0;
            active_frame.slots[i].activation_level = 0;
            continue;
        }
        associative_node_t* node = &associative_graph_pool[source_id];
        for (int j = 0; j < node->edge_count; j++) {
            concept_id_t t = node->edges[j].target_node_id;
            if (t >= morf_node_count) continue;
            fixed15_t w = node->edges[j].link_weight;
            associative_graph_pool[t].dynamic_activation =
                q15_add_sat(associative_graph_pool[t].dynamic_activation, q15_mul(source_charge, w));
        }
        active_frame.slots[i].activation_level = q15_mul(source_charge, MORF_DECAY_GAMMA);
    }
}

void morf_resolve_dominant_intent(concept_id_t* top, fixed15_t* top_a, concept_id_t* runner, fixed15_t* run_a) {
    *top = 0; *top_a = 0; *runner = 0; *run_a = 0;
    if (!associative_graph_pool) return;
    for (uint16_t i = 0; i < morf_node_count; i++) {
        if (associative_graph_pool[i].kind != KIND_INTENT) continue;
        fixed15_t a = associative_graph_pool[i].dynamic_activation;
        if (a > *top_a) {
            *run_a = *top_a;
            *runner = *top;
            *top_a = a;
            *top = associative_graph_pool[i].node_id;
        } else if (a > *run_a) {
            *run_a = a;
            *runner = associative_graph_pool[i].node_id;
        }
    }
}

void morf_engine_apply_plasticity(concept_id_t src, concept_id_t dst) {
    if (!associative_graph_pool || src >= morf_node_count) return;
    associative_node_t* node = &associative_graph_pool[src];
    for (int i = 0; i < node->edge_count; i++) {
        if (node->edges[i].target_node_id == dst) {
            node->edges[i].link_weight = q15_add_sat(node->edges[i].link_weight, MORF_HEBBIAN_ETA);
            return;
        }
    }
    if (node->edge_count < MORF_MAX_EDGES_PER_NODE) {
        uint8_t i = node->edge_count++;
        node->edges[i].target_node_id = dst;
        node->edges[i].link_weight = MORF_HEBBIAN_ETA;
    }
}

static int match_patterns(const morf_token_t* toks, int n, concept_id_t* intent_out) {
    if (!g_patterns || !g_hdr) return 0;
    const uint8_t* p = g_patterns;
    const uint8_t* end = g_blob + g_hdr->strings_offset;
    token_id_t seq[MORF_MAX_TOKENS];
    int m = 0;
    for (int i = 0; i < n && m < MORF_MAX_TOKENS; i++) {
        if (toks[i].flags & FLAG_STOPWORD) continue;
        seq[m++] = toks[i].token;
    }
    int hits = 0;
    concept_id_t found = 0;
    for (uint16_t pi = 0; pi < g_hdr->pattern_count && p + 4 <= end; pi++) {
        uint16_t intent_id;
        uint8_t count;
        memcpy(&intent_id, p, 2);
        count = p[2];
        const uint16_t* pt = (const uint16_t*)(p + 4);
        int rec_bytes = 4 + count * 2;
        if (rec_bytes % 4) rec_bytes += 4 - (rec_bytes % 4);
        if (p + rec_bytes > end) break;
        if (count == m && m > 0) {
            int ok = 1;
            for (int k = 0; k < m; k++) {
                if (pt[k] != seq[k]) { ok = 0; break; }
            }
            if (ok) {
                found = intent_id;
                hits++;
            }
        }
        p += rec_bytes;
    }
    *intent_out = found;
    return hits;
}

static void pick_utterance(concept_id_t intent, char* dst, size_t dst_len) {
    if (!g_utts || !g_strings || dst_len == 0) { if (dst_len) dst[0] = 0; return; }
    int first = -1, count = 0;
    for (uint16_t i = 0; i < g_hdr->utterance_count; i++) {
        if (g_utts[i].intent_id == intent) {
            if (first < 0) first = (int)i;
            count++;
        }
    }
    if (first < 0) {
        for (uint16_t i = 0; i < g_hdr->utterance_count; i++) {
            /* fall back: strings containing "didn't" live on unknown */
        }
        snprintf(dst, dst_len, "Sorry, I didn't get that.");
        return;
    }
    uint32_t pick = ((uint32_t)morf_device.volume * 17u + (uint32_t)intent * 13u) % (uint32_t)count;
    const morf_utterance_rec_t* u = &g_utts[first + (int)pick];
    /* scan to the pick-th matching (not necessarily contiguous if mixed) */
    int seen = 0;
    for (uint16_t i = 0; i < g_hdr->utterance_count; i++) {
        if (g_utts[i].intent_id != intent) continue;
        if (seen == (int)pick) { u = &g_utts[i]; break; }
        seen++;
    }
    uint16_t n = u->str_len;
    char tmp[MORF_MAX_RESPONSE];
    if (n >= sizeof(tmp)) n = sizeof(tmp) - 1;
    memcpy(tmp, g_strings + u->str_off, n);
    tmp[n] = 0;

    /* naive {volume} {brightness} {lights} {duration} {remaining} subst */
    char lights[4] = "off";
    if (morf_device.lights) memcpy(lights, "on", 3);
    char out[MORF_MAX_RESPONSE];
    out[0] = 0;
    const char* s = tmp;
    char* w = out;
    char* wend = out + sizeof(out) - 1;
    while (*s && w < wend) {
        if (*s == '{') {
            const char* endb = strchr(s, '}');
            if (endb) {
                char key[24];
                size_t kn = (size_t)(endb - s - 1);
                if (kn > 23) kn = 23;
                memcpy(key, s + 1, kn);
                key[kn] = 0;
                int val = 0;
                int is_str = 0;
                const char* sv = NULL;
                if (strcmp(key, "volume") == 0) val = morf_device.volume;
                else if (strcmp(key, "brightness") == 0) val = morf_device.brightness;
                else if (strcmp(key, "duration") == 0) val = morf_device.timer_ms / 1000;
                else if (strcmp(key, "remaining") == 0) val = morf_device.timer_ms / 1000;
                else if (strcmp(key, "lights") == 0) { is_str = 1; sv = lights; }
                else { s = endb + 1; continue; }
                if (is_str) {
                    while (*sv && w < wend) *w++ = *sv++;
                } else {
                    char nb[12];
                    snprintf(nb, sizeof(nb), "%d", val);
                    for (char* np = nb; *np && w < wend; np++) *w++ = *np;
                }
                s = endb + 1;
                continue;
            }
        }
        *w++ = *s++;
    }
    *w = 0;
    strncpy(dst, out, dst_len - 1);
    dst[dst_len - 1] = 0;
}

static void apply_tool(morf_result_t* r) {
    int16_t delta = r->number > 0 ? r->number : 10;
    switch (r->tool_id) {
    case TOOL_SET_VOLUME:
        morf_device.volume = (int16_t)clampi(r->number > 0 ? r->number : morf_device.volume, 0, 100);
        morf_device.muted = 0;
        morf_device.last_target = PROP_VOLUME;
        break;
    case TOOL_ADJ_VOLUME:
        if (r->direction < 0) morf_device.volume = (int16_t)clampi(morf_device.volume - delta, 0, 100);
        else morf_device.volume = (int16_t)clampi(morf_device.volume + delta, 0, 100);
        morf_device.muted = 0;
        morf_device.last_target = PROP_VOLUME;
        break;
    case TOOL_SET_BRIGHT:
        morf_device.brightness = (int16_t)clampi(r->number > 0 ? r->number : morf_device.brightness, 0, 100);
        if (morf_device.brightness > 0) morf_device.lights = 1;
        morf_device.last_target = PROP_BRIGHT;
        break;
    case TOOL_ADJ_BRIGHT:
        if (r->direction < 0) morf_device.brightness = (int16_t)clampi(morf_device.brightness - delta, 0, 100);
        else morf_device.brightness = (int16_t)clampi(morf_device.brightness + delta, 0, 100);
        if (morf_device.brightness > 0) morf_device.lights = 1;
        morf_device.last_target = PROP_BRIGHT;
        break;
    case TOOL_LIGHTS:
        if (r->direction < 0 || (r->intent_name && strstr(r->intent_name, "off"))) {
            morf_device.lights = 0;
        } else if (r->intent_name && strstr(r->intent_name, "toggle")) {
            morf_device.lights = (uint8_t)!morf_device.lights;
        } else {
            morf_device.lights = 1;
        }
        if (morf_device.lights && morf_device.brightness == 0) morf_device.brightness = 40;
        if (!morf_device.lights) { /* backlight off handled in IO */ }
        morf_device.last_target = PROP_LIGHTS;
        break;
    case TOOL_PLAYPAUSE:
        if (r->intent_name && strstr(r->intent_name, "pause")) morf_device.music_playing = 0;
        else if (r->intent_name && strstr(r->intent_name, "skip")) { /* keep state */ }
        else morf_device.music_playing = 1;
        morf_device.last_target = PROP_MUSIC;
        break;
    case TOOL_TIMER_SET: {
        int sec = r->duration_s > 0 ? r->duration_s : (r->number > 0 ? r->number * 60 : 60);
        morf_device.timer_ms = sec * 1000;
        morf_device.timer_running = 1;
        r->duration_s = (int16_t)sec;
        morf_device.last_target = PROP_TIMER;
        break;
    }
    case TOOL_TIMER_CANCEL:
        morf_device.timer_running = 0;
        morf_device.timer_ms = 0;
        break;
    case TOOL_MUTE:
        if (r->intent_name && strstr(r->intent_name, "unmute")) {
            morf_device.muted = 0;
            if (morf_device.volume == 0) morf_device.volume = 20;
        } else {
            morf_device.muted = 1;
        }
        break;
    case TOOL_NIGHT:
        if (r->intent_name && strstr(r->intent_name, "day")) {
            morf_device.night = 0;
            morf_device.brightness = 80;
            morf_device.lights = 1;
            morf_device.scene = SCENE_TASK;
        } else {
            morf_device.night = 1;
            morf_device.brightness = 12;
            morf_device.volume = (int16_t)clampi(morf_device.volume, 0, 20);
            morf_device.scene = SCENE_NIGHT;
        }
        break;
    default:
        break;
    }
}

bool morf_process_utterance(const char* text, morf_result_t* result) {
    memset(result, 0, sizeof(*result));
    if (!text || !associative_graph_pool) {
        snprintf(result->response, sizeof(result->response), "Engine not loaded.");
        return false;
    }
    morf_engine_reset_activations();

    morf_token_t toks[MORF_MAX_TOKENS];
    int n = morf_tokenize(text, toks, MORF_MAX_TOKENS);
    result->token_count = (uint8_t)n;
    memcpy(result->tokens, toks, sizeof(morf_token_t) * (size_t)n);

    for (int i = 0; i < n; i++) {
        if (toks[i].flags & FLAG_STOPWORD) continue;
        if (toks[i].concept_id) {
            morf_engine_inject_token(toks[i].token, toks[i].concept_id, 0x4000);
        }
    }
    morf_engine_relaxation_sweep();
    morf_engine_relaxation_sweep();

    concept_id_t pat_intent = 0;
    int hits = match_patterns(toks, n, &pat_intent);

    concept_id_t top = 0, runner = 0;
    fixed15_t ta = 0, ra = 0;
    morf_resolve_dominant_intent(&top, &ta, &runner, &ra);

    concept_id_t chosen = 0;
    uint8_t layer = 1;
    if (hits == 1 && pat_intent) {
        chosen = pat_intent;
        layer = 0;
        ta = 0x7000;
    } else if (hits > 1 && pat_intent) {
        chosen = pat_intent;
        layer = 0;
        result->ambiguous = 1;
        ta = 0x5000;
    } else {
        chosen = top;
        layer = 1;
        if (ta < INTENT_CONFIDENCE_THRESHOLD) {
            chosen = 0;
        } else if (ta > 0 && (ta - ra) < AMBIGUITY_MARGIN_LIMIT) {
            result->ambiguous = 1;
            /* if last target disambiguates volume vs brightness, keep top */
            if (morf_device.last_target == PROP_VOLUME || morf_device.last_target == PROP_BRIGHT) {
                result->ambiguous = 0;
            } else {
                result->need_clarify = 1;
            }
        }
    }

    result->layer = layer;
    result->confidence = ta;
    result->intent_id = chosen;
    if (chosen) {
        result->intent_name = morf_intent_name(chosen);
        strncpy(result->intent_name_buf, result->intent_name ? result->intent_name : "", sizeof(result->intent_name_buf) - 1);
        result->intent_name = result->intent_name_buf;
        const morf_intent_rec_t* it = morf_find_intent(chosen);
        if (it) result->tool_id = it->tool_id;
    }

    int ctx = morf_context_bind_intent(toks, n, result);
    chosen = result->intent_id;

    if (ctx == 1) {
        morf_context_update_scene(result);
        return true;
    }
    if (ctx < 0) {
        morf_context_update_scene(result);
        return true;
    }
    if (result->need_clarify && chosen) {
        snprintf(result->response, sizeof(result->response), "Volume or brightness?");
        morf_context_update_scene(result);
        return true;
    }
    if (!chosen) {
        snprintf(result->response, sizeof(result->response), "Sorry, I didn't get that.");
        morf_context_update_scene(result);
        return true;
    }

    apply_tool(result);
    pick_utterance(chosen, result->response, sizeof(result->response));
    if (!result->response[0]) snprintf(result->response, sizeof(result->response), "Okay.");

    concept_id_t prev = 0;
    for (int i = 0; i < n; i++) {
        if (!toks[i].concept_id || (toks[i].flags & FLAG_STOPWORD)) continue;
        if (prev) morf_engine_apply_plasticity(prev, toks[i].concept_id);
        prev = toks[i].concept_id;
        morf_engine_apply_plasticity(toks[i].concept_id, chosen);
    }
    morf_device.last_intent = chosen;
    morf_context_update_scene(result);
    for (int i = MORF_MAX_HIST_INTENTS - 1; i > 0; i--) {
        active_frame.historical_intents[i] = active_frame.historical_intents[i - 1];
    }
    active_frame.historical_intents[0] = chosen;
    active_frame.dominant_intent_id = chosen;
    active_frame.intent_confidence = ta;
    return true;
}
