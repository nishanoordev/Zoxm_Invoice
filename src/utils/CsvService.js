import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * Service to handle CSV generation and parsing
 */
export const CsvService = {
  /**
   * Converts an array of objects to a CSV string
   */
  jsonToCsv: (data) => {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header] === null || row[header] === undefined ? '' : row[header];
        const escaped = ('' + value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
  },

  /**
   * Parses a CSV string to an array of objects
   */
  csvToJson: (csv) => {
    const lines = csv.split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const obj = {};
      const currentLine = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Split by comma not inside quotes
      
      for (let j = 0; j < headers.length; j++) {
        let val = currentLine[j] ? currentLine[j].trim() : '';
        val = val.replace(/^"|"$/g, '').replace(/""/g, '"');
        obj[headers[j]] = val;
      }
      result.push(obj);
    }
    return result;
  },

  /**
   * Exports data to a CSV file and triggers the share dialog
   */
  exportToCsv: async (filename, data) => {
    const csvString = CsvService.jsonToCsv(data);
    const fileUri = `${FileSystem.documentDirectory}${filename}.csv`;
    
    await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri);
    } else {
      throw new Error('Sharing is not available on this device');
    }
  }
};
