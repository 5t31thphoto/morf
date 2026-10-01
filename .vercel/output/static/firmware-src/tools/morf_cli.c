/* Host bench for the SAME firmware engine. Build:
 *   gcc -O2 -I firmware/include \
 *       firmware/src/morf_engine.c firmware/src/morf_context.c firmware/src/morf_ipc.c \
 *       firmware/src/morf_ontology_blob.c tools/morf_cli.c -o morf_cli
 */
#include "morf_engine.h"
#include "morf_ipc.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

typedef struct { const char* text; const char* intent; int number; int duration; } gold_t;

static const gold_t GOLD[] = {
    {"hello", "greet", 0, 0},
    {"hey", "greet", 0, 0},
    {"thanks", "thanks", 0, 0},
    {"who are you", "identity", 0, 0},
    {"what can you do", "help", 0, 0},
    {"turn the music down", "volume_down", 0, 0},
    {"turn it down", "volume_down", 0, 0},
    {"too loud", "volume_down", 0, 0},
    {"volume up", "volume_up", 0, 0},
    {"louder", "volume_up", 0, 0},
    {"set volume to 30", "volume_set", 30, 0},
    {"what is the volume", "volume_query", 0, 0},
    {"mute", "mute", 0, 0},
    {"raise the brightness", "bright_up", 0, 0},
    {"make it darker", "bright_down", 0, 0},
    {"dim", "bright_down", 0, 0},
    {"lights off", "lights_off", 0, 0},
    {"turn the lights on", "lights_on", 0, 0},
    {"kill the lights", "lights_off", 0, 0},
    {"play music", "play", 0, 0},
    {"pause", "pause", 0, 0},
    {"set a timer for 3 minutes", "timer_set", 3, 180},
    {"cancel timer", "timer_cancel", 0, 0},
    {"night mode", "night_mode", 0, 0},
    {"status", "status", 0, 0},
    {"goodbye", "farewell", 0, 0},
};

static int run_eval(void) {
    int pass = 0;
    int n = (int)(sizeof(GOLD) / sizeof(GOLD[0]));
    for (int i = 0; i < n; i++) {
        morf_engine_reset_activations();
        morf_device.pending_intent = 0;
        morf_device.last_target = 0;
        morf_result_t r;
        morf_process_utterance(GOLD[i].text, &r);
        int ok = strcmp(r.intent_name_buf, GOLD[i].intent) == 0;
        if (GOLD[i].number && r.number != GOLD[i].number) ok = 0;
        if (GOLD[i].duration && r.duration_s != GOLD[i].duration) ok = 0;
        printf("%s  %s → %s  n=%d dur=%d  %s\n",
               ok ? "PASS" : "FAIL", GOLD[i].text, r.intent_name_buf[0] ? r.intent_name_buf : "(none)",
               r.number, r.duration_s, r.response);
        if (ok) pass++;
    }
    printf("%d/%d gold\n", pass, n);
    return pass == n ? 0 : 1;
}

int main(int argc, char** argv) {
    morf_ipc_init();
    morf_engine_init();
    printf("MORF host  bytes=%u  crc=0x%08x  nodes=%u intents=%u\n",
           morf_image_bytes(), morf_image_crc(), morf_node_count, morf_intent_count);

    if (argc > 1 && strcmp(argv[1], "--eval") == 0) return run_eval();

    if (argc > 1) {
        char buf[512];
        buf[0] = 0;
        for (int i = 1; i < argc; i++) {
            if (i > 1) strcat(buf, " ");
            strcat(buf, argv[i]);
        }
        morf_result_t r;
        morf_process_utterance(buf, &r);
        printf("intent=%s layer=%u conf=%d tool=%u amb=%u n=%d dur=%d prop=%u dir=%d\n",
               r.intent_name_buf[0] ? r.intent_name_buf : "-",
               r.layer, r.confidence, r.tool_id, r.ambiguous, r.number, r.duration_s,
               r.property, r.direction);
        printf("%s\n", r.response);
        printf("device vol=%d bright=%d lights=%u mute=%u timer=%d scene=%u\n",
               morf_device.volume, morf_device.brightness, morf_device.lights,
               morf_device.muted, (int)(morf_device.timer_ms / 1000), morf_device.scene);
        return r.intent_id ? 0 : 2;
    }

    char line[256];
    printf("Type utterances. Ctrl-D to exit.\n");
    while (fgets(line, sizeof(line), stdin)) {
        morf_result_t r;
        morf_process_utterance(line, &r);
        printf("  [%s L%u n=%d dur=%d] %s\n",
               r.intent_name_buf[0] ? r.intent_name_buf : "?",
               r.layer, r.number, r.duration_s, r.response);
    }
    return 0;
}
