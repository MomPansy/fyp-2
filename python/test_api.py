#!/usr/bin/env python3
"""
Test script for the CSV Schema Generator API
"""
import requests
import gzip
import json

# Sample CSV data
sample_csv = """name,age,email,is_active
John Doe,30,john@example.com,true
Jane Smith,25,jane@example.com,false
Bob Johnson,35,bob@example.com,true
"""

def test_raw_csv():
    """Test with raw CSV data"""
    print("Testing with raw CSV data...")
    
    url = "http://localhost:5000/schema"
    headers = {"Content-Type": "text/csv"}
    
    response = requests.post(url, data=sample_csv, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print("-" * 50)

def test_compressed_csv():
    """Test with gzip-compressed CSV data"""
    print("Testing with gzip-compressed CSV data...")
    
    # Compress the CSV data
    compressed_data = gzip.compress(sample_csv.encode('utf-8'))
    
    url = "http://localhost:5000/schema"
    headers = {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "gzip"
    }
    
    response = requests.post(url, data=compressed_data, headers=headers)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print("-" * 50)

def test_health_check():
    """Test health check endpoint"""
    print("Testing health check...")
    
    url = "http://localhost:5000/health"
    response = requests.get(url)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print("-" * 50)

def test_home():
    """Test home endpoint"""
    print("Testing home endpoint...")
    
    url = "http://localhost:5000/"
    response = requests.get(url)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print("-" * 50)

if __name__ == "__main__":
    print("CSV Schema Generator API Test")
    print("=" * 50)
    
    try:
        test_health_check()
        test_home()
        test_raw_csv()
        test_compressed_csv()
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server.")
        print("Make sure the Flask app is running on http://localhost:5000")
    except Exception as e:
        print(f"Error: {e}")
