#!/usr/bin/env bash
# =====================================================================================
#  JourneyGo — PostgreSQL backup (dùng trên Linux / GitHub Actions self-hosted runner)
#
#  Gọi được từ workflow:
#      ./scripts/backup/backup-postgres.sh
#      ./scripts/backup/backup-postgres.sh --retention 30 --output-dir /var/backups/journeygo
#
#  pg_dump chạy BÊN TRONG container postgres ⇒ không cần cài pg_dump trên host.
# =====================================================================================
set -euo pipefail

RETENTION=14
OUTPUT_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --retention) RETENTION="$2"; shift 2 ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# ── Xác định thư mục gốc repo ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [[ -z "${OUTPUT_DIR}" ]]; then
  OUTPUT_DIR="${REPO_ROOT}/backups"
fi
mkdir -p "${OUTPUT_DIR}"

# ── Đọc thông tin kết nối từ .env gốc ────────────────────────────────────────────
ENV_FILE="${REPO_ROOT}/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: Không tìm thấy ${ENV_FILE}. Hãy tạo từ .env.example trước." >&2
  exit 1
fi

read_env() {
  # in giá trị của biến trong .env (bỏ qua comment, bỏ khoảng trắng thừa)
  grep -E "^${1}=" "${ENV_FILE}" | head -n1 | cut -d= -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

DB_NAME="$(read_env POSTGRES_DB)";   DB_NAME="${DB_NAME:-journeygo_db}"
DB_USER="$(read_env POSTGRES_USER)"; DB_USER="${DB_USER:-journeygo}"

COMPOSE_FILE="${REPO_ROOT}/docker-compose.yml"

# ── Kiểm tra container postgres đang chạy ───────────────────────────────────────
if ! docker compose -f "${COMPOSE_FILE}" ps --status running --services | grep -qx postgres; then
  echo "ERROR: Container 'postgres' không chạy. Chạy 'docker compose up -d' trước." >&2
  exit 1
fi

# ── Tạo file backup ─────────────────────────────────────────────────────────────
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE_NAME="journeygo-${DB_NAME}-${TIMESTAMP}.dump"
FILE_PATH="${OUTPUT_DIR}/${FILE_NAME}"
TMP_PATH="${FILE_PATH}.partial"

echo "[backup] Đang sao lưu database '${DB_NAME}' (user: ${DB_USER})..."
echo "[backup] File đích: ${FILE_PATH}"

DUMP_CMD="pg_dump -U \"${DB_USER}\" -d \"${DB_NAME}\" --format=custom --no-owner --no-privileges --clean --if-exists"

docker compose -f "${COMPOSE_FILE}" exec -T postgres sh -c "${DUMP_CMD}" > "${TMP_PATH}"

if [[ ! -s "${TMP_PATH}" ]]; then
  rm -f "${TMP_PATH}"
  echo "ERROR: File backup rỗng — pg_dump thất bại." >&2
  exit 1
fi

mv "${TMP_PATH}" "${FILE_PATH}"
SIZE_MB=$(awk "BEGIN {printf \"%.2f\", $(stat -c%s "${FILE_PATH}")/1048576}")
echo "[backup] ✅ Hoàn tất: ${FILE_NAME} (${SIZE_MB} MB)"

# ── Dọn backup cũ theo retention ────────────────────────────────────────────────
echo "[backup] Xoá bản backup cũ hơn ${RETENTION} ngày..."
find "${OUTPUT_DIR}" -maxdepth 1 -name "journeygo-${DB_NAME}-*.dump" -type f -mtime "+${RETENTION}" -print -delete || true

COUNT=$(find "${OUTPUT_DIR}" -maxdepth 1 -name 'journeygo-*.dump' -type f | wc -l)
echo "[backup] Số bản backup hiện có: ${COUNT}"
