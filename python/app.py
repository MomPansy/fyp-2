from flask import Flask, request, jsonify
import gzip
import tempfile
import os
import json
from frictionless import Schema
from flask_cors import CORS, cross_origin
import logging
import sys
# Use a safe import for HTTPException to avoid tooling import errors
try:
    from werkzeug.exceptions import HTTPException  # type: ignore
except Exception:  # pragma: no cover - fallback for type checkers
    class HTTPException(Exception):  # type: ignore
        code = 500
        name = "HTTPException"
        description = "HTTP Exception"

app = Flask(__name__)

# Configure CORS for development and production
allowed_origins = [
    "http://localhost:3000",  # Vite dev server
    "https://queryproctor.com"  # Production URL
]

cors = CORS(app, origins=allowed_origins, supports_credentials=True)
app.config['CORS_HEADERS'] = 'Content-Type'

# Configure structured logging
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
_handler = logging.StreamHandler(sys.stdout)
_formatter = logging.Formatter('%(asctime)s %(levelname)s [%(name)s] %(message)s')
_handler.setFormatter(_formatter)
if not app.logger.handlers:
    app.logger.addHandler(_handler)
app.logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))
# Align werkzeug (Flask server) logger with our log level
logging.getLogger('werkzeug').setLevel(getattr(logging, LOG_LEVEL, logging.INFO))
app.logger.info("Flask app initialized, log_level=%s", LOG_LEVEL)

@app.before_request
def log_request_info():
    # Log high-level request details; body preview only in DEBUG
    app.logger.info(
        "Incoming %s %s CT=%s CE=%s CL=%s TE=%s",
        request.method,
        request.path,
        request.headers.get('Content-Type'),
        request.headers.get('Content-Encoding'),
        request.headers.get('Content-Length'),
        request.headers.get('Transfer-Encoding'),
    )
    if app.logger.isEnabledFor(logging.DEBUG) and request.method in {"POST", "PUT", "PATCH"}:
        raw = request.get_data(cache=True)  # cache so handlers can read again
        app.logger.debug("Raw body len=%d preview=%r", len(raw or b""), (raw or b"")[:200])

@app.after_request
def log_response_info(response):
    app.logger.info("Responded %s %s -> %d", request.method, request.path, response.status_code)
    return response

# Log and JSONify HTTP errors (e.g., BadRequest from Werkzeug parsing)
@app.errorhandler(HTTPException)
def handle_http_exception(e: HTTPException):
    # Avoid double-logging 2xx
    if e.code and e.code >= 400:
        app.logger.warning("HTTPException %s %s -> %d: %s", request.method, request.path, e.code, e.description)
    payload = {"error": e.name, "detail": e.description}
    return jsonify(payload), e.code or 500

# Catch-all for uncaught exceptions
@app.errorhandler(Exception)
def handle_unexpected_exception(e: Exception):
    app.logger.exception("Unhandled exception during request")
    return jsonify({"error": "Internal Server Error"}), 500

@app.route('/_debug/echo', methods=['POST'])
def echo_debug():
    """Echo back what Flask received to aid debugging proxy/body issues."""
    raw = request.get_data(cache=True) or b""
    info = {
        "method": request.method,
        "path": request.path,
        "headers": {k: v for k, v in request.headers.items()},
        "content_length": request.content_length,
        "content_type": request.content_type,
        "content_encoding": request.headers.get('Content-Encoding'),
        "transfer_encoding": request.headers.get('Transfer-Encoding'),
        "body_len": len(raw),
        "body_preview": raw[:200].decode('utf-8', errors='replace'),
    }
    app.logger.info("/_debug/echo CL=%s len=%d", request.content_length, len(raw))
    return jsonify(info), 200

def generate_schema_from_csv(csv_string):
    """Generate schema from CSV string using frictionless"""
    try:
        # Create a temporary file to write the CSV data
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
            temp_file.write(csv_string)
            temp_file_path = temp_file.name
        
        # Generate schema using frictionless
        schema = Schema.describe(temp_file_path)
        
        # Clean up the temporary file
        os.unlink(temp_file_path)
        
        # Convert schema to array format with type and column properties
        result = []
        
        for field in schema.fields:
            # Map frictionless types to your expected types
            field_type = field.type
            if field_type == "integer":
                mapped_type = "number"
            elif field_type == "number":
                mapped_type = "number"
            elif field_type == "boolean":
                mapped_type = "boolean"
            elif field_type == "date" or field_type == "datetime" or field_type == "time":
                mapped_type = "string"
            else:
                mapped_type = "string"
            
            # Add to result array in the requested format
            result.append({
                "type": mapped_type,
                "column": field.name
            })
        
        return result
        
    except Exception as e:
        app.logger.exception("Error generating schema from CSV")
        raise Exception(f"Error generating schema: {str(e)}")

@app.route('/schema', methods=['POST'])
@cross_origin()
def generate_schema():
    """
    Endpoint to receive compressed CSV data and return JSON schema
    Expects gzip-compressed CSV data in request body
    """
    try:
        # Check if the request has data
        if not request.data:
            app.logger.warning("/schema received empty body")
            return jsonify({"error": "No data provided"}), 400
        
        # Check Content-Encoding header
        content_encoding = request.headers.get('Content-Encoding', '').lower()
        app.logger.debug("Content-Encoding detected: %s", content_encoding or "<none>")
        
        if content_encoding == 'gzip':
            # Decompress gzip data
            try:
                csv_data = gzip.decompress(request.data).decode('utf-8')
                app.logger.debug("Gzip decompressed bytes=%d", len(csv_data.encode('utf-8')))
            except Exception as e:
                app.logger.warning("Failed to decompress gzip data: %s", e, exc_info=True)
                return jsonify({"error": f"Failed to decompress gzip data: {str(e)}"}), 400
        else:
            # Assume raw CSV data
            try:
                csv_data = request.data.decode('utf-8')
                app.logger.debug("Decoded raw CSV bytes=%d", len(request.data))
            except Exception as e:
                app.logger.warning("Failed to decode CSV data: %s", e, exc_info=True)
                return jsonify({"error": f"Failed to decode CSV data: {str(e)}"}), 400
        
        # Validate that we have some data
        if not csv_data.strip():
            app.logger.warning("CSV data is empty after decode/decompress")
            return jsonify({"error": "Empty CSV data"}), 400
        
        # Generate schema using frictionless
        schema = generate_schema_from_csv(csv_data)
        app.logger.info("Generated schema with %d fields", len(schema))
        
        return jsonify(schema), 200
        
    except Exception as e:
        app.logger.exception("Unhandled error in /schema")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "csv-schema-generator"}), 200

@app.route('/', methods=['GET'])
def home():
    """Home endpoint with usage instructions"""
    return jsonify({
        "message": "CSV Schema Generator API",
        "endpoints": {
            "POST /schema": "Upload compressed or raw CSV data to get JSON schema",
            "GET /health": "Health check endpoint",
            "GET /": "This help message"
        },
        "usage": {
            "compressed": "Send gzip-compressed CSV with Content-Encoding: gzip header",
            "raw": "Send raw CSV data in request body"
        }
    }), 200

if __name__ == '__main__':
    import os
    port = int(os.environ.get('FLASK_PORT', 5002))
    app.run(debug=True, host='0.0.0.0', port=port)

# Gunicorn entry point

