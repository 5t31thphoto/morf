#include "morf_acoustic.h"
#include "morf_ipc.h"
#include "morf_config.h"
#include <string.h>
#include <stdlib.h>

#if __has_include(<M5Unified.h>)
#include <M5Unified.h>
#define MORF_HAS_M5 1
#endif

#ifdef ESP_PLATFORM
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#ifndef MORF_HAS_M5
#include "driver/i2s.h"
#endif
#endif

#ifndef MORF_I2S_SCK
#define MORF_I2S_SCK 4
#endif
#ifndef MORF_I2S_WS
#define MORF_I2S_WS  5
#endif
#ifndef MORF_I2S_SD
#define MORF_I2S_SD  6
#endif

#define FRAME_SAMPLES 320
#define BANDS 16
#define MAX_FRAMES 40
#define MAX_TEMPLATES 8

typedef struct {
    uint8_t used;
    uint8_t frames;
    int8_t  bands[MAX_FRAMES][BANDS];
    char    phrase[96];
} voice_template_t;

static morf_acoustic_status_t g_st;
static voice_template_t g_tpl[MAX_TEMPLATES];
static int16_t g_frame[FRAME_SAMPLES];
static int8_t g_utt[MAX_FRAMES][BANDS];
static uint8_t g_utt_frames;
static uint8_t g_silence_run;
static uint8_t g_teach_slot = 0xFF;
static uint8_t g_in_utt;
static char g_pending_phrase[96];
static uint8_t g_i2s_ok;

static uint32_t energy_rms(const int16_t* x, int n) {
    uint64_t acc = 0;
    for (int i = 0; i < n; i++) {
        int32_t v = x[i];
        acc += (uint64_t)(v * v);
    }
    return (uint32_t)(acc / (uint32_t)n);
}

static void filterbank(const int16_t* x, int n, int8_t* out) {
    int bin = n / BANDS;
    if (bin < 1) bin = 1;
    for (int b = 0; b < BANDS; b++) {
        uint32_t acc = 0;
        int start = b * bin;
        int end = (b == BANDS - 1) ? n : start + bin;
        for (int i = start; i < end; i++) {
            int v = x[i];
            acc += (uint32_t)(v < 0 ? -v : v);
        }
        uint32_t avg = acc / (uint32_t)(end - start);
        int8_t q = (int8_t)((avg >> 8) > 127 ? 127 : (avg >> 8));
        out[b] = q;
    }
}

static int dtw_score(const voice_template_t* t, int frames) {
    if (!t->used || t->frames == 0 || frames == 0) return -1;
    int sum = 0;
    int steps = t->frames > frames ? t->frames : frames;
    for (int i = 0; i < steps; i++) {
        int a = (int)((i * (t->frames - 1)) / (steps > 1 ? steps - 1 : 1));
        int b = (int)((i * (frames - 1)) / (steps > 1 ? steps - 1 : 1));
        int row = 0;
        for (int k = 0; k < BANDS; k++) {
            int d = (int)t->bands[a][k] - (int)g_utt[b][k];
            if (d < 0) d = -d;
            row += d;
        }
        sum += row;
    }
    int mean = sum / steps;
    int score = 100 - mean / 8;
    if (score < 0) score = 0;
    if (score > 100) score = 100;
    return score;
}

static bool capture_frame(void) {
#ifdef MORF_HAS_M5
    if (!M5.Mic.isEnabled()) return false;
    return M5.Mic.record(g_frame, FRAME_SAMPLES, 16000);
#elif defined(ESP_PLATFORM)
    if (!g_i2s_ok) return false;
    size_t got = 0;
    i2s_read(I2S_NUM_0, g_frame, FRAME_SAMPLES * sizeof(int16_t), &got, 30 / portTICK_PERIOD_MS);
    return got >= (FRAME_SAMPLES * sizeof(int16_t)) / 2;
#else
    (void)g_frame;
    return false;
#endif
}

static void copy_phrase(char* dst, size_t cap, const char* src) {
    if (!dst || cap == 0) return;
    dst[0] = 0;
    if (!src) return;
    size_t n = 0;
    while (src[n] && n + 1 < cap) {
        dst[n] = src[n];
        n++;
    }
    dst[n] = 0;
}

void morf_acoustic_init(void) {
    memset(&g_st, 0, sizeof(g_st));
    memset(g_tpl, 0, sizeof(g_tpl));
    g_utt_frames = 0;
    g_silence_run = 0;
    g_in_utt = 0;
    g_st.last_match_score = -1;
    g_pending_phrase[0] = 0;
    g_i2s_ok = 0;
#ifdef MORF_HAS_M5
    auto mic_cfg = M5.Mic.config();
    mic_cfg.sample_rate = 16000;
    M5.Mic.config(mic_cfg);
    M5.Mic.begin();
    g_i2s_ok = 1;
#elif defined(ESP_PLATFORM)
    i2s_config_t cfg;
    memset(&cfg, 0, sizeof(cfg));
    cfg.mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX);
    cfg.sample_rate = 16000;
    cfg.bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT;
    cfg.channel_format = I2S_CHANNEL_FMT_ONLY_LEFT;
    cfg.communication_format = I2S_COMM_FORMAT_STAND_I2S;
    cfg.intr_alloc_flags = ESP_INTR_FLAG_LEVEL1;
    cfg.dma_buf_count = 4;
    cfg.dma_buf_len = FRAME_SAMPLES;
    cfg.use_apll = false;
    if (i2s_driver_install(I2S_NUM_0, &cfg, 0, NULL) == ESP_OK) {
        i2s_pin_config_t pins;
        memset(&pins, 0, sizeof(pins));
        pins.mck_io_num = I2S_PIN_NO_CHANGE;
        pins.bck_io_num = MORF_I2S_SCK;
        pins.ws_io_num = MORF_I2S_WS;
        pins.data_out_num = I2S_PIN_NO_CHANGE;
        pins.data_in_num = MORF_I2S_SD;
        if (i2s_set_pin(I2S_NUM_0, &pins) == ESP_OK) g_i2s_ok = 1;
    }
#endif
}

void morf_acoustic_begin_teach(uint8_t slot) {
    if (slot == 0xFF) {
        for (int i = 0; i < MAX_TEMPLATES; i++) {
            if (!g_tpl[i].used) { slot = (uint8_t)i; break; }
        }
        if (slot == 0xFF) slot = 0;
    }
    if (slot < MAX_TEMPLATES) g_teach_slot = slot;
}

void morf_acoustic_bind_next(const char* phrase) {
    copy_phrase(g_pending_phrase, sizeof(g_pending_phrase), phrase);
}

const morf_acoustic_status_t* morf_acoustic_status(void) { return &g_st; }

bool morf_acoustic_take_endpoint(void) {
    if (g_st.vad) {
        g_st.vad = 0;
        return true;
    }
    return false;
}

void morf_acoustic_tick(void) {
    if (!capture_frame()) return;
    uint32_t rms = energy_rms(g_frame, FRAME_SAMPLES);
    g_st.rms = rms;
    const uint32_t TH = 180000;
    uint8_t speech = rms > TH;
    g_st.speaking = speech;

    if (speech) {
        g_silence_run = 0;
        if (!g_in_utt) {
            g_in_utt = 1;
            g_utt_frames = 0;
            g_st.utterance_ms = 0;
        }
        if (g_utt_frames < MAX_FRAMES) {
            filterbank(g_frame, FRAME_SAMPLES, g_utt[g_utt_frames]);
            g_utt_frames++;
        }
        g_st.utterance_ms = (uint16_t)(g_utt_frames * 20);
    } else if (g_in_utt) {
        g_silence_run++;
        if (g_silence_run >= 8) {
            g_in_utt = 0;
            g_st.vad = 1;
            g_st.last_phrase[0] = 0;
            if (g_teach_slot < MAX_TEMPLATES && g_utt_frames > 4) {
                voice_template_t* t = &g_tpl[g_teach_slot];
                t->used = 1;
                t->frames = g_utt_frames;
                memcpy(t->bands, g_utt, sizeof(int8_t) * g_utt_frames * BANDS);
                if (g_pending_phrase[0]) copy_phrase(t->phrase, sizeof(t->phrase), g_pending_phrase);
                g_st.taught_templates++;
                g_st.last_match_score = 100;
                g_st.last_match_slot = g_teach_slot;
                copy_phrase(g_st.last_phrase, sizeof(g_st.last_phrase), t->phrase);
                g_teach_slot = 0xFF;
                g_pending_phrase[0] = 0;
                if (t->phrase[0]) {
                    morf_ipc_push_text(MORF_IPC_VOICE, t->phrase, 100, g_st.last_match_slot);
                }
            } else if (g_utt_frames > 4) {
                int best = -1, besti = -1;
                for (int i = 0; i < MAX_TEMPLATES; i++) {
                    int sc = dtw_score(&g_tpl[i], g_utt_frames);
                    if (sc > best) { best = sc; besti = i; }
                }
                g_st.last_match_score = (int16_t)best;
                g_st.last_match_slot = (uint8_t)(besti < 0 ? 0 : besti);
                if (besti >= 0 && best >= 72 && g_tpl[besti].phrase[0]) {
                    copy_phrase(g_st.last_phrase, sizeof(g_st.last_phrase), g_tpl[besti].phrase);
                    morf_ipc_push_text(MORF_IPC_VOICE, g_tpl[besti].phrase, (int16_t)best, (uint8_t)besti);
                }
            }
            g_utt_frames = 0;
        }
    }
}

#ifdef ESP_PLATFORM
static void acoustic_task(void* arg) {
    (void)arg;
    for (;;) {
        morf_acoustic_tick();
        vTaskDelay(pdMS_TO_TICKS(1));
    }
}

void morf_acoustic_start_task(void) {
    xTaskCreatePinnedToCore(acoustic_task, "morf_i2s", 4096, NULL, 5, NULL, MORF_CORE_IO);
}
#else
void morf_acoustic_start_task(void) { }
#endif
