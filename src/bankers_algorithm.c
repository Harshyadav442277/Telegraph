/*
 * Operating Systems Lab - Assessment 4
 * Banker's Algorithm simulator for 5 processes and 4 resource types.
 *
 * Exercise 1: fixed request sequence.
 * Exercise 2: dynamic input for process/resource counts and one request.
 * Exercise 3: challenging fixed request sequence.
 */

#include <stdbool.h>
#include <stdio.h>
#include <string.h>

#define MAX_PROCESSES 10
#define MAX_RESOURCES 10

typedef struct {
    int processes;
    int resources;
    int allocation[MAX_PROCESSES][MAX_RESOURCES];
    int maximum[MAX_PROCESSES][MAX_RESOURCES];
    int available[MAX_RESOURCES];
} SystemState;

static void calculate_need(const SystemState *state,
                           int need[MAX_PROCESSES][MAX_RESOURCES]) {
    for (int i = 0; i < state->processes; ++i) {
        for (int j = 0; j < state->resources; ++j) {
            need[i][j] = state->maximum[i][j] - state->allocation[i][j];
        }
    }
}

static void print_vector(const int vector[], int length) {
    putchar('(');
    for (int i = 0; i < length; ++i) {
        printf("%d%s", vector[i], i + 1 == length ? "" : ",");
    }
    puts(")");
}

static void print_matrix(const char *title,
                         int matrix[MAX_PROCESSES][MAX_RESOURCES],
                         int processes, int resources) {
    printf("%s\n", title);
    for (int i = 0; i < processes; ++i) {
        printf("P%d: ", i);
        print_vector(matrix[i], resources);
    }
}

static void print_need(const SystemState *state) {
    int need[MAX_PROCESSES][MAX_RESOURCES];
    calculate_need(state, need);
    print_matrix("Need matrix:", need, state->processes, state->resources);
}

static void print_safe_sequence(const int sequence[], int length) {
    printf("Safe Sequence: ");
    for (int i = 0; i < length; ++i) {
        printf("P%d%s", sequence[i], i + 1 == length ? "" : " -> ");
    }
    putchar('\n');
}

static bool is_safe(const SystemState *state, int safe_sequence[MAX_PROCESSES]) {
    int need[MAX_PROCESSES][MAX_RESOURCES];
    int work[MAX_RESOURCES];
    bool finished[MAX_PROCESSES] = {false};
    int completed = 0;

    calculate_need(state, need);
    memcpy(work, state->available, sizeof(work));

    while (completed < state->processes) {
        bool found = false;
        for (int i = 0; i < state->processes; ++i) {
            if (finished[i]) {
                continue;
            }

            bool can_finish = true;
            for (int j = 0; j < state->resources; ++j) {
                if (need[i][j] > work[j]) {
                    can_finish = false;
                    break;
                }
            }

            if (can_finish) {
                for (int j = 0; j < state->resources; ++j) {
                    work[j] += state->allocation[i][j];
                }
                finished[i] = true;
                safe_sequence[completed++] = i;
                found = true;
            }
        }

        if (!found) {
            return false;
        }
    }
    return true;
}

static bool request_resources(SystemState *state, int process,
                              const int request[MAX_RESOURCES]) {
    int need[MAX_PROCESSES][MAX_RESOURCES];
    int safe_sequence[MAX_PROCESSES];
    SystemState tentative;

    calculate_need(state, need);
    printf("Request from: P%d\nRequest:      ", process);
    print_vector(request, state->resources);

    for (int j = 0; j < state->resources; ++j) {
        if (request[j] > need[process][j]) {
            puts("Request <= Need:       NO");
            puts("Request <= Available:  NOT CHECKED");
            puts("Decision: REJECTED");
            puts("Reason: Request exceeds the process's remaining Need.");
            puts("Resources rolled back.");
            return false;
        }
    }
    puts("Request <= Need:       YES");

    for (int j = 0; j < state->resources; ++j) {
        if (request[j] > state->available[j]) {
            puts("Request <= Available:  NO");
            puts("Decision: REJECTED");
            puts("Reason: Requested resources are not currently Available.");
            puts("Resources rolled back.");
            return false;
        }
    }
    puts("Request <= Available:  YES");

    tentative = *state;
    for (int j = 0; j < state->resources; ++j) {
        tentative.available[j] -= request[j];
        tentative.allocation[process][j] += request[j];
    }

    if (!is_safe(&tentative, safe_sequence)) {
        puts("System after tentative allocation: UNSAFE");
        puts("Decision: REJECTED");
        puts("Reason: Request results in an UNSAFE state.");
        puts("Resources rolled back.");
        return false;
    }

    *state = tentative;
    puts("System after tentative allocation: SAFE");
    puts("Decision: GRANTED");
    print_safe_sequence(safe_sequence, state->processes);
    return true;
}

static void print_state(SystemState *state) {
    print_matrix("Allocation matrix:", state->allocation,
                 state->processes, state->resources);
    print_matrix("Maximum matrix:", state->maximum,
                 state->processes, state->resources);
    printf("Available: ");
    print_vector(state->available, state->resources);
}

static SystemState base_state(void) {
    SystemState state = {0};
    state.processes = 5;
    state.resources = 4;

    int allocation[5][MAX_RESOURCES] = {
        {1, 0, 1, 0},
        {1, 1, 0, 1},
        {1, 0, 2, 1},
        {0, 0, 1, 0},
        {0, 1, 0, 1},
    };
    int maximum[5][MAX_RESOURCES] = {
        {3, 2, 2, 1},
        {2, 2, 2, 2},
        {4, 1, 3, 2},
        {2, 2, 2, 1},
        {1, 2, 1, 2},
    };
    memcpy(state.allocation, allocation, sizeof(allocation));
    memcpy(state.maximum, maximum, sizeof(maximum));
    return state;
}

static void print_initial_safety(const SystemState *state) {
    int safe_sequence[MAX_PROCESSES];
    if (is_safe(state, safe_sequence)) {
        puts("Initial state: SAFE");
        print_safe_sequence(safe_sequence, state->processes);
    } else {
        puts("Initial state: UNSAFE");
    }
}

static void run_exercise1(void) {
    SystemState state = base_state();
    const int requests[6][4] = {
        {1, 0, 2, 0},
        {0, 1, 0, 1},
        {2, 0, 0, 0},
        {0, 1, 1, 1},
        {1, 0, 1, 0},
        {1, 0, 0, 0},
    };
    const int processes[6] = {1, 3, 0, 4, 2, 3};

    /* The question sheet omits Available for Exercise 1; this is the
       explicit working assumption used for the fixed demonstration. */
    const int available[4] = {3, 3, 2, 2};
    memcpy(state.available, available, sizeof(available));

    puts("EXERCISE 1 - FIXED REQUEST SEQUENCE");
    puts("Assumed initial Available: (3,3,2,2)");
    print_initial_safety(&state);
    for (int i = 0; i < 6; ++i) {
        putchar('\n');
        request_resources(&state, processes[i], requests[i]);
    }
}

static bool read_dynamic_state(SystemState *state) {
    printf("Enter number of processes (1-%d): ", MAX_PROCESSES);
    if (scanf("%d", &state->processes) != 1 ||
        state->processes < 1 || state->processes > MAX_PROCESSES) {
        return false;
    }
    printf("Enter number of resource types (1-%d): ", MAX_RESOURCES);
    if (scanf("%d", &state->resources) != 1 ||
        state->resources < 1 || state->resources > MAX_RESOURCES) {
        return false;
    }

    puts("Enter Allocation matrix:");
    for (int i = 0; i < state->processes; ++i) {
        for (int j = 0; j < state->resources; ++j) {
            if (scanf("%d", &state->allocation[i][j]) != 1) {
                return false;
            }
        }
    }
    puts("Enter Maximum matrix:");
    for (int i = 0; i < state->processes; ++i) {
        for (int j = 0; j < state->resources; ++j) {
            if (scanf("%d", &state->maximum[i][j]) != 1) {
                return false;
            }
        }
    }
    puts("Enter Available vector:");
    for (int j = 0; j < state->resources; ++j) {
        if (scanf("%d", &state->available[j]) != 1) {
            return false;
        }
    }
    return true;
}

static void run_exercise2(void) {
    SystemState state = {0};
    int process;
    int request[MAX_RESOURCES] = {0};

    puts("EXERCISE 2 - DYNAMIC INPUT");
    if (!read_dynamic_state(&state)) {
        puts("Invalid input.");
        return;
    }
    print_need(&state);
    print_initial_safety(&state);

    printf("Enter process number making the request (0-%d): ", state.processes - 1);
    if (scanf("%d", &process) != 1 || process < 0 || process >= state.processes) {
        puts("Invalid process number.");
        return;
    }
    printf("Enter request vector (%d values): ", state.resources);
    for (int j = 0; j < state.resources; ++j) {
        if (scanf("%d", &request[j]) != 1 || request[j] < 0) {
            puts("Invalid request.");
            return;
        }
    }
    request_resources(&state, process, request);
    puts("Updated state:");
    print_state(&state);
}

static void run_exercise3(void) {
    SystemState state = base_state();
    const int available[4] = {2, 1, 3, 2};
    const int requests[4][4] = {
        {1, 0, 1, 0},
        {0, 1, 0, 1},
        {1, 0, 1, 0},
        {0, 1, 1, 0},
    };
    const int processes[4] = {2, 0, 4, 1};

    memcpy(state.available, available, sizeof(available));
    puts("EXERCISE 3 - CHALLENGING RESOURCE REQUEST PROBLEM");
    puts("Initial Available: (2,1,3,2)");
    print_initial_safety(&state);
    for (int i = 0; i < 4; ++i) {
        putchar('\n');
        if (request_resources(&state, processes[i], requests[i])) {
            puts("Updated state after successful request:");
            printf("Available: ");
            print_vector(state.available, state.resources);
        }
    }
}

int main(int argc, char **argv) {
    int choice = 0;
    if (argc == 2) {
        choice = argv[1][0] - '0';
    } else {
        puts("BANKER'S ALGORITHM SIMULATOR");
        puts("1. Exercise 1 - fixed request sequence");
        puts("2. Exercise 2 - dynamic input");
        puts("3. Exercise 3 - challenging request problem");
        printf("Choose an exercise: ");
        if (scanf("%d", &choice) != 1) {
            return 1;
        }
    }

    switch (choice) {
        case 1:
            run_exercise1();
            break;
        case 2:
            run_exercise2();
            break;
        case 3:
            run_exercise3();
            break;
        default:
            puts("Choose 1, 2, or 3.");
            return 1;
    }
    return 0;
}
