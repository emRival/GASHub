# Testing the Repeater - Quick Guide

## 🧪 Test the Core Repeater Functionality

### Step 1: Create a Test Endpoint in Database

Run this SQL in Supabase SQL Editor:

```sql
-- Create a test endpoint
INSERT INTO endpoints (
  user_id,
  name,
  alias,
  gas_url,
  description,
  is_active
) VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'Test Echo Endpoint',
  'test-echo',
  'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
  'Test endpoint',
  true
);
```

> **Note:** Replace `YOUR_DEPLOYMENT_ID` with your actual GAS deployment URL!

---

### Step 2: Test with curl

**Test GET (Get endpoint info):**
```bash
curl http://localhost:3000/r/test-echo
```

Expected response:
```json
{
  "success": true,
  "endpoint": {
    "id": "...",
    "name": "Test Echo Endpoint",
    "alias": "test-echo",
    "is_active": true,
    "url": "/r/test-echo"
  }
}
```

**Test POST (Forward to GAS):**
```bash
curl -X POST http://localhost:3000/r/test-echo \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from GAS Bridge Hub!"}'
```

---

### Step 3: Check Logs in Database

```sql
SELECT 
  created_at,
  request_method,
  request_payload,
  response_status,
  response_time_ms
FROM logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Simple Google Apps Script (for testing)

Deploy this GAS for quick testing:

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: "Received from GAS!",
        echo: data,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

**Deployment:**
1. Create new Apps Script project
2. Paste code above
3. Deploy → New deployment → Web app
4. Execute as: Me
5. Who has access: Anyone
6. Copy deployment URL
7. Use URL in test endpoint SQL above

---

## ✅ Success Indicators

If everything works:
- ✅ GET `/r/test-echo` returns endpoint info
- ✅ POST `/r/test-echo` forwards to GAS and returns response
- ✅ Logs are created in database
- ✅ `last_used_at` timestamp updates
- ✅ Response time is logged

---

## 🐛 Common Issues

**404 - Endpoint not found:**
- Check alias spelling
- Verify endpoint exists in database
- Check `is_active = true`

**500 - Internal error:**
- Check GAS URL is correct
- Verify GAS is deployed as web app
- Check GAS permissions (Anyone can access)

**CORS errors:**
- Not applicable for server-to-server (GAS to backend)
- Only matters for browser → GAS calls
