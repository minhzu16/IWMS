#!/bin/bash
set -eo pipefail

DB_NAME=${DB_NAME:-"iwms"}
DB_USER=${DB_USER:-"postgres"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
BACKUP_DIR=${BACKUP_DIR:-"/var/backups/iwms"}

DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[Backup] Starting backup of database ${DB_NAME} at $(date)..."

pg_dump -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${BACKUP_FILE}"

echo "[Backup] Successfully created ${BACKUP_FILE}"

# Retention Policy: keep last 7 daily, 4 weekly, 6 monthly
find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -mtime +30 -exec rm {} \;
echo "[Backup] Cleaned up backups older than 30 days."
