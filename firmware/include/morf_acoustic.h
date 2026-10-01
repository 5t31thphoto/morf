#ifndef MORF_ACOUSTIC_H
#define MORF_ACOUSTIC_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    uint32_t rms;
    uint8_t  vad;
    uint8_t  speaking;
    uint16_t utterance_ms;
    uint8_t  taught_templates;
    int16_t  last_match_score; /* 0-100, -1 none */
    uint8_t  last_match_slot;
    char     last_phrase[96];
} morf_acoustic_status_t;

void morf_acoustic_init(void);
void morf_acoustic_start_task(void); /* Core 0 I2S DMA + VAD → IPC */
void morf_acoustic_tick(void);       /* 20 ms frame; used by the task */
bool morf_acoustic_take_endpoint(void);
void morf_acoustic_begin_teach(uint8_t slot);           /* 0xFF = first free */
void morf_acoustic_bind_next(const char* phrase);       /* phrase fired on next match/teach */
const morf_acoustic_status_t* morf_acoustic_status(void);

#ifdef __cplusplus
}
#endif

#endif
