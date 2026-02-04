.PHONY: dev build test

dev:
	npm run debug:dev

build:
	rm -rf build/
	npm run build:prod

test:
	npm run test