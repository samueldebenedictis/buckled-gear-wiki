# Ambiente locale con Docker. `make` da solo mostra i comandi.
COMPOSE := docker compose

.DEFAULT_GOAL := help
.PHONY: help env up down logs ps restart reset db demo test shell psql

help: ## Mostra i comandi disponibili
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-8s %s\n", $$1, $$2}'

env: ## Crea .env da .env.example (con segreto generato) se manca
	@test -f .env || { cp .env.example .env && \
		sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$$(openssl rand -base64 32)|" .env && \
		echo "Creato .env"; }

up: env ## Avvia database e app (migrazioni e seed inclusi) su http://localhost:3000
	$(COMPOSE) up -d --build --wait
	@echo "Pronto: http://localhost:3000"

down: ## Ferma e rimuove i container (i dati restano)
	$(COMPOSE) down --remove-orphans

reset: ## Ferma tutto e CANCELLA dati e volumi, poi riparte da zero
	$(COMPOSE) down -v --remove-orphans
	$(MAKE) up

restart: ## Riavvia l'app
	$(COMPOSE) restart app

logs: ## Segue i log dell'app
	$(COMPOSE) logs -f app

ps: ## Stato dei container
	$(COMPOSE) ps

db: env ## Avvia solo il database (per usare pnpm dev sull'host)
	$(COMPOSE) up -d --wait db

demo: ## Aggiunge runner finti con armadi e feedback (solo sviluppo)
	$(COMPOSE) exec app pnpm db:seed:demo

test: ## Esegue i test dentro il container dell'app
	$(COMPOSE) exec app pnpm test

shell: ## Shell nel container dell'app
	$(COMPOSE) exec app sh

psql: ## Console psql sul database
	$(COMPOSE) exec db psql -U buckled -d buckled_gear
