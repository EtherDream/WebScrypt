#include <stdint.h>
#include <string.h>
#include "sysendian.h"


static void
blkcpy(void * dest, const void * src, size_t len)
{
    size_t * D = (size_t *)  dest;
    const size_t * S = (const size_t *)  src;
    size_t L = len / sizeof(size_t);
    size_t i;

    for (i = 0; i < L; i++)
        D[i] = S[i];
}


static void
blkxor(void * dest, const void * src, size_t len)
{
    size_t * D = (size_t *)  dest;
    const size_t * S = (const size_t *)  src;
    size_t L = len / sizeof(size_t);
    size_t i;

    for (i = 0; i < L; i++)
        D[i] ^= S[i];
}


static void
blockmix_salsa8(const uint32_t * Bin, uint32_t * Bout, const uint32_t r)
{
    uint32_t T00, T01, T02, T03,
             T04, T05, T06, T07,
             T08, T09, T10, T11,
             T12, T13, T14, T15;

    // salsa20_8
    uint32_t x00, x01, x02, x03,
             x04, x05, x06, x07,
             x08, x09, x10, x11,
             x12, x13, x14, x15;

    #define R(a,b) (((a) << (b)) | ((a) >> (32 - (b))))

    #define ARX()                                           \
        x04 ^= R(x00+x12, 7);     x08 ^= R(x04+x00, 9);     \
        x12 ^= R(x08+x04,13);     x00 ^= R(x12+x08,18);     \
        x09 ^= R(x05+x01, 7);     x13 ^= R(x09+x05, 9);     \
        x01 ^= R(x13+x09,13);     x05 ^= R(x01+x13,18);     \
        x14 ^= R(x10+x06, 7);     x02 ^= R(x14+x10, 9);     \
        x06 ^= R(x02+x14,13);     x10 ^= R(x06+x02,18);     \
        x03 ^= R(x15+x11, 7);     x07 ^= R(x03+x15, 9);     \
        x11 ^= R(x07+x03,13);     x15 ^= R(x11+x07,18);     \
        x01 ^= R(x00+x03, 7);     x02 ^= R(x01+x00, 9);     \
        x03 ^= R(x02+x01,13);     x00 ^= R(x03+x02,18);     \
        x06 ^= R(x05+x04, 7);     x07 ^= R(x06+x05, 9);     \
        x04 ^= R(x07+x06,13);     x05 ^= R(x04+x07,18);     \
        x11 ^= R(x10+x09, 7);     x08 ^= R(x11+x10, 9);     \
        x09 ^= R(x08+x11,13);     x10 ^= R(x09+x08,18);     \
        x12 ^= R(x15+x14, 7);     x13 ^= R(x12+x15, 9);     \
        x14 ^= R(x13+x12,13);     x15 ^= R(x14+x13,18);     \

    #define SALAS20()                                       \
        x00  = T00;  x01  = T01;  x02  = T02;  x03  = T03;  \
        x04  = T04;  x05  = T05;  x06  = T06;  x07  = T07;  \
        x08  = T08;  x09  = T09;  x10  = T10;  x11  = T11;  \
        x12  = T12;  x13  = T13;  x14  = T14;  x15  = T15;  \
        ARX();       ARX();       ARX();       ARX();       \
        T00 += x00;  T01 += x01;  T02 += x02;  T03 += x03;  \
        T04 += x04;  T05 += x05;  T06 += x06;  T07 += x07;  \
        T08 += x08;  T09 += x09;  T10 += x10;  T11 += x11;  \
        T12 += x12;  T13 += x13;  T14 += x14;  T15 += x15;  \


    const uint32_t *ptr1;
    const uint32_t *ptr2;
    const uint32_t *ptr4;
    uint32_t *ptr3;
    uint32_t *ptr5;

    size_t i;

    /* 1: X <-- B_{2r - 1} */
    // blkcpy(X, &Bin[(2 * r - 1) * 16], 64);

    ptr1 = &Bin[(2 * r - 1) * 16];

    T00 = ptr1[ 0];  T01 = ptr1[ 1];
    T02 = ptr1[ 2];  T03 = ptr1[ 3];
    T04 = ptr1[ 4];  T05 = ptr1[ 5];
    T06 = ptr1[ 6];  T07 = ptr1[ 7];
    T08 = ptr1[ 8];  T09 = ptr1[ 9];
    T10 = ptr1[10];  T11 = ptr1[11];
    T12 = ptr1[12];  T13 = ptr1[13];
    T14 = ptr1[14];  T15 = ptr1[15];


    /* 2: for i = 0 to 2r - 1 do */
    for (i = 0; i < 2 * r; i += 2) {
        /* 3: X <-- H(X \xor B_i) */
        // blkxor(X, &Bin[i * 16], 64);

        ptr2 = &Bin[i * 16];

        T00 ^= ptr2[ 0];  T01 ^= ptr2[ 1];
        T02 ^= ptr2[ 2];  T03 ^= ptr2[ 3];
        T04 ^= ptr2[ 4];  T05 ^= ptr2[ 5];
        T06 ^= ptr2[ 6];  T07 ^= ptr2[ 7];
        T08 ^= ptr2[ 8];  T09 ^= ptr2[ 9];
        T10 ^= ptr2[10];  T11 ^= ptr2[11];
        T12 ^= ptr2[12];  T13 ^= ptr2[13];
        T14 ^= ptr2[14];  T15 ^= ptr2[15];

        // salsa20_8(X);
        SALAS20()

        /* 4: Y_i <-- X */
        /* 6: B' <-- (Y_0, Y_2 ... Y_{2r-2}, Y_1, Y_3 ... Y_{2r-1}) */
        // blkcpy(&Bout[i * 8], X, 64);

        ptr3 = &Bout[i * 8];

        ptr3[ 0] = T00;  ptr3[ 1] = T01;
        ptr3[ 2] = T02;  ptr3[ 3] = T03;
        ptr3[ 4] = T04;  ptr3[ 5] = T05;
        ptr3[ 6] = T06;  ptr3[ 7] = T07;
        ptr3[ 8] = T08;  ptr3[ 9] = T09;
        ptr3[10] = T10;  ptr3[11] = T11;
        ptr3[12] = T12;  ptr3[13] = T13;
        ptr3[14] = T14;  ptr3[15] = T15;


        /* 3: X <-- H(X \xor B_i) */
        // blkxor(X, &Bin[i * 16 + 16], 64);

        ptr4 = &Bin[i * 16 + 16];

        T00 ^= ptr4[ 0];  T01 ^= ptr4[ 1];
        T02 ^= ptr4[ 2];  T03 ^= ptr4[ 3];
        T04 ^= ptr4[ 4];  T05 ^= ptr4[ 5];
        T06 ^= ptr4[ 6];  T07 ^= ptr4[ 7];
        T08 ^= ptr4[ 8];  T09 ^= ptr4[ 9];
        T10 ^= ptr4[10];  T11 ^= ptr4[11];
        T12 ^= ptr4[12];  T13 ^= ptr4[13];
        T14 ^= ptr4[14];  T15 ^= ptr4[15];

        // salsa20_8(X);
        SALAS20()

        /* 4: Y_i <-- X */
        /* 6: B' <-- (Y_0, Y_2 ... Y_{2r-2}, Y_1, Y_3 ... Y_{2r-1}) */
        // blkcpy(&Bout[i * 8 + r * 16], X, 64);
        ptr5 = &Bout[i * 8 + r * 16];

        ptr5[ 0] = T00;  ptr5[ 1] = T01;
        ptr5[ 2] = T02;  ptr5[ 3] = T03;
        ptr5[ 4] = T04;  ptr5[ 5] = T05;
        ptr5[ 6] = T06;  ptr5[ 7] = T07;
        ptr5[ 8] = T08;  ptr5[ 9] = T09;
        ptr5[10] = T10;  ptr5[11] = T11;
        ptr5[12] = T12;  ptr5[13] = T13;
        ptr5[14] = T14;  ptr5[15] = T15;
    }

    #undef R
}


/**
 * integerify(B, r):
 * Return the result of parsing B_{2r-1} as a little-endian integer.
 */
// static uint64_t
static uint32_t
integerify(const void *B, const uint32_t r)
{
    const uint32_t *T = (const void *) (B + (2 * r - 1) * 64);

    // return (((uint64_t)(T[1]) << 32) + T[0]);
    return T[0];
}


// void
// SMix(const uint32_t N, const uint32_t r, uint8_t *B, uint8_t *XYV)
// {
//     const size_t BLOCK_SIZE = r * 128;

//     uint32_t *X = (uint32_t *) (XYV + BLOCK_SIZE * 0);
//     uint32_t *Y = (uint32_t *) (XYV + BLOCK_SIZE * 1);
//     uint32_t *V = (uint32_t *) (XYV + BLOCK_SIZE * 2);

//     size_t i, j, k;


//     /* 1: X <-- B */
//     for (k = 0; k < 32 * r; k++)
//         X[k] = le32dec(&B[4 * k]);

//     /* 2: for i = 0 to N - 1 do */
//     for (i = 0; i < N; i += 2) {
//         /* 3: V_i <-- X */
//         blkcpy(&V[i * (32 * r)], X, BLOCK_SIZE);

//         /* 4: X <-- H(X) */
//         blockmix_salsa8(X, Y, r);

//         /* 3: V_i <-- X */
//         blkcpy(&V[(i + 1) * (32 * r)], Y, BLOCK_SIZE);

//         /* 4: X <-- H(X) */
//         blockmix_salsa8(Y, X, r);
//     }

//     /* 6: for i = 0 to N - 1 do */
//     for (i = 0; i < N; i += 2) {
//         /* 7: j <-- Integerify(X) mod N */
//         j = integerify(X, r) & (N - 1);

//         /* 8: X <-- H(X \xor V_j) */
//         blkxor(X, &V[j * (32 * r)], BLOCK_SIZE);
//         blockmix_salsa8(X, Y, r);

//         /* 7: j <-- Integerify(X) mod N */
//         j = integerify(Y, r) & (N - 1);

//         /* 8: X <-- H(X \xor V_j) */
//         blkxor(Y, &V[j * (32 * r)], BLOCK_SIZE);
//         blockmix_salsa8(Y, X, r);
//     }

//     /* 10: B' <-- X */
//     for (k = 0; k < 32 * r; k++)
//         le32enc(&B[4 * k], X[k]);
// }



void SMix(
    const uint32_t N, const uint32_t r, uint8_t *B, uint8_t *XYV,
    const uint32_t stage, const uint32_t beg, const uint32_t end
) {
    const uint32_t BLOCK_SIZE = r * 128;
    const uint32_t R32 = r * 32;

    uint32_t *X = (uint32_t *) (XYV + BLOCK_SIZE * 0);
    uint32_t *Y = (uint32_t *) (XYV + BLOCK_SIZE * 1);
    uint32_t *V = (uint32_t *) (XYV + BLOCK_SIZE * 2);

    size_t i, j, k;


    if (stage == 0) {
        if (beg == 0) {
            /* 1: X <-- B */
            for (k = 0; k < R32; k++) {
                X[k] = le32dec(&B[4 * k]);
            }
        }
    
        /* 2: for i = 0 to N - 1 do */
        // for (i = beg; i < end; i += 2) {
        i = beg * R32;
        size_t e = end * R32;

        while (i < e) {
            /* 3: V_i <-- X */
            // blkcpy(&V[i * R32], X, BLOCK_SIZE);
            blkcpy(&V[i], X, BLOCK_SIZE);
            i += R32;

            /* 4: X <-- H(X) */
            blockmix_salsa8(X, Y, r);

            /* 3: V_i <-- X */
            blkcpy(&V[i], Y, BLOCK_SIZE);
            i += R32;

            /* 4: X <-- H(X) */
            blockmix_salsa8(Y, X, r);
        }
    } else {
        /* 6: for i = 0 to N - 1 do */
        for (i = beg; i < end; i += 2) {
            /* 7: j <-- Integerify(X) mod N */
            j = integerify(X, r) & (N - 1);

            /* 8: X <-- H(X \xor V_j) */
            blkxor(X, &V[j * R32], BLOCK_SIZE);
            blockmix_salsa8(X, Y, r);

            /* 7: j <-- Integerify(X) mod N */
            j = integerify(Y, r) & (N - 1);

            /* 8: X <-- H(X \xor V_j) */
            blkxor(Y, &V[j * R32], BLOCK_SIZE);
            blockmix_salsa8(Y, X, r);
        }

        if (end == N) {
            /* 10: B' <-- X */
            for (k = 0; k < R32; k++) {
                le32enc(&B[4 * k], X[k]);
            }
        }
    }
}