import Papa from "papaparse";
async function downloadAndParseCsv(supabase, bucket, filePath, options = {}) {
  const defaultOptions = {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    // Server-side might want more control over types
    ...options
  };
  const { data: fileData, error: downloadError } = await supabase.storage.from(bucket).download(filePath);
  if (downloadError || !fileData) {
    throw new Error(
      `Failed to download CSV file from ${bucket}/${filePath}: ${downloadError?.message || "No data returned"}`
    );
  }
  const csvText = await fileData.text();
  const parsed = Papa.parse(csvText, defaultOptions);
  const filteredData = (parsed.data || []).filter((row) => {
    return !!row && typeof row === "object" && Object.keys(row).length > 0;
  });
  return {
    data: filteredData,
    errors: parsed.errors || [],
    meta: parsed.meta
  };
}
async function downloadAndParseCsvSafe(supabase, bucket, filePath, options = {}, tableName) {
  try {
    const result = await downloadAndParseCsv(
      supabase,
      bucket,
      filePath,
      options
    );
    if (result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join(", ");
      const context = tableName ? ` for table ${tableName}` : "";
      console.warn(`\u26A0\uFE0F CSV parse warnings${context}:`, errorMessages);
    }
    return result;
  } catch (error) {
    const context = tableName ? ` for table ${tableName}` : "";
    console.error(`\u274C Error downloading/parsing CSV${context}:`, error);
    return null;
  }
}
export {
  downloadAndParseCsv,
  downloadAndParseCsvSafe
};
