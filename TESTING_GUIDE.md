# Step-by-Step Testing Guide

## 📝 Step 1: Deploy Test GAS (5 minutes)

1. **Open Google Apps Script**: https://script.google.com
2. **New Project** → Name it "GAS Bridge Test"
3. **Copy code** from `test-echo-gas.gs`
4. **Deploy**:
   - Click "Deploy" → "New deployment"
   - Type: "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone"
   - Click "Deploy"
5. **Copy the deployment URL** (looks like: `https://script.google.com/macros/s/XXXXX/exec`)

---

## 🗄️ Step 2: Insert Test Endpoint (1 minute)

Run this SQL in Supabase (replace `YOUR_GAS_URL`):

```sql
INSERT INTO endpoints (
  user_id,
  name,
  alias,
  gas_url,
  description,
  is_active
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'Test Echo',
  'test',
  'YOUR_GAS_URL_HERE',  -- PASTE YOUR GAS URL HERE
  'Testing endpoint',
  true
);
```

**Verify it was created:**
```sql
SELECT name, alias, gas_url FROM endpoints WHERE alias = 'test';
```

---

## 🧪 Step 3: Test the Repeater!

### Test 1: Get Endpoint Info (GET)
```bash
curl http://localhost:3000/r/test
```

Expected:
```json
{
  "success": true,
  "endpoint": {
    "name": "Test Echo",
    "alias": "test",
    "is_active": true,
    "url": "/r/test"
  }
}
```

### Test 2: Forward to GAS (POST)
```bash
curl -X POST http://localhost:3000/r/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from client!", "user": "Fadhil"}'
```

Expected:
```json
{
  "success": true,
  "message": "✅ GAS Bridge Hub working!",
  "received": {
    "message": "Hello from client!",
    "user": "Fadhil"
  },
  "timestamp": "2026-01-13T...",
  "scriptInfo": {
    "service": "Test Echo GAS",
    "version": "1.0.0"
  }
}
```

---

## 📊 Step 4: Check Logs

```sql
SELECT 
  created_at,
  request_method,
  request_payload->>'message' as message,
  response_status,
  response_time_ms,
  (response_body->>'success')::boolean as success
FROM logs
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ Success Checklist

- [ ] GAS deployed and URL copied
- [ ] Test endpoint inserted in database
- [ ] GET `/r/test` returns endpoint info
- [ ] POST `/r/test` returns GAS response
- [ ] Logs created in database
- [ ] Response time < 2000ms

---

## 🎉 If All Tests Pass

Congratulations! Your **GAS Bridge Hub** repeater is working! 🚀

Next steps:
- Create real endpoints for your projects
- Add payload mapping
- Build the dashboard UI
