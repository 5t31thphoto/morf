#ifndef MORF_CONFIG_H
#define MORF_CONFIG_H

#define MORF_MAGIC                   0x46524F4Du
#define MORF_VERSION                 0x0200
#define MORF_VOCAB_SIZE              4096
#define MORF_MAX_ACTIVE_SLOTS        16
#define MORF_MAX_HIST_INTENTS        4
#define MORF_MAX_GRAPH_NODES         512
#define MORF_MAX_EDGES_PER_NODE      8
#define MORF_MAX_TOKENS              24
#define MORF_MAX_RESPONSE            160
#define MORF_HEADER_SIZE             64

#define MORF_DECAY_GAMMA             0x7E00
#define MORF_HEBBIAN_ETA             0x0100

#define INTENT_CONFIDENCE_THRESHOLD  0x1400
#define AMBIGUITY_MARGIN_LIMIT       0x0CC6

#define MORF_CORE_IO                 0
#define MORF_CORE_ENGINE             1
#define IPC_QUEUE_SIZE               32

#define MORF_TOKEN_NUMBER            0xFFFE
#define MORF_TOKEN_DURATION          0xFFFD
#define MORF_TOKEN_UNKNOWN           0xFFFF

#define FLAG_STOPWORD                0x01
#define FLAG_PIVOT                   0x02
#define FLAG_NUMBER                  0x04
#define FLAG_UNIT                    0x08

#define KIND_CONCEPT                 0
#define KIND_PROPERTY                1
#define KIND_ACTION                  2
#define KIND_DIRECTION               3
#define KIND_INTENT                  4
#define KIND_SCENE                   5
#define KIND_TOOL                    6

#define SLOT_NUMBER                  (1u << 0)
#define SLOT_DIRECTION               (1u << 1)
#define SLOT_PROPERTY                (1u << 2)
#define SLOT_TARGET                  (1u << 3)
#define SLOT_DURATION                (1u << 4)
#define SLOT_LEVEL                   (1u << 5)

#define TOOL_NONE                    0
#define TOOL_SET_VOLUME              1
#define TOOL_ADJ_VOLUME              2
#define TOOL_SET_BRIGHT              3
#define TOOL_ADJ_BRIGHT              4
#define TOOL_LIGHTS                  5
#define TOOL_PLAYPAUSE               6
#define TOOL_TIMER_SET               7
#define TOOL_TIMER_CANCEL            8
#define TOOL_QUERY                   9
#define TOOL_MUTE                    10
#define TOOL_NIGHT                   11
#define TOOL_SPEAK                   12
#define TOOL_TEACH                   13

#define SCENE_IDLE                   0
#define SCENE_TASK                   1
#define SCENE_FRUSTRATED             2
#define SCENE_PLAYFUL                3
#define SCENE_LOW_ENERGY             4
#define SCENE_CONFIRMING             5
#define SCENE_CLARIFYING             6
#define SCENE_NIGHT                  7
#define SCENE_COUNT                  8

#define PROP_NONE                    0
#define PROP_VOLUME                  1
#define PROP_BRIGHT                  2
#define PROP_LIGHTS                  3
#define PROP_TIMER                   4
#define PROP_MUSIC                   5

#endif
