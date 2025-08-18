import pako from "pako";
import { getAuthHeaders } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

type SchemaItem = {
  type: string;
  column: string;
};

interface generateSchemaProps {
  csvString: string;
}

async function generateSchema({ csvString }: generateSchemaProps): Promise<SchemaItem[]> {
  try {
    // Compress the CSV data using pako
    const encoder = new TextEncoder();
    const csvBytes = encoder.encode(csvString);
    const compressedData = pako.gzip(csvBytes);

    // Create a Blob from the compressed data
    const blob = new Blob([new Uint8Array(compressedData)], {
      type: "application/octet-stream",
    });

    const response = await fetch(`/api/python/schema`, {
      method: "POST",
      body: blob,
      headers: {
        ...(await getAuthHeaders()),
        "Content-Encoding": "gzip",
        "Content-Type": "application/octet-stream",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as SchemaItem[];
    return data;
  } catch (error) {
    console.error("Error generating schema:", error);
    throw error;
  }
}

export const inferSchemaMutation = () => useMutation({
  mutationFn: generateSchema,
})
