import pako from "pako";

const BASE_URL = import.meta.env.DEV
    ? process.env.FLASK_URL as string
    : "http://localhost:5002";

type SchemaItem = {
    type: string;
    column: string;
};

export async function generateSchema(
    csvString: string,
): Promise<SchemaItem[]> {
    try {
        // Compress the CSV data using pako
        const encoder = new TextEncoder();
        const csvBytes = encoder.encode(csvString);
        const compressedData = pako.gzip(csvBytes);

        // Create a Blob from the compressed data
        const blob = new Blob([new Uint8Array(compressedData)], {
            type: "application/octet-stream",
        });

        const response = await fetch(`${BASE_URL}/schema`, {
            method: "POST",
            headers: {
                "Content-Encoding": "gzip",
            },
            body: blob,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error generating schema:", error);
        throw error;
    }
}

// Alternative version without compression for comparison
export async function generateSchemaRaw(
    csvString: string,
): Promise<SchemaItem[]> {
    try {
        const response = await fetch(`${BASE_URL}/schema`, {
            method: "POST",
            headers: {
                "Content-Type": "text/csv",
            },
            body: csvString,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error generating schema:", error);
        throw error;
    }
}
