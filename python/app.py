from flask import Flask, request, jsonify
import gzip
import tempfile
import os
import json
from frictionless import Schema
from flask_cors import CORS, cross_origin

app = Flask(__name__)

# Configure CORS for development and production
allowed_origins = [
    "http://localhost:5173",  # Vite dev server
    "https://fyp-node-production.up.railway.app"  # Production URL
]

cors = CORS(app, origins=allowed_origins, supports_credentials=True)
app.config['CORS_HEADERS'] = 'Content-Type'

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
            return jsonify({"error": "No data provided"}), 400
        
        # Check Content-Encoding header
        content_encoding = request.headers.get('Content-Encoding', '').lower()
        
        if content_encoding == 'gzip':
            # Decompress gzip data
            try:
                csv_data = gzip.decompress(request.data).decode('utf-8')
            except Exception as e:
                return jsonify({"error": f"Failed to decompress gzip data: {str(e)}"}), 400
        else:
            # Assume raw CSV data
            try:
                csv_data = request.data.decode('utf-8')
            except Exception as e:
                return jsonify({"error": f"Failed to decode CSV data: {str(e)}"}), 400
        
        # Validate that we have some data
        if not csv_data.strip():
            return jsonify({"error": "Empty CSV data"}), 400
        
        # Generate schema using frictionless
        schema = generate_schema_from_csv(csv_data)
        
        return jsonify(schema), 200
        
    except Exception as e:
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

