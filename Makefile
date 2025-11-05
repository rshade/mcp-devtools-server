# Makefile for mcp-devtools-server
# Thin wrapper around npm scripts - npm is the source of truth
# All commands delegate to package.json scripts

.DEFAULT_GOAL := help
.PHONY: help install build install-mcp start dev clean test test-watch test-coverage
.PHONY: lint lint-ts lint-md lint-yaml lint-changelog lint-commit
.PHONY: docs-api docs-dev docs-build docs-preview
.PHONY: check all

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

## Display this help message
help:
	@echo "$(CYAN)MCP DevTools Server - Available Commands$(RESET)"
	@echo ""
	@echo "$(GREEN)Setup:$(RESET)"
	@echo "  $(YELLOW)make install$(RESET)        Install dependencies"
	@echo "  $(YELLOW)make build$(RESET)          Build TypeScript"
	@echo "  $(YELLOW)make install-mcp$(RESET)    Install to Claude Desktop"
	@echo "  $(YELLOW)make clean$(RESET)          Remove build artifacts"
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@echo "  $(YELLOW)make dev$(RESET)            Start development server"
	@echo "  $(YELLOW)make start$(RESET)          Start production server"
	@echo ""
	@echo "$(GREEN)Testing:$(RESET)"
	@echo "  $(YELLOW)make test$(RESET)           Run tests"
	@echo "  $(YELLOW)make test-watch$(RESET)     Run tests in watch mode"
	@echo "  $(YELLOW)make test-coverage$(RESET)  Run tests with coverage"
	@echo ""
	@echo "$(GREEN)Linting:$(RESET)"
	@echo "  $(YELLOW)make lint$(RESET)           Run all linters"
	@echo "  $(YELLOW)make lint-ts$(RESET)        Run TypeScript linting"
	@echo "  $(YELLOW)make lint-md$(RESET)        Run Markdown linting"
	@echo "  $(YELLOW)make lint-yaml$(RESET)      Run YAML linting"
	@echo "  $(YELLOW)make lint-changelog$(RESET) Validate CHANGELOG.md"
	@echo "  $(YELLOW)make lint-commit$(RESET)    Validate commit message"
	@echo ""
	@echo "$(GREEN)Documentation:$(RESET)"
	@echo "  $(YELLOW)make docs-api$(RESET)       Generate API docs (TypeDoc)"
	@echo "  $(YELLOW)make docs-dev$(RESET)       Start docs dev server"
	@echo "  $(YELLOW)make docs-build$(RESET)     Build docs"
	@echo "  $(YELLOW)make docs-preview$(RESET)   Preview built docs"
	@echo ""
	@echo "$(GREEN)CI/CD:$(RESET)"
	@echo "  $(YELLOW)make check$(RESET)          Run all linters and tests"
	@echo "  $(YELLOW)make all$(RESET)            Complete CI pipeline"
	@echo ""
	@echo "$(CYAN)Note: All commands delegate to npm scripts$(RESET)"

## Install dependencies
install:
	@echo "$(CYAN)Installing dependencies...$(RESET)"
	npm install

## Build TypeScript
build:
	@echo "$(CYAN)Building TypeScript...$(RESET)"
	npm run build

## Install MCP server to Claude Desktop
install-mcp: build
	@echo "$(CYAN)Installing mcp-devtools-server to Claude Desktop...$(RESET)"
	@claude mcp add mcp-devtools --scope user -- node $$(realpath dist/index.js) || true
	@echo ""
	@echo "$(GREEN)✓ Installation complete! Please restart Claude Desktop to use the server.$(RESET)"

## Start production server
start:
	@echo "$(CYAN)Starting production server...$(RESET)"
	npm run start

## Start development server
dev:
	@echo "$(CYAN)Starting development server...$(RESET)"
	npm run dev

## Remove build artifacts
clean:
	@echo "$(CYAN)Cleaning build artifacts...$(RESET)"
	npm run clean

## Run tests
test:
	@echo "$(CYAN)Running tests...$(RESET)"
	npm test

## Run tests in watch mode
test-watch:
	@echo "$(CYAN)Running tests in watch mode...$(RESET)"
	npm run test:watch

## Run tests with coverage
test-coverage:
	@echo "$(CYAN)Running tests with coverage...$(RESET)"
	npm run test:coverage

## Run all linters
lint: lint-ts lint-md lint-yaml
	@echo "$(GREEN)✓ All linting passed!$(RESET)"

## Run TypeScript linting
lint-ts:
	@echo "$(CYAN)Running TypeScript linting...$(RESET)"
	npm run lint

## Run Markdown linting
lint-md:
	@echo "$(CYAN)Running Markdown linting...$(RESET)"
	npm run lint:md

## Run YAML linting
lint-yaml:
	@echo "$(CYAN)Running YAML linting...$(RESET)"
	npm run lint:yaml

## Validate CHANGELOG.md format
lint-changelog:
	@echo "$(CYAN)Validating CHANGELOG.md...$(RESET)"
	npm run lint:changelog

## Validate commit message format
lint-commit:
	@echo "$(CYAN)Validating commit message...$(RESET)"
	npm run lint:commit

## Generate API documentation
docs-api:
	@echo "$(CYAN)Generating API documentation...$(RESET)"
	npm run docs:api

## Start docs development server
docs-dev:
	@echo "$(CYAN)Starting docs dev server...$(RESET)"
	npm run docs:dev

## Build documentation
docs-build:
	@echo "$(CYAN)Building documentation...$(RESET)"
	npm run docs:build

## Preview built documentation
docs-preview:
	@echo "$(CYAN)Previewing documentation...$(RESET)"
	npm run docs:preview

## Run all checks (lint + test + build)
check: lint test build
	@echo "$(GREEN)✓ All checks passed!$(RESET)"

## Complete CI pipeline
all: install check
	@echo "$(GREEN)✓ Complete CI pipeline passed!$(RESET)"
