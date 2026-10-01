#include <Arduino.h>
#include <string.h>

#if __has_include(<M5Unified.h>)
#include <M5Unified.h>
#define MORF_HAS_M5 1
#endif

extern "C" {
#include "morf_engine.h"
#include "morf_acoustic.h"
#include "morf_ipc.h"
#include "morf_context.h"
}

static char linebuf[192];
static size_t linelen = 0;
static uint32_t last_timer_ms = 0;
static uint32_t last_draw_ms = 0;
static volatile uint8_t g_result_ready = 0;
static morf_result_t g_last;

static void apply_io_from_device(void) {
#ifdef MORF_HAS_M5
    int spk = morf_device.muted ? 0 : (int)(morf_device.volume * 255 / 100);
    M5.Speaker.setVolume((uint8_t)spk);
    int bright = morf_device.lights ? morf_device.brightness : 0;
    M5.Display.setBrightness((uint8_t)(bright * 255 / 100));
#endif
}

static void draw_face(const morf_result_t* last) {
#ifdef MORF_HAS_M5
    auto& d = M5.Display;
    d.fillScreen(TFT_BLACK);
    d.setTextColor(0x07F9);
    d.setTextSize(1);
    d.setCursor(8, 8);
    d.printf("MORF  ESP32-S3");
    d.setCursor(8, 22);
    d.setTextColor(0xC618);
    d.printf("v%04x  %uB", MORF_VERSION, (unsigned)morf_image_bytes());

    int cx = 160, cy = 90;
    uint16_t eye = morf_device.scene == SCENE_NIGHT ? 0x4208 : 0x07F9;
    d.fillCircle(cx - 28, cy, 8, eye);
    d.fillCircle(cx + 28, cy, 8, eye);
    int mouth = 10;
    if (last && last->tool_id != TOOL_NONE) mouth = 16;
    d.drawLine(cx - 18, cy + 28, cx, cy + 28 + (mouth / 8), eye);
    d.drawLine(cx, cy + 28 + (mouth / 8), cx + 18, cy + 28, eye);

    d.setCursor(8, 150);
    d.setTextColor(0xFFFF);
    if (last && last->intent_name_buf[0]) {
        d.printf("%s  c=%d", last->intent_name_buf, last->confidence);
    } else {
        d.printf("listening");
    }
    d.setCursor(8, 168);
    d.setTextColor(0x07E0);
    d.printf("vol %d  brt %d  %s", morf_device.volume, morf_device.brightness,
             morf_device.lights ? "ON" : "OFF");
    d.setCursor(8, 186);
    d.setTextColor(0x8410);
    const morf_acoustic_status_t* a = morf_acoustic_status();
    d.printf("rms %lu  vad %u  mic %u",
             (unsigned long)a->rms, a->speaking, a->taught_templates);
    if (morf_device.timer_running) {
        d.setCursor(8, 204);
        d.setTextColor(0xFDA0);
        d.printf("timer %ds", (int)(morf_device.timer_ms / 1000));
    }
#else
    (void)last;
#endif
}

static void handle_utterance(const char* line, int16_t voice_score) {
    morf_result_t r;
    morf_process_utterance(line, &r);
    g_last = r;
    g_result_ready = 1;
    apply_io_from_device();
    Serial.printf("intent=%s layer=%u conf=%d tool=%u amb=%u n=%d dur=%d prop=%u dir=%d",
                  r.intent_name_buf[0] ? r.intent_name_buf : "-",
                  r.layer, r.confidence, r.tool_id, r.ambiguous, r.number, r.duration_s,
                  r.property, r.direction);
    if (voice_score >= 0) Serial.printf(" voice=%d", voice_score);
    Serial.println();
    Serial.println(r.response);
#ifdef MORF_HAS_M5
    if (r.tool_id == TOOL_TIMER_SET && !morf_device.muted) {
        M5.Speaker.tone(880, 80);
    }
#endif
}

static void handle_line(char* line) {
    while (*line == ' ' || *line == '\t') line++;
    size_t n = strlen(line);
    while (n && (line[n - 1] == '\r' || line[n - 1] == '\n' || line[n - 1] == ' ')) {
        line[--n] = 0;
    }
    if (!n) return;

    if (strcmp(line, "/status") == 0) {
        Serial.printf("vol=%d bright=%d lights=%u mute=%u music=%u timer=%d scene=%u crc=0x%08lx bytes=%lu pending=%u\n",
                      morf_device.volume, morf_device.brightness, morf_device.lights,
                      morf_device.muted, morf_device.music_playing,
                      (int)(morf_device.timer_ms / 1000), morf_device.scene,
                      (unsigned long)morf_image_crc(), (unsigned long)morf_image_bytes(),
                      (unsigned)morf_device.pending_intent);
        return;
    }
    if (strncmp(line, "/teach-voice", 12) == 0) {
        const char* p = line + 12;
        while (*p == ' ') p++;
        morf_acoustic_begin_teach(0xFF);
        if (*p) morf_acoustic_bind_next(p);
        morf_ipc_push_text(MORF_IPC_TEACH, p, 0, 0);
        Serial.printf("Speak now — binding voice template to '%s'\n", *p ? p : "(next phrase)");
        return;
    }

    morf_ipc_push_text(MORF_IPC_TEXT, line, -1, 0);
}

static void tick_timer(void) {
    if (morf_device.timer_running) {
        uint32_t now = millis();
        if (last_timer_ms == 0) last_timer_ms = now;
        uint32_t dt = now - last_timer_ms;
        last_timer_ms = now;
        morf_device.timer_ms -= (int32_t)dt;
        if (morf_device.timer_ms <= 0) {
            morf_device.timer_ms = 0;
            morf_device.timer_running = 0;
            Serial.println("TIMER_DONE");
#ifdef MORF_HAS_M5
            if (!morf_device.muted) {
                M5.Speaker.tone(660, 180);
                delay(80);
                M5.Speaker.tone(990, 220);
            }
#endif
        }
    } else {
        last_timer_ms = 0;
    }
}

static void inference_task(void* arg) {
    (void)arg;
    for (;;) {
        morf_ipc_msg_t m;
        while (morf_ipc_pop(&m) == 0) {
            if (m.type == MORF_IPC_TEACH) {
                if (m.text[0]) morf_acoustic_bind_next(m.text);
                continue;
            }
            if (m.text[0]) handle_utterance(m.text, m.type == MORF_IPC_VOICE ? m.score : -1);
        }
        tick_timer();
        vTaskDelay(pdMS_TO_TICKS(4));
    }
}

void setup() {
    Serial.begin(115200);
    delay(200);
#ifdef MORF_HAS_M5
    auto cfg = M5.config();
    cfg.serial_baudrate = 115200;
    M5.begin(cfg);
    M5.Display.setRotation(1);
    M5.Speaker.begin();
#endif
    Serial.println("============== MORF AI CORE ==============");
    morf_ipc_init();
    morf_engine_init();
    morf_acoustic_init();
    apply_io_from_device();
#ifdef MORF_HAS_M5
    draw_face(nullptr);
#endif
    morf_acoustic_start_task();
    xTaskCreatePinnedToCore(inference_task, "morf_nlu", 8192, NULL, configMAX_PRIORITIES - 2, NULL, MORF_CORE_ENGINE);
    Serial.println("USB CDC ready. Core 0 I2S / Core 1 NLU.");
    Serial.println("Type a command or /teach-voice turn the music down");
}

void loop() {
#ifdef MORF_HAS_M5
    M5.update();
#endif
    while (Serial.available()) {
        char c = (char)Serial.read();
        if (c == '\n' || c == '\r') {
            if (linelen) {
                linebuf[linelen] = 0;
                handle_line(linebuf);
                linelen = 0;
            }
        } else if (linelen + 1 < sizeof(linebuf)) {
            linebuf[linelen++] = c;
        }
    }
#ifdef MORF_HAS_M5
    uint32_t now = millis();
    if (now - last_draw_ms > 400) {
        last_draw_ms = now;
        draw_face(&g_last);
    }
#endif
    delay(2);
}
