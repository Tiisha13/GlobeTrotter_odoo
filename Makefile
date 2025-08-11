# Makefile for GlobeTrotter Backend

.PHONY: help build run test clean docker-build docker-run docker-stop deps install-tools

# Variables
APP_NAME=globetrotter
DOCKER_IMAGE=globetrotter-api
DOCKER_TAG=latest
PORT=8080

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

deps: ## Download dependencies
	go mod tidy
	go mod download

build: ## Build the application
	go build -o bin/$(APP_NAME) ./cmd/server

run: ## Run the application locally
	go run ./cmd/server/main.go

test: ## Run tests
	go test -v ./...

test-coverage: ## Run tests with coverage
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

clean: ## Clean build artifacts
	rm -rf bin/
	rm -f coverage.out coverage.html

install-tools: ## Install development tools
	go install github.com/cosmtrek/air@latest

dev: ## Run with hot reload
	air

lint: ## Run linter
	golangci-lint run

docker-build: ## Build Docker image
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

docker-run: ## Run with Docker
	docker-compose up -d

docker-stop: ## Stop Docker containers
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f api

docker-clean: ## Clean Docker containers and volumes
	docker-compose down -v
	docker rmi $(DOCKER_IMAGE):$(DOCKER_TAG) 2>/dev/null || true

setup: deps install-tools ## Setup development environment
	cp .env.example .env
	@echo "✅ Development environment setup complete!"
	@echo "📝 Please edit .env file with your configuration"
	@echo "🚀 Run 'make docker-run' to start the application"

prod-build: ## Build production binary
	CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-w -s' -o bin/$(APP_NAME) ./cmd/server

# Database commands
db-reset: ## Reset local database (requires Docker)
	docker-compose down -v
	docker-compose up -d mongo redis
	@echo "⏳ Waiting for database to be ready..."
	sleep 10
	@echo "✅ Database reset complete!"

# Health check
health: ## Check if the API is running
	curl -f http://localhost:$(PORT)/health || echo "❌ API is not running"

# Development workflow
start: docker-run ## Start development environment
	@echo "🚀 Starting GlobeTrotter development environment..."
	@echo "📊 MongoDB Express: http://localhost:8081 (admin/admin123)"
	@echo "🔴 Redis Commander: http://localhost:8082"
	@echo "🌐 API Health Check: http://localhost:8080/health"

stop: docker-stop ## Stop development environment

restart: docker-stop docker-run ## Restart development environment

# Production commands
deploy-staging: docker-build ## Deploy to staging (customize as needed)
	@echo "🚀 Deploying to staging..."
	# Add your staging deployment commands here

deploy-prod: prod-build ## Deploy to production (customize as needed)
	@echo "🚀 Deploying to production..."
	# Add your production deployment commands here
