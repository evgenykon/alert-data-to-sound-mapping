.PHONY: dev dev-backend dev-frontend build run stop logs deploy deploy-setup lint typecheck frontend

dev:
	docker compose --profile dev up

dev-backend:
	docker compose --profile dev up backend

dev-frontend:
	docker compose up frontend-dev

build:
	docker compose build

run:
	docker compose up -d

stop:
	docker compose down

logs:
	docker compose logs -f

deploy:
	@echo "=== Deploy backend to Hugging Face Space ==="
	@echo "Убедись, что удалённый репозиторий 'hf' настроен:"
	@echo "  git remote add hf https://huggingface.co/spaces/ТВОЙ_ЛОГИН/alert-sound-mapping"
	@echo ""
	cd backend && git push hf main

lint:
	docker run --rm -v $(PWD)/frontend:/app -w /app node:24-alpine sh -c "npm install && npm run typecheck"
	docker run --rm -v $(PWD)/backend:/app -w /app oven/bun:1 sh -c "bun install && bun run typecheck"

typecheck:
	docker run --rm -v $(PWD)/frontend:/app -w /app node:24-alpine sh -c "npm install && npm run typecheck"
	docker run --rm -v $(PWD)/backend:/app -w /app oven/bun:1 sh -c "bun install && bun run typecheck"

frontend:
	docker run --rm -v $(PWD)/frontend:/app -w /app node:24-alpine sh -c "npm install && npm run generate"
