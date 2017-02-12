EMCC_OUT = ./c-bind/emout

PBKDF2_FN = '["_PBKDF2_OneIter"]'
SMIX_FN = '["_SMix"]'


JS = asmjs.js
MAP = ${JS}.map


release/${JS}: debug/${JS}
	mkdir -p release

	uglifyjs \
		"$<" \
		--output release/${JS} \
		--define _RELEASE=1 \
		--enclose \
		--mangle \
		--compress drop_console \
		--in-source-map debug/${MAP} \
		--source-map release/${MAP} \
		--source-map-include-sources \
		--source-map-url ../sourcemap/${MAP}


	cp release/${JS}  ../../release/asset/${JS}
	cp release/${MAP}  ../../release/sourcemap/${MAP}

#
# TypeScript Project
#
debug/${JS}: lib/pbkdf2.js lib/smix.js
	tsc --project .


# used in WorkerMain.ts
$(EMCC_OUT)/pbkdf2.js: ../c/pbkdf2.c
	mkdir -p $(EMCC_OUT)

	emcc \
		"$<" \
		-o "$@" \
		-g -Os \
		-DV_ASMJS \
		-s EXPORTED_FUNCTIONS=$(PBKDF2_FN) \
		--memory-init-file 0


lib/pbkdf2.js: $(EMCC_OUT)/pbkdf2.js
	mkdir -p lib

	node c-bind/reduce \
		asm_pbkdf2 "$<" "$@" $(PBKDF2_FN) 1


# used in WorkerChild.ts
$(EMCC_OUT)/smix.js: ../c/smix.c
	mkdir -p $(EMCC_OUT)

	emcc \
		"$<" \
		-o "$@" \
		-DV_ASMJS \
		-g -O3 \
		-s EXPORTED_FUNCTIONS=$(SMIX_FN) \
		--memory-init-file 0


lib/smix.js: $(EMCC_OUT)/smix.js
	mkdir -p lib

	node c-bind/reduce \
		asm_smix "$<" "$@" $(SMIX_FN)



.PHONY: release
release: release/${JS}

.PHONY: debug
debug: debug/${JS}

.PHONY: lib
lib: lib/pbkdf2.js lib/smix.js

.PHONY: clean
clean:
	rm -rf $(EMCC_OUT)
	rm -rf ./lib
	rm -rf ./debug
	rm -rf ./release
