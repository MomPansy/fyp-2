# CSV Schema Generator API

A Flask web service that receives compressed or raw CSV data and returns a JSON schema using the frictionless library.

## Features

- Accepts both gzip-compressed and raw CSV data
- Generates JSON schema using frictionless library
- RESTful API with proper error handling
- Health check endpoint
- Comprehensive testing script

## Installation

1. Install dependencies using uv:

```bash
uv sync
```

## Usage

### Start the Flask Application

```bash
uv run python app.py
```

The server will start on `http://localhost:5002` (or port specified by FLASK_PORT environment variable)

### API Endpoints

#### POST /schema

Upload CSV data (compressed or raw) to get JSON schema.

**For gzip-compressed CSV:**

```bash
curl -X POST http://localhost:5002/schema \
  -H "Content-Type: application/octet-stream" \
  -H "Content-Encoding: gzip" \
  --data-binary @compressed_file.csv.gz
```

**For raw CSV:**

```bash
curl -X POST http://localhost:5002/schema \
  -H "Content-Type: text/csv" \
  -d "name,age,email
John,30,john@example.com
Jane,25,jane@example.com"
```

#### GET /health

Health check endpoint.

```bash
curl http://localhost:5002/health
```

#### GET /

Home endpoint with API documentation.

```bash
curl http://localhost:5002/
```

### Testing

Run the comprehensive test script:

```bash
uv run python test_compression.py
```

This will test all endpoints with both compressed and raw CSV data.

### Example Response

```json
[
  { "type": "string", "column": "name" },
  { "type": "number", "column": "age" },
  { "type": "string", "column": "email" },
  { "type": "boolean", "column": "is_active" }
]
```

## Docker Support

You can also run this in a Docker container (if Docker support is needed, let me know and I can add a Dockerfile).

## Error Handling

The API returns appropriate HTTP status codes:

- 200: Success
- 400: Bad request (invalid data, compression issues)
- 500: Internal server error

Error responses include descriptive messages:

```json
{
  "error": "Failed to decompress gzip data: ..."
}
```
