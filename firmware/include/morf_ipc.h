#ifndef MORF_IPC_H
#define MORF_IPC_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define MORF_IPC_CAP     16
#define MORF_IPC_TEXT    1
#define MORF_IPC_VOICE   2
#define MORF_IPC_TEACH   3

typedef struct {
    uint8_t type;
    uint8_t slot;
    int16_t score;
    char    text[160];
} morf_ipc_msg_t;

void morf_ipc_init(void);
int  morf_ipc_push(const morf_ipc_msg_t* m); /* 0 ok, -1 full — Core 0 producer */
int  morf_ipc_pop(morf_ipc_msg_t* m);        /* 0 ok, -1 empty — Core 1 consumer */
int  morf_ipc_push_text(uint8_t type, const char* text, int16_t score, uint8_t slot);

#ifdef __cplusplus
}
#endif

#endif
