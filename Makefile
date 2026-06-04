.PHONY: docker-up docker-down docker-build docker-ps docker-migrate docker-test docker-route-list frontend-typecheck frontend-lint

docker-up:
	docker compose up --build

docker-build:
	docker compose build

docker-down:
	docker compose down

docker-ps:
	docker compose ps

docker-migrate:
	docker compose exec backend php artisan migrate

docker-test:
	docker compose exec backend php artisan test

docker-route-list:
	docker compose exec backend php artisan route:list

frontend-typecheck:
	docker compose exec frontend npm run typecheck

frontend-lint:
	docker compose exec frontend npm run lint
