#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include "AS3/AS3.h"
#include "../../c/pbkdf2.h"
#include "../../c/smix.h"


void AS_PBKDF2_OneIter() __attribute__((used,
    annotate("as3sig:public function C_PBKDF2_OneIter(passBuf:uint, passLen:uint, saltBuf:uint, saltLen:uint, dkBuf:uint, dkLen:uint) : void"),
    annotate("as3package:com.etherdream.scrypt")));
void AS_PBKDF2_OneIter() {
    const uint8_t *passBuf_;
    const uint8_t *saltBuf_;
    uint8_t *dkBuf_;

    size_t passLen_;
    size_t saltLen_;
    size_t dkLen_;

    AS3_GetScalarFromVar(passBuf_, passBuf);
    AS3_GetScalarFromVar(passLen_, passLen);
    AS3_GetScalarFromVar(saltBuf_, saltBuf);
    AS3_GetScalarFromVar(saltLen_, saltLen);
    AS3_GetScalarFromVar(dkBuf_, dkBuf);
    AS3_GetScalarFromVar(dkLen_, dkLen);

    PBKDF2_OneIter(
        passBuf_, passLen_,
        saltBuf_, saltLen_,
        dkBuf_, dkLen_
    );
}


void AS_SMix() __attribute__((used,
    annotate("as3sig:public function C_SMix(N:uint, r:uint, B:uint, XYV:uint, stage:uint, beg:uint, end:uint) : void"),
    annotate("as3package:com.etherdream.scrypt")));
void AS_SMix() {
    uint32_t N_, r_, B_, XYV_;
    uint32_t stage_, beg_, end_;

    AS3_GetScalarFromVar(N_, N);
    AS3_GetScalarFromVar(r_, r);
    AS3_GetScalarFromVar(B_, B);
    AS3_GetScalarFromVar(XYV_, XYV);
    AS3_GetScalarFromVar(stage_, stage);
    AS3_GetScalarFromVar(beg_, beg);
    AS3_GetScalarFromVar(end_, end);

    SMix(N_, r_, (void*) B_, (void*) XYV_, stage_, beg_, end_);
}


int main() {
    return 0;
}

