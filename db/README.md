# Database

The Vercel API creates and indexes its PostgreSQL tables on first use. `POSTGRES_URL` (or `DATABASE_URL`) must point to a persistent PostgreSQL database. Do not use a local SQLite file for deployed Vercel Functions: function filesystems are not durable shared storage.

Tables created: `users`, `sessions`, `wallets`, `app_config`, `prizes`, `plays`, `inventory`, `ledger`, and `shipping_orders`. Transactions lock the player's wallet and available prize rows while a play or redemption is processed.
