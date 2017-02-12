
JS = scrypt.js
MAP = ${JS}.map

.PHONY: build
build: debug/${JS}
	mkdir -p release

	uglifyjs \
		"$<" \
		--output "release/${JS}" \
		--define _RELEASE=1 \
		--enclose \
		--support-ie8 \
		--mangle \
		--compress drop_console \
		--in-source-map "debug/${MAP}" \
		--source-map "release/${MAP}" \
		--source-map-include-sources \
		--source-map-url "sourcemap/${MAP}"

	cp "release/${JS}"  "../../release/${JS}"
	cp "release/${MAP}"  "../../release/sourcemap/${MAP}"


debug/${JS}:
	tsc --project .


.PHONY: clean
clean:
	rm -rf ./debug
	rm -rf ./release
