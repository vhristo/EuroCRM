#!/usr/bin/env bash
#
# Integration checks for multi-company support and the tenant isolation
# boundary. Requires a running app and a real MongoDB — these are not unit
# tests, and the things they guard (cross-company reads, token rotation,
# membership revocation) only have meaning against a real database.
#
#   pnpm verify
#
# Configure with environment variables; the defaults match the local dev stack:
#
#   BASE_URL         http://127.0.0.1:3005
#   MONGO_CONTAINER  eurocrm-mongo-dev   (docker exec target; unset to use a
#                                         local mongosh against MONGO_URI)
#   MONGO_URI        mongodb://admin:changeme@localhost:27017/eurocrm?authSource=admin
#   MONGO_DB         eurocrm
#
# Every account this creates is namespaced with a per-run id and removed at the
# end, including any organizations left without members.
#
# Two traps, both of which silently produced false results while this was being
# written:
#
#   1. mongosh must receive a script via --eval "$(cat file)". Piped on stdin it
#      is read as REPL input, one line at a time, and every multi-line statement
#      fails to parse while the exit status stays 0.
#   2. JSON request bodies go through a file. Inline braces inside $( ) undergo
#      brace expansion, which mangles both the request body and the argument
#      list of whatever is being asserted — producing a PASS on an empty value.

set -uo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3005}"
MONGO_CONTAINER="${MONGO_CONTAINER-eurocrm-mongo-dev}"
MONGO_URI="${MONGO_URI:-mongodb://admin:changeme@localhost:27017/eurocrm?authSource=admin}"
MONGO_DB="${MONGO_DB:-eurocrm}"

RUN="${RUN_ID:-$$$(date +%s)}"
TMP="$(mktemp -d)"
BODY="$TMP/body.json"
OUT="$TMP/out.json"
JAR="$TMP/cookies"
H='Content-Type: application/json'

pass=0; fail=0
ok()  { echo "  PASS  $1"; pass=$((pass + 1)); }
no()  { echo "  FAIL  $1"; fail=$((fail + 1)); }
chk() { if [ "$2" = "$3" ]; then ok "$1 ($2)"; else no "$1 (got '$2', want '$3')"; fi; }

# Run a JavaScript snippet against MongoDB. Never pipe the script on stdin.
M() {
  if [ -n "$MONGO_CONTAINER" ]; then
    docker exec "$MONGO_CONTAINER" mongosh --quiet \
      -u admin -p changeme --authenticationDatabase admin "$MONGO_DB" --eval "$1"
  else
    mongosh --quiet "$MONGO_URI" --eval "$1"
  fi
}

# req METHOD PATH [TOKEN] — body is read from $BODY, response lands in $OUT,
# the status code is echoed.
req() {
  curl -s -o "$OUT" -w '%{http_code}' -X "$1" -H "$H" \
    ${3:+-H "authorization: Bearer $3"} --data-binary @"$BODY" "$BASE_URL$2"
}

# get PATH [TOKEN]
get() {
  curl -s -o "$OUT" -w '%{http_code}' \
    ${2:+-H "authorization: Bearer $2"} "$BASE_URL$1"
}

body() { cat > "$BODY"; }

EMAIL_A="verify-a-$RUN@example.invalid"
EMAIL_B="verify-b-$RUN@example.invalid"
EMAIL_LEGACY="verify-legacy-$RUN@example.invalid"
EMAIL_SWEEP="verify-sweep-$RUN@example.invalid"

cleanup() {
  M "
    const ids = db.users.find({ email: /-$RUN@example\\.invalid\$/ }, { _id: 1 })
      .toArray().map(u => u._id);
    const orgs = db.memberships.find({ userId: { \$in: ids } }, { organizationId: 1 })
      .toArray().map(m => m.organizationId);
    db.memberships.deleteMany({ userId: { \$in: ids } });
    db.users.deleteMany({ _id: { \$in: ids } });
    const live = db.memberships.distinct('organizationId');
    const orphans = db.organizations.find({ _id: { \$nin: live } }, { _id: 1 })
      .toArray().map(o => o._id);
    const all = orgs.concat(orphans);
    ['contacts','deals','leads','activities','pipelines','webforms','apikeys','webhooks']
      .forEach(c => { try { db.getCollection(c).deleteMany({ organizationId: { \$in: all } }); } catch (e) {} });
    db.organizations.deleteMany({ _id: { \$in: all } });
  " > /dev/null 2>&1
  rm -rf "$TMP"
}
trap cleanup EXIT

echo "run id $RUN against $BASE_URL"
echo

echo "=== Registration ==="
body <<EOF
{"email":"$EMAIL_A","password":"password123","firstName":"Ann","lastName":"One","organizationName":"Acme $RUN"}
EOF
curl -s -c "$JAR" -H "$H" --data-binary @"$BODY" "$BASE_URL/api/auth/register" > "$TMP/a.json"
TA=$(jq -r .accessToken "$TMP/a.json")
ORG_A=$(jq -r .user.organizationId "$TMP/a.json")
chk "register returns one organization" "$(jq -r '.organizations|length' "$TMP/a.json")" "1"
chk "creator is admin"                  "$(jq -r '.organizations[0].role' "$TMP/a.json")" "admin"
chk "active organization matches"       "$(jq -r '.organizations[0].id' "$TMP/a.json")" "$ORG_A"
chk "pipeline seeded at creation"       "$(M "print(db.pipelines.countDocuments({organizationId: ObjectId('$ORG_A')}))")" "1"

body <<< '{"firstName":"Carl","lastName":"Acme","email":"carl@example.invalid"}'
chk "contact created" "$(req POST /api/contacts "$TA")" "201"
CONTACT_A=$(jq -r '.id // ._id' "$OUT")

echo
echo "=== Cross-company isolation (two separate accounts) ==="
body <<EOF
{"email":"$EMAIL_B","password":"password123","firstName":"Bob","lastName":"Two","organizationName":"Globex $RUN"}
EOF
curl -s -H "$H" --data-binary @"$BODY" "$BASE_URL/api/auth/register" > "$TMP/b.json"
TB=$(jq -r .accessToken "$TMP/b.json")
ORG_B=$(jq -r .user.organizationId "$TMP/b.json")
body <<< '{"firstName":"Dana","lastName":"Globex","email":"dana@example.invalid"}'
req POST /api/contacts "$TB" > /dev/null
CONTACT_B=$(jq -r '.id // ._id' "$OUT")

chk "A reading B's contact"   "$(get "/api/contacts/$CONTACT_B" "$TA")" "404"
chk "B reading A's contact"   "$(get "/api/contacts/$CONTACT_A" "$TB")" "404"
get /api/contacts "$TA" > /dev/null
if jq -r '[.items[].id]|join(",")' "$OUT" | grep -q "$CONTACT_B"; then
  no "A's list excludes B's contact"
else
  ok "A's list excludes B's contact"
fi
chk "A's contact count" "$(jq -r .total "$OUT")" "1"
get /api/settings/organization "$TA" > /dev/null
chk "A sees its own organization" "$(jq -r .name "$OUT")" "Acme $RUN"
get /api/settings/organization "$TB" > /dev/null
chk "B sees its own organization" "$(jq -r .name "$OUT")" "Globex $RUN"
for p in deals leads activities; do
  get "/api/$p" "$TA" > /dev/null
  chk "A's $p are scoped" "$(jq -r .total "$OUT")" "0"
done

echo
echo "=== One account, two companies ==="
body <<EOF
{"name":"Acme Labs $RUN"}
EOF
curl -s -b "$JAR" -c "$JAR" -H "$H" -H "authorization: Bearer $TA" \
  --data-binary @"$BODY" "$BASE_URL/api/organizations" > "$TMP/c.json"
TC=$(jq -r .accessToken "$TMP/c.json")
ORG_C=$(jq -r .user.organizationId "$TMP/c.json")
chk "now a member of two"       "$(jq -r '.organizations|length' "$TMP/c.json")" "2"
if [ "$ORG_C" != "$ORG_A" ]; then ok "switched into the new company"; else no "switched into the new company"; fi
chk "new company seeded"        "$(M "print(db.pipelines.countDocuments({organizationId: ObjectId('$ORG_C')}))")" "1"
get /api/contacts "$TC" > /dev/null
chk "new company starts empty"  "$(jq -r .total "$OUT")" "0"
get /api/settings/organization "$TC" > /dev/null
chk "new company's settings"    "$(jq -r .name "$OUT")" "Acme Labs $RUN"

printf '{"organizationId":"%s"}' "$ORG_A" > "$BODY"
curl -s -b "$JAR" -c "$JAR" -H "$H" -H "authorization: Bearer $TC" \
  --data-binary @"$BODY" "$BASE_URL/api/auth/switch-org" > "$TMP/s.json"
TS=$(jq -r .accessToken "$TMP/s.json")
chk "switched back"             "$(jq -r .user.organizationId "$TMP/s.json")" "$ORG_A"
get /api/contacts "$TS" > /dev/null
chk "first company's data returns" "$(jq -r '.items[0].id' "$OUT")" "$CONTACT_A"
chk "and only its own"             "$(jq -r .total "$OUT")" "1"

echo
echo "=== switch-org rejects everything it should ==="
printf '{"organizationId":"%s"}' "$ORG_B" > "$BODY"
CODE_NOT_MEMBER=$(req POST /api/auth/switch-org "$TS"); BODY_NOT_MEMBER=$(cat "$OUT")
chk "another account's company -> 403" "$CODE_NOT_MEMBER" "403"
printf '{"organizationId":"507f1f77bcf86cd799439011"}' > "$BODY"
CODE_ABSENT=$(req POST /api/auth/switch-org "$TS"); BODY_ABSENT=$(cat "$OUT")
chk "a company that does not exist -> 403" "$CODE_ABSENT" "403"
# Identical responses on purpose: a 404 here would confirm which ids exist.
if [ "$BODY_NOT_MEMBER" = "$BODY_ABSENT" ]; then
  ok "both 403s are byte-identical (no id oracle)"
else
  no "both 403s are byte-identical (no id oracle)"
fi
printf '{"organizationId":"not-an-objectid"}' > "$BODY"
chk "a malformed id -> 400, not a 500" "$(req POST /api/auth/switch-org "$TS")" "400"
grep -q "Invalid organization id" "$OUT" && ok "the 400 came from the id check" || no "the 400 came from the id check"
printf '{}' > "$BODY"
chk "an empty body -> 400" "$(req POST /api/auth/switch-org "$TS")" "400"
printf '{"organizationId":"%s"}' "$ORG_A" > "$BODY"
chk "no credentials -> 401" "$(req POST /api/auth/switch-org "")" "401"

printf '{"name":"Sneaky %s","plan":"enterprise"}' "$RUN" > "$BODY"
req POST /api/organizations "$TS" > /dev/null
SNEAKY=$(jq -r .user.organizationId "$OUT")
chk "plan cannot be set from the request body" \
  "$(M "print(db.organizations.findOne({_id: ObjectId('$SNEAKY')}).plan)")" "free"

echo
echo "=== Refresh keeps the active company, and rotates ==="
printf '{"organizationId":"%s"}' "$ORG_C" > "$BODY"
curl -s -b "$JAR" -c "$JAR" -H "$H" -H "authorization: Bearer $TS" \
  --data-binary @"$BODY" "$BASE_URL/api/auth/switch-org" > /dev/null
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE_URL/api/auth/refresh" > "$TMP/r.json"
# Refresh reads the company from the token, not the user document; reading it
# from the document would silently undo a switch every access-token lifetime.
chk "refresh preserved the switched company" "$(jq -r .user.organizationId "$TMP/r.json")" "$ORG_C"
chk "refresh returns the user"               "$(jq -r .user.email "$TMP/r.json")" "$EMAIL_A"
chk "refresh returns the company list"       "$(jq -r '.organizations|length' "$TMP/r.json")" "3"

cp "$JAR" "$TMP/stale"
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE_URL/api/auth/refresh" > /dev/null
chk "a consumed refresh cookie -> 401" \
  "$(curl -s -b "$TMP/stale" -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/auth/refresh")" "401"
if diff -q <(grep refreshToken "$JAR") <(grep refreshToken "$TMP/stale") > /dev/null; then
  no "the refresh token actually changed"
else
  ok "the refresh token actually changed"
fi

echo
echo "=== A user who predates memberships is backfilled once ==="
body <<EOF
{"email":"$EMAIL_LEGACY","password":"password123","firstName":"Leg","lastName":"Acy","organizationName":"Legacy $RUN"}
EOF
curl -s -H "$H" --data-binary @"$BODY" "$BASE_URL/api/auth/register" > "$TMP/l.json"
LEG_ORG=$(jq -r .user.organizationId "$TMP/l.json")
# Rewind the document to its pre-migration shape: legacy fields, no membership.
M "
  const u = db.users.findOne({ email: '$EMAIL_LEGACY' });
  db.memberships.deleteMany({ userId: u._id });
  db.users.updateOne({ _id: u._id },
    { \$unset: { lastOrganizationId: '', membershipsBackfilledAt: '' } });
" > /dev/null
chk "starts with no membership" "$(M "const u=db.users.findOne({email:'$EMAIL_LEGACY'}); print(db.memberships.countDocuments({userId:u._id}))")" "0"
body <<EOF
{"email":"$EMAIL_LEGACY","password":"password123"}
EOF
chk "can still log in"        "$(req POST /api/auth/login "")" "200"
chk "lands in the same company" "$(jq -r .user.organizationId "$OUT")" "$LEG_ORG"
chk "keeps its role"            "$(jq -r .user.role "$OUT")" "admin"
chk "membership was created"    "$(M "const u=db.users.findOne({email:'$EMAIL_LEGACY'}); print(db.memberships.countDocuments({userId:u._id}))")" "1"
MARKER=$(M "print(db.users.countDocuments({email:'$EMAIL_LEGACY', membershipsBackfilledAt:{\$exists:true}}))")
chk "and marked so it cannot run again" "$MARKER" "1"

echo
echo "=== Revocation ==="
# Removing one membership must not sign the user out of the others.
M "
  const u = db.users.findOne({ email: '$EMAIL_A' });
  db.memberships.deleteOne({ userId: u._id, organizationId: ObjectId('$ORG_C') });
" > /dev/null
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE_URL/api/auth/refresh" > "$TMP/rev.json"
REMAINING=$(jq -r '.organizations|length' "$TMP/rev.json")
chk "falls back to another company" "$(jq -r '.user.organizationId != "'"$ORG_C"'"' "$TMP/rev.json")" "true"
chk "company list shrank"           "$REMAINING" "2"
M "const u=db.users.findOne({email:'$EMAIL_A'}); db.memberships.deleteMany({userId:u._id});" > /dev/null
chk "no memberships left -> 401" \
  "$(curl -s -b "$JAR" -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/auth/refresh")" "401"
body <<EOF
{"email":"$EMAIL_A","password":"password123"}
EOF
# 403 and not 401: the password was correct, so the login form must not claim otherwise.
chk "no memberships left -> login 403" "$(req POST /api/auth/login "")" "403"

echo
echo "=== Everything else still works ==="
body <<EOF
{"email":"$EMAIL_SWEEP","password":"password123","firstName":"Sw","lastName":"Eep","organizationName":"Sweep $RUN"}
EOF
req POST /api/auth/register "" > /dev/null
T4=$(jq -r .accessToken "$OUT")
get /api/pipeline "$T4" > /dev/null
cp "$OUT" "$TMP/pipe.json"
PID=$(jq -r '.[0].id' "$TMP/pipe.json")
S1=$(jq -r '.[0].stages[0].id' "$TMP/pipe.json")
S2=$(jq -r '.[0].stages[1].id' "$TMP/pipe.json")
chk "pipeline present" "$(jq -r 'length' "$TMP/pipe.json")" "1"

body <<< '{"firstName":"Reg","lastName":"Test","email":"reg@example.invalid"}'
chk "create contact"  "$(req POST /api/contacts "$T4")" "201"
CID=$(jq -r '.id // ._id' "$OUT")
printf '{"title":"Big deal","value":125000,"currency":"EUR","pipelineId":"%s","stage":"%s","contactId":"%s"}' "$PID" "$S1" "$CID" > "$BODY"
chk "create deal"     "$(req POST /api/deals "$T4")" "201"
DID=$(jq -r '.id // ._id' "$OUT")
printf '{"stage":"%s"}' "$S2" > "$BODY"
chk "move deal stage" "$(req PUT "/api/deals/$DID/stage" "$T4")" "200"
body <<< '{"name":"Lead Person","email":"lead@example.invalid","source":"referral"}'
chk "create lead"     "$(req POST /api/leads "$T4")" "201"
LID=$(jq -r .id "$OUT")
chk "lead returns id, not _id" "$(jq -r 'has("_id")' "$OUT")" "false"
printf '{"pipelineId":"%s","stage":"%s","dealTitle":"From lead","dealValue":50000}' "$PID" "$S1" > "$BODY"
chk "convert lead"    "$(req POST "/api/leads/$LID/convert" "$T4")" "201"
printf '{"type":"call","subject":"Ring back","dueDate":"2030-01-01T10:00:00.000Z","dealId":"%s"}' "$DID" > "$BODY"
chk "create activity" "$(req POST /api/activities "$T4")" "201"
AID=$(jq -r .id "$OUT")
chk "activity returns id, not _id" "$(jq -r 'has("_id")' "$OUT")" "false"
printf '{}' > "$BODY"
chk "complete activity" "$(req PUT "/api/activities/$AID/done" "$T4")" "200"
for r in dashboard pipeline-summary revenue-forecast leaderboard; do
  chk "report $r" "$(get "/api/reports/$r" "$T4")" "200"
done

body <<< '{"name":"verify key","permissions":["contacts:read"]}'
chk "admin can create an API key" "$(req POST /api/settings/api-keys "$T4")" "201"
KEY=$(jq -r .key "$OUT")
chk "the v1 API accepts it"       "$(curl -s -o "$OUT" -w '%{http_code}' -H "x-api-key: $KEY" "$BASE_URL/api/v1/contacts")" "200"
chk "and is scoped to its company" "$(jq -r .total "$OUT")" "2"

# API keys carry the whole company's authority, so creating them is admin-only.
M "const u=db.users.findOne({email:'$EMAIL_SWEEP'}); db.memberships.updateOne({userId:u._id},{\$set:{role:'sales_rep'}});" > /dev/null
body <<EOF
{"email":"$EMAIL_SWEEP","password":"password123"}
EOF
req POST /api/auth/login "" > /dev/null
T5=$(jq -r .accessToken "$OUT")
chk "role change took effect"           "$(jq -r .user.role "$OUT")" "sales_rep"
body <<< '{"name":"nope","permissions":["contacts:read"]}'
chk "sales_rep cannot create API keys"  "$(req POST /api/settings/api-keys "$T5")" "403"
body <<< '{"url":"https://example.invalid/hook","events":["contact.created"]}'
chk "sales_rep cannot create webhooks"  "$(req POST /api/settings/webhooks "$T5")" "403"
chk "sales_rep can still read API keys" "$(get /api/settings/api-keys "$T5")" "200"

echo
echo "================ $pass passed, $fail failed ================"
[ "$fail" -eq 0 ]
