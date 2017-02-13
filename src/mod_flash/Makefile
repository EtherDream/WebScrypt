FLASCC = ~/Crossbridge/sdk
FLEX = /Applications/Adobe Flash Builder 4.7/sdks/4.6.0


.PHONY: build
build: lib/scrypt.swc
	mkdir -p bin-release

	"$(FLEX)/bin/mxmlc" \
		src/Scrypt.as \
	 	-o bin-release/Scrypt.swf \
		-library-path=lib \
		-swf-version=18 \
		-debug=false \
		-optimize

	python ./c-bind/swf2lzma.py \
		bin-release/Scrypt.swf ../../release/asset/flash.swf


lib/scrypt.swc: c-bind/flascc.c ../c/pbkdf2.c ../c/smix.c
	$(FLASCC)/usr/bin/gcc \
		$^ \
		-o "$@" \
		-std=c99 -O4 \
		-flto-api=c-bind/exports.txt \
		-emit-swc=com.etherdream.scrypt


.PHONY: lib
lib: lib/scrypt.swc


.PHONY: pthread_test
pthread_test:
	$(FLASCC)/usr/bin/gcc \
		../c/scrypt.c ../c/pbkdf2.c ../c/smix.c \
		-flto-api=c-bind/pthread-exports.txt \
		-DTEST \
		-std=c99 -O4 \
	 	-pthread \
	 	-emit-swf -swf-version=18 \
	 	-o pthread_test.swf


.PHONY: clean
clean:
	rm -rf bin-debug
	rm -rf bin-release
	rm lib/scrypt.swc
