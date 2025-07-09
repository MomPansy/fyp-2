#!/usr/bin/env python3
"""
Test script for the CSV Schema Generator API with gzip compression
"""

import requests
import gzip
import json

# Sample CSV data
csv_data = """name,age,city,is_student,price,availability
John Doe,25,New York,true,100.50,in_stock
Jane Smith,30,Los Angeles,false,200.75,out_of_stock
Bob Johnson,22,Chicago,true,150.25,in_stock
Alice Brown,28,Houston,false,300.00,limited"""

def test_compressed_csv():
    """Test sending gzip-compressed CSV data"""
    print("Testing compressed CSV data...")
    
    # Compress the CSV data
    compressed_data = gzip.compress(csv_data.encode('utf-8'))
    
    # Send POST request with compressed data
    response = requests.post(
        'http://localhost:5002/schema',
        data=compressed_data,
        headers={'Content-Encoding': 'gzip'}
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_raw_csv():
    """Test sending raw CSV data"""
    print("Testing raw CSV data...")
    
    # Send POST request with raw data
    response = requests.post(
        'http://localhost:5002/schema',
        data=csv_data.encode('utf-8')
    )
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_health_check():
    """Test the health check endpoint"""
    print("Testing health check...")
    
    response = requests.get('http://localhost:5002/health')
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

def test_home_endpoint():
    """Test the home endpoint"""
    print("Testing home endpoint...")
    
    response = requests.get('http://localhost:5002/')
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()

if __name__ == '__main__':
    print("CSV Schema Generator API Test")
    print("=" * 40)
    
    try:
        test_health_check()
        test_home_endpoint()
        test_compressed_csv()
        test_raw_csv()
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the API. Make sure the Flask app is running on port 5002.")
    except Exception as e:
        print(f"Error: {e}")
