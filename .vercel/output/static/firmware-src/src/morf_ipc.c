#include "morf_ipc.h"
#include <string.h>

#if defined(__GNUC__)
#define MORF_BARRIER() __sync_synchronize()
#else
#define MORF_BARRIER() do { } while (0)
#endif

typedef struct {
    volatile uint32_t w;
    volatile uint32_t r;
    morf_ipc_msg_t    q[MORF_IPC_CAP];
} morf_ipc_ring_t;

static morf_ipc_ring_t g_ring;

void morf_ipc_init(void) {
    memset(&g_ring, 0, sizeof(g_ring));
}

int morf_ipc_push(const morf_ipc_msg_t* m) {
    if (!m) return -1;
    uint32_t w = g_ring.w;
    uint32_t n = (w + 1u) % MORF_IPC_CAP;
    if (n == g_ring.r) return -1;
    g_ring.q[w] = *m;
    MORF_BARRIER();
    g_ring.w = n;
    return 0;
}

int morf_ipc_pop(morf_ipc_msg_t* m) {
    if (!m) return -1;
    uint32_t r = g_ring.r;
    if (r == g_ring.w) return -1;
    *m = g_ring.q[r];
    MORF_BARRIER();
    g_ring.r = (r + 1u) % MORF_IPC_CAP;
    return 0;
}

int morf_ipc_push_text(uint8_t type, const char* text, int16_t score, uint8_t slot) {
    morf_ipc_msg_t m;
    memset(&m, 0, sizeof(m));
    m.type = type;
    m.score = score;
    m.slot = slot;
    if (text) {
        size_t n = 0;
        while (text[n] && n + 1 < sizeof(m.text)) {
            m.text[n] = text[n];
            n++;
        }
        m.text[n] = 0;
    }
    return morf_ipc_push(&m);
}
