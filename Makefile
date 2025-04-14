generate-readme:
	node lib/GenerateReadme.js

check-readme:
	@node lib/GenerateReadme.js > .README_GENERATED.tmp && \
	diff -q README.md .README_GENERATED.tmp || \
	(echo "README.md 최신화 필요함 : node lib/GenerateReadme.js 실행 후 커밋해주세요."; rm .README_GENERATED.tmp; exit 1)
	@rm .README_GENERATED.tmp

.PHONY: generate-readme check-readme
