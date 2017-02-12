
function asm_pbkdf2() {
	'use strict';

	var asm = function(global, env, buffer) {
		'use asm';

		var
HEAP32 = new global.Int32Array(buffer),
HEAP8 = new global.Int8Array(buffer),
HEAPU8 = new global.Uint8Array(buffer);

function _PBKDF2_OneIter($0, $1, $2, $3, $4, $5) {
 $0 = $0 | 0;
 $1 = $1 | 0;
 $2 = $2 | 0;
 $3 = $3 | 0;
 $4 = $4 | 0;
 $5 = $5 | 0;
 var $$01$i = 0, $$025$i$i = 0, $$026$i$i = 0, $$pr$i$i = 0, $16 = 0, $29 = 0, $43 = 0, $44 = 0, dest = 0, src = 0, stop = 0;
 if ($1 >>> 0 > 64) {
  HEAP32[191] = 0;
  HEAP32[183] = 1779033703;
  HEAP32[184] = -1150833019;
  HEAP32[185] = 1013904242;
  HEAP32[186] = -1521486534;
  HEAP32[187] = 1359893119;
  HEAP32[188] = -1694144372;
  HEAP32[189] = 528734635;
  HEAP32[190] = 1541459225;
  _SHA256_Update(732, $0, $1);
  _SHA256_Final(1816, 732);
  $$025$i$i = 1816;
  $$026$i$i = 32;
 } else {
  $$025$i$i = $0;
  $$026$i$i = $1;
 }
 HEAP32[191] = 0;
 HEAP32[183] = 1779033703;
 HEAP32[184] = -1150833019;
 HEAP32[185] = 1013904242;
 HEAP32[186] = -1521486534;
 HEAP32[187] = 1359893119;
 HEAP32[188] = -1694144372;
 HEAP32[189] = 528734635;
 HEAP32[190] = 1541459225;
 dest = 1752;
 stop = dest + 64 | 0;
 do {
  HEAP8[dest >> 0] = 54;
  dest = dest + 1 | 0;
 } while ((dest | 0) < (stop | 0));
 if (!$$026$i$i) $$pr$i$i = 1; else {
  HEAP8[1752] = HEAP8[$$025$i$i >> 0] ^ 54;
  if (($$026$i$i | 0) == 1) $$pr$i$i = 0; else {
   HEAP8[1753] = HEAP8[$$025$i$i + 1 >> 0] ^ 54;
   if (($$026$i$i | 0) == 2) $$pr$i$i = 0; else {
    HEAP8[1754] = HEAP8[$$025$i$i + 2 >> 0] ^ 54;
    if (($$026$i$i | 0) == 3) $$pr$i$i = 0; else {
     $16 = 3;
     do {
      HEAP8[1752 + $16 >> 0] = HEAP8[$$025$i$i + $16 >> 0] ^ HEAP8[1752 + $16 >> 0];
      $16 = $16 + 1 | 0;
     } while (($16 | 0) != ($$026$i$i | 0));
     $$pr$i$i = 0;
    }
   }
  }
 }
 _SHA256_Update(732, 1752, 64);
 HEAP32[216] = 0;
 HEAP32[208] = 1779033703;
 HEAP32[209] = -1150833019;
 HEAP32[210] = 1013904242;
 HEAP32[211] = -1521486534;
 HEAP32[212] = 1359893119;
 HEAP32[213] = -1694144372;
 HEAP32[214] = 528734635;
 HEAP32[215] = 1541459225;
 dest = 1752;
 stop = dest + 64 | 0;
 do {
  HEAP8[dest >> 0] = 92;
  dest = dest + 1 | 0;
 } while ((dest | 0) < (stop | 0));
 if (!$$pr$i$i) {
  HEAP8[1752] = HEAP8[$$025$i$i >> 0] ^ 92;
  if (($$026$i$i | 0) != 1) {
   HEAP8[1753] = HEAP8[$$025$i$i + 1 >> 0] ^ 92;
   if (($$026$i$i | 0) != 2) {
    HEAP8[1754] = HEAP8[$$025$i$i + 2 >> 0] ^ 92;
    if (($$026$i$i | 0) != 3) {
     $29 = 3;
     do {
      HEAP8[1752 + $29 >> 0] = HEAP8[$$025$i$i + $29 >> 0] ^ HEAP8[1752 + $29 >> 0];
      $29 = $29 + 1 | 0;
     } while (($29 | 0) != ($$026$i$i | 0));
    }
   }
  }
 }
 _SHA256_Update(832, 1752, 64);
 _SHA256_Update(732, $2, $3);
 if ($5 | 0) {
  $$01$i = 0;
  $44 = 0;
  do {
   $$01$i = $$01$i + 1 | 0;
   HEAP8[1687] = $$01$i;
   HEAP8[1686] = $$01$i >>> 8;
   HEAP8[1685] = $$01$i >>> 16;
   HEAP8[1684] = $$01$i >>> 24;
   _memcpy(932, 732, 200) | 0;
   _SHA256_Update(932, 1684, 4);
   _SHA256_Final(1848, 932);
   _SHA256_Update(1032, 1848, 32);
   _SHA256_Final(1688, 1032);
   dest = 1720;
   src = 1688;
   stop = dest + 32 | 0;
   do {
    HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
    dest = dest + 1 | 0;
    src = src + 1 | 0;
   } while ((dest | 0) < (stop | 0));
   $43 = $5 - $44 | 0;
   _memcpy($4 + $44 | 0, 1720, ($43 >>> 0 > 32 ? 32 : $43) | 0) | 0;
   $44 = $$01$i << 5;
  } while ($44 >>> 0 < $5 >>> 0);
 }
 return;
}
function _SHA256_Update($0, $1, $2) {
 $0 = $0 | 0;
 $1 = $1 | 0;
 $2 = $2 | 0;
 var $$0$lcssa = 0, $$027$lcssa = 0, $$02728 = 0, $$029 = 0, $10 = 0, $12 = 0, $13 = 0, $14 = 0, $15 = 0, $18 = 0, $19 = 0, $21 = 0, $4 = 0, $5 = 0, $7 = 0;
 do if ($2 | 0) {
  $4 = $0 + 32 | 0;
  $5 = HEAP32[$4 >> 2] | 0;
  $7 = $5 >>> 3 & 63;
  HEAP32[$4 >> 2] = $5 + ($2 << 3);
  $10 = 64 - $7 | 0;
  $12 = $0 + 36 + $7 | 0;
  if ($10 >>> 0 > $2 >>> 0) {
   _memcpy($12 | 0, $1 | 0, $2 | 0) | 0;
   break;
  }
  _memcpy($12 | 0, $1 | 0, $10 | 0) | 0;
  $13 = $0 + 36 | 0;
  _SHA256_Transform($0, $13);
  $14 = $1 + $10 | 0;
  $15 = $2 - $10 | 0;
  if ($15 >>> 0 > 63) {
   $18 = $7 + $2 + -128 | 0;
   $19 = $18 & -64;
   $21 = $19 + 128 - $7 | 0;
   $$02728 = $15;
   $$029 = $14;
   while (1) {
    _SHA256_Transform($0, $$029);
    $$02728 = $$02728 + -64 | 0;
    if ($$02728 >>> 0 <= 63) break; else $$029 = $$029 + 64 | 0;
   }
   $$0$lcssa = $1 + $21 | 0;
   $$027$lcssa = $18 - $19 | 0;
  } else {
   $$0$lcssa = $14;
   $$027$lcssa = $15;
  }
  _memcpy($13 | 0, $$0$lcssa | 0, $$027$lcssa | 0) | 0;
 } while (0);
 return;
}
function _memcpy(dest, src, num) {
 dest = dest | 0;
 src = src | 0;
 num = num | 0;
 var ret = 0;

 ret = dest | 0;
 if ((dest & 3) == (src & 3)) {
  while (dest & 3) {
   if (!num) return ret | 0;
   HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
   dest = dest + 1 | 0;
   src = src + 1 | 0;
   num = num - 1 | 0;
  }
  while ((num | 0) >= 4) {
   HEAP32[dest >> 2] = HEAP32[src >> 2];
   dest = dest + 4 | 0;
   src = src + 4 | 0;
   num = num - 4 | 0;
  }
 }
 while ((num | 0) > 0) {
  HEAP8[dest >> 0] = HEAP8[src >> 0] | 0;
  dest = dest + 1 | 0;
  src = src + 1 | 0;
  num = num - 1 | 0;
 }
 return ret | 0;
}
function _SHA256_Transform($0, $1) {
 $0 = $0 | 0;
 $1 = $1 | 0;
 var $$01$i = 0, $$059 = 0, $$158 = 0, $$257 = 0, $112 = 0, $116 = 0, $123 = 0, $131 = 0, $25 = 0, $3 = 0, $51 = 0, $58 = 0, $63 = 0, $82 = 0, $93 = 0, $97 = 0, $51$looptemp = 0;
 $$01$i = 0;
 do {
  $3 = $1 + ($$01$i << 2) | 0;
  HEAP32[444 + ($$01$i << 2) >> 2] = (HEAPU8[$3 + 2 >> 0] | 0) << 8 | (HEAPU8[$3 + 3 >> 0] | 0) | (HEAPU8[$3 + 1 >> 0] | 0) << 16 | (HEAPU8[$3 >> 0] | 0) << 24;
  $$01$i = $$01$i + 1 | 0;
 } while (($$01$i | 0) != 16);
 $$059 = 16;
 $51 = HEAP32[111] | 0;
 do {
  $25 = HEAP32[444 + ($$059 + -2 << 2) >> 2] | 0;
  $51$looptemp = $51;
  $51 = HEAP32[444 + ($$059 + -15 << 2) >> 2] | 0;
  HEAP32[444 + ($$059 << 2) >> 2] = $51$looptemp + (HEAP32[444 + ($$059 + -7 << 2) >> 2] | 0) + (($25 >>> 19 | $25 << 13) ^ $25 >>> 10 ^ ($25 >>> 17 | $25 << 15)) + (($51 >>> 18 | $51 << 14) ^ $51 >>> 3 ^ ($51 >>> 7 | $51 << 25));
  $$059 = $$059 + 1 | 0;
 } while (($$059 | 0) != 64);
 HEAP32[175] = HEAP32[$0 >> 2];
 HEAP32[176] = HEAP32[$0 + 4 >> 2];
 HEAP32[177] = HEAP32[$0 + 8 >> 2];
 HEAP32[178] = HEAP32[$0 + 12 >> 2];
 HEAP32[179] = HEAP32[$0 + 16 >> 2];
 HEAP32[180] = HEAP32[$0 + 20 >> 2];
 HEAP32[181] = HEAP32[$0 + 24 >> 2];
 HEAP32[182] = HEAP32[$0 + 28 >> 2];
 $$158 = 0;
 do {
  $58 = 700 + (((71 - $$158 | 0) % 8 | 0) << 2) | 0;
  $63 = HEAP32[700 + (((68 - $$158 | 0) % 8 | 0) << 2) >> 2] | 0;
  $82 = HEAP32[700 + (((70 - $$158 | 0) % 8 | 0) << 2) >> 2] | 0;
  $93 = (HEAP32[444 + ($$158 << 2) >> 2] | 0) + (HEAP32[$58 >> 2] | 0) + (($63 >>> 6 | $63 << 26) ^ ($63 >>> 11 | $63 << 21) ^ ($63 >>> 25 | $63 << 7)) + (HEAP32[8 + ($$158 << 2) >> 2] | 0) + (($82 ^ HEAP32[700 + (((69 - $$158 | 0) % 8 | 0) << 2) >> 2]) & $63 ^ $82) | 0;
  $97 = HEAP32[700 + (((64 - $$158 | 0) % 8 | 0) << 2) >> 2] | 0;
  $112 = HEAP32[700 + (((65 - $$158 | 0) % 8 | 0) << 2) >> 2] | 0;
  $116 = HEAP32[700 + (((66 - $$158 | 0) % 8 | 0) << 2) >> 2] | 0;
  $123 = 700 + (((67 - $$158 | 0) % 8 | 0) << 2) | 0;
  HEAP32[$123 >> 2] = (HEAP32[$123 >> 2] | 0) + $93;
  HEAP32[$58 >> 2] = (($97 >>> 2 | $97 << 30) ^ ($97 >>> 13 | $97 << 19) ^ ($97 >>> 22 | $97 << 10)) + $93 + (($116 | $112) & $97 | $116 & $112);
  $$158 = $$158 + 1 | 0;
 } while (($$158 | 0) != 64);
 $$257 = 0;
 do {
  $131 = $0 + ($$257 << 2) | 0;
  HEAP32[$131 >> 2] = (HEAP32[$131 >> 2] | 0) + (HEAP32[700 + ($$257 << 2) >> 2] | 0);
  $$257 = $$257 + 1 | 0;
 } while (($$257 | 0) != 8);
 return;
}
function _SHA256_Final($0, $1) {
 $0 = $0 | 0;
 $1 = $1 | 0;
 var $$01$i = 0, $12 = 0, $16 = 0, $18 = 0, $3 = 0;
 $3 = HEAP32[$1 + 32 >> 2] | 0;
 HEAP8[1139] = $3;
 HEAP8[1138] = $3 >>> 8;
 HEAP8[1137] = $3 >>> 16;
 HEAP8[1136] = $3 >>> 24;
 $12 = $3 >>> 3 & 63;
 HEAP32[283] = 0;
 _SHA256_Update($1, 380, ($12 >>> 0 < 56 ? 56 : 120) - $12 | 0);
 _SHA256_Update($1, 1132, 8);
 $$01$i = 0;
 do {
  $16 = $0 + ($$01$i << 2) | 0;
  $18 = HEAP32[$1 + ($$01$i << 2) >> 2] | 0;
  HEAP8[$16 + 3 >> 0] = $18;
  HEAP8[$16 + 2 >> 0] = $18 >>> 8;
  HEAP8[$16 + 1 >> 0] = $18 >>> 16;
  HEAP8[$16 >> 0] = $18 >>> 24;
  $$01$i = $$01$i + 1 | 0;
 } while (($$01$i | 0) != 8);
 return;
}

		return {
_PBKDF2_OneIter: _PBKDF2_OneIter
		};
	}

	
	function create(buffer) {
		var arr = new Uint8Array(buffer);
		var bin = atob('mC+KQpFEN3HP+8C1pdu16VvCVjnxEfFZpII/ktVeHKuYqgfYAVuDEr6FMSTDfQxVdF2+cv6x3oCnBtybdPGbwcFpm+SGR77vxp3BD8yhDCRvLOktqoR0StypsFzaiPl2UlE+mG3GMajIJwOwx39Zv/ML4MZHkafVUWPKBmcpKRSFCrcnOCEbLvxtLE0TDThTVHMKZbsKanYuycKBhSxykqHov6JLZhqocItLwqNRbMcZ6JLRJAaZ1oU1DvRwoGoQFsGkGQhsNx5Md0gntbywNLMMHDlKqthOT8qcW/NvLmjugo90b2OleBR4yIQIAseM+v++kOtsUKT3o/m+8nhxxgUAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAACAAAAYAcAAAAEAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAr/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAQAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==');
		var base = 8;

		for (var i = 0; i < bin.length; i++) {
			arr[base + i] = bin.charCodeAt(i);
		}

		return asm(self, {}, buffer);
	}


	function getHeap() {
		return 8636;
	}

	return {
		create: create,
		getHeap: getHeap
	};
};
