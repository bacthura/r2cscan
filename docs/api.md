# R2C-Scan API Documentation v2.0

## Base URL
```
Development: http://localhost:3001/api
Production:  https://your-api.onrender.com/api
```

## Authentication

### POST /api/auth/login
Admin login. Returns JWT token.

**Request:**
```json
{ "password": "admin123" }
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "role": "admin", "name": "Administrador" }
}
```

### POST /api/auth/verify
Verify JWT token validity.

**Headers:** `Authorization: Bearer <token>`

### GET /api/auth/status
Check authentication status.

## Products

### GET /api/products
List all products.

**Query params:** `?search=termo&category=Fixadores`

### GET /api/products/:id
Get product by ID.

### POST /api/products
Create product. Requires auth.

### PUT /api/products/:id
Update product. Requires auth.

### DELETE /api/products/:id
Delete product. Requires admin.

## Maintenance

### GET /api/maintenance
List maintenance records. `?status=pending|inprogress|done`

### POST /api/maintenance
Create maintenance. Requires auth.

## Stock

### GET /api/stock
List stock items.

### POST /api/stock
Create stock item. Requires auth.

### GET /api/stock/movements/list
List movements.

### POST /api/stock/movements
Register movement. Requires auth.

## Suppliers

### GET /api/suppliers
List suppliers.

### POST /api/suppliers
Create supplier. Requires auth.

## Dashboard

### GET /api/dashboard/stats
Get aggregated statistics.

### GET /api/dashboard/health
Health check.

### GET /api/health
Server health check.