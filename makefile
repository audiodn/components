.PHONY: setup
setup:
	git config core.hooksPath '.githooks/_';
	cp .env.example .env;
	npm install;

.PHONY: build
build:
	rm -rf dist;
	npm run build;

.PHONY: build-player
build-player:
	rm -rf dist;
	npm run build:player;

.PHONY: build-uploader
build-uploader:
	rm -rf dist;
	npm run build:uploader;

.PHONY: preview
preview:
	npm run build;
	cat index.html | sed 's/\/src\/index.ts/.\/audiodn-client.js/g' > dist/index.html
	cd dist; npx http-serve;

.PHONY: dev
dev:
	npm run dev;

.PHONY: lint
lint:
	npx eslint;

.PHONY: fmt
fmt:
	npx eslint --fix;

.PHONY: update
update:
	npx npm-check-updates -i --format group;

.PHONY: visualize
visualize:
	npm run visualize-bundle;
