#!/bin/sh
set -e

echo "➡️ Syncing database schema with Prisma..."
until npx prisma db push --skip-generate; do
  echo "Prisma db push failed, database may still be initializing. Retrying in 2s..."
  sleep 2
done

echo "➡️ Seeding database..."
npm run db:seed || true

echo "➡️ Starting DeviceNagar application..."
exec "$@"
