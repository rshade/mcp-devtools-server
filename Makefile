# MCP DevTools Server Makefile
# Provides standardized development commands for the project

.DEFAULT_GOAL := help
.PHONY: help clean build test lint fmt check install dev prod start stop restart

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

## Display this help message
help:
	@echo "$(CYAN)MCP DevTools Server - Development Commands$(RESET)"
	@echo ""
	@echo "$(GREEN)Setup Commands:$(RESET)"
	@echo "  $(YELLOW)install$(RESET)     - Install dependencies"
	@echo "  $(YELLOW)clean$(RESET)       - Clean build artifacts"
	@echo ""
	@echo "$(GREEN)Development Commands:$(RESET)"
	@echo "  $(YELLOW)build$(RESET)       - Build TypeScript to JavaScript"
	@echo "  $(YELLOW)dev$(RESET)         - Run in development mode with hot reload"
	@echo "  $(YELLOW)test$(RESET)        - Run tests"
	@echo "  $(YELLOW)test-watch$(RESET)  - Run tests in watch mode"
	@echo ""
	@echo "$(GREEN)Code Quality:$(RESET)"
	@echo "  $(YELLOW)lint$(RESET)        - Run all linting (TypeScript, Markdown, YAML)"
	@echo "  $(YELLOW)lint-ts$(RESET)     - Run TypeScript linting"
	@echo "  $(YELLOW)lint-md$(RESET)     - Run Markdown linting"
	@echo "  $(YELLOW)lint-yaml$(RESET)   - Run YAML linting"
	@echo "  $(YELLOW)fmt$(RESET)         - Format code"
	@echo "  $(YELLOW)check$(RESET)       - Run all checks (lint + test + build)"
	@echo ""
	@echo "$(GREEN)Production:$(RESET)"
	@echo "  $(YELLOW)start$(RESET)       - Start production server"
	@echo "  $(YELLOW)prod$(RESET)        - Build and start production server"
	@echo ""
	@echo "$(GREEN)Utility:$(RESET)"
	@echo "  $(YELLOW)deps-check$(RESET)  - Check for outdated dependencies"
	@echo "  $(YELLOW)security$(RESET)    - Run security audit"
	@echo ""

## Install dependencies
install:
	@echo "$(CYAN)Installing dependencies...$(RESET)"
	npm install

## Clean build artifacts
clean:
	@echo "$(CYAN)Cleaning build artifacts...$(RESET)"
	npm run clean
	rm -rf coverage/
	rm -rf .nyc_output/

## Build TypeScript to JavaScript
build:
	@echo "$(CYAN)Building TypeScript...$(RESET)"
	npm run build

## Run in development mode
dev:
	@echo "$(CYAN)Starting development server...$(RESET)"
	npm run dev

## Run tests
test:
	@echo "$(CYAN)Running tests...$(RESET)"
	npm test

## Run tests in watch mode
test-watch:
	@echo "$(CYAN)Running tests in watch mode...$(RESET)"
	npm test -- --watch

## Run all linting
lint: lint-ts lint-md lint-yaml

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

## Format code
fmt:
	@echo "$(CYAN)Formatting code...$(RESET)"
	npm run lint -- --fix
	npx prettier --write "src/**/*.{ts,js,json}"

## Run all checks (lint + test + build)
check: lint test build
	@echo "$(GREEN)All checks passed!$(RESET)"

## Start production server
start:
	@echo "$(CYAN)Starting production server...$(RESET)"
	npm start

## Build and start production server
prod: build start

## Check for outdated dependencies
deps-check:
	@echo "$(CYAN)Checking for outdated dependencies...$(RESET)"
	npm outdated

## Run security audit
security:
	@echo "$(CYAN)Running security audit...$(RESET)"
	npm audit

## Development setup (install + build + test)
setup: install build test
	@echo "$(GREEN)Development setup complete!$(RESET)"

## Pre-commit checks (what should run before committing)
pre-commit: lint test build
	@echo "$(GREEN)Pre-commit checks passed!$(RESET)"

## CI pipeline (comprehensive checks)
ci: install lint test build security
	@echo "$(GREEN)CI pipeline completed successfully!$(RESET)"