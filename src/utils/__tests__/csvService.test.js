import { CsvService } from '../CsvService';

// expo-file-system is mocked in jest.setup.js

describe('CsvService', () => {

  // ─── jsonToCsv ─────────────────────────────────────────────────────────────

  describe('jsonToCsv', () => {
    it('returns empty string for empty array', () => {
      expect(CsvService.jsonToCsv([])).toBe('');
    });

    it('returns empty string for null/undefined', () => {
      expect(CsvService.jsonToCsv(null)).toBe('');
      expect(CsvService.jsonToCsv(undefined)).toBe('');
    });

    it('generates correct header row', () => {
      const data = [{ name: 'Alice', amount: 100 }];
      const csv = CsvService.jsonToCsv(data);
      const firstLine = csv.split('\n')[0];
      expect(firstLine).toBe('name,amount');
    });

    it('wraps all values in double-quotes', () => {
      const data = [{ name: 'Alice', amount: 100 }];
      const csv = CsvService.jsonToCsv(data);
      const dataLine = csv.split('\n')[1];
      expect(dataLine).toBe('"Alice","100"');
    });

    it('escapes embedded double-quotes by doubling them', () => {
      const data = [{ note: 'She said "hello"' }];
      const csv = CsvService.jsonToCsv(data);
      const dataLine = csv.split('\n')[1];
      expect(dataLine).toContain('She said ""hello""');
    });

    it('handles null/undefined field values as empty string', () => {
      const data = [{ name: null, amount: undefined }];
      const csv = CsvService.jsonToCsv(data);
      const dataLine = csv.split('\n')[1];
      expect(dataLine).toBe('"",""');
    });

    it('generates multiple data rows correctly', () => {
      const data = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      const csv = CsvService.jsonToCsv(data);
      const lines = csv.split('\n');
      expect(lines).toHaveLength(3); // header + 2 rows
      expect(lines[1]).toBe('"1","Alice"');
      expect(lines[2]).toBe('"2","Bob"');
    });
  });

  // ─── csvToJson ─────────────────────────────────────────────────────────────

  describe('csvToJson', () => {
    it('returns empty array for empty CSV', () => {
      expect(CsvService.csvToJson('')).toEqual([]);
      expect(CsvService.csvToJson('header\n')).toHaveLength(0); // only header, no data
    });

    it('parses basic CSV correctly', () => {
      const csv = 'name,amount\n"Alice","100"';
      const result = CsvService.csvToJson(csv);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice');
      expect(result[0].amount).toBe('100');
    });

    it('strips surrounding quotes from values', () => {
      const csv = 'city\n"Mumbai"';
      const result = CsvService.csvToJson(csv);
      expect(result[0].city).toBe('Mumbai');
    });

    it('unescapes doubled double-quotes back to single', () => {
      const csv = 'note\n"She said ""hi"""';
      const result = CsvService.csvToJson(csv);
      expect(result[0].note).toBe('She said "hi"');
    });

    it('skips blank lines in CSV body', () => {
      const csv = 'name,amount\n"Alice","100"\n\n"Bob","200"';
      const result = CsvService.csvToJson(csv);
      expect(result).toHaveLength(2);
    });

    it('round-trips jsonToCsv → csvToJson for simple data', () => {
      const original = [
        { id: '1', name: 'Acme Corp', total: '5000' },
        { id: '2', name: 'Globex',    total: '3200' },
      ];
      const csv    = CsvService.jsonToCsv(original);
      const parsed = CsvService.csvToJson(csv);
      expect(parsed).toEqual(original.map(o => ({
        id:    o.id,
        name:  o.name,
        total: o.total,
      })));
    });
  });

  // ─── exportToCsv ───────────────────────────────────────────────────────────

  describe('exportToCsv', () => {
    let FileSystem;
    let Sharing;

    beforeEach(() => {
      jest.clearAllMocks();
      FileSystem = jest.requireMock('expo-file-system/legacy');
      Sharing    = jest.requireMock('expo-sharing');
      // Reset sharing to the "available" default before each test
      Sharing.isAvailableAsync.mockResolvedValue(true);
      Sharing.shareAsync.mockResolvedValue();
    });

    it('writes the CSV file to documentDirectory', async () => {
      const data = [{ name: 'Invoice A', total: '1000' }];
      await CsvService.exportToCsv('test_export', data);

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('test_export.csv'),
        expect.any(String),
        expect.objectContaining({ encoding: 'utf8' })
      );
    });

    it('calls shareAsync when sharing is available', async () => {
      await CsvService.exportToCsv('share_me', [{ x: '1' }]);
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        expect.stringContaining('share_me.csv')
      );
    });

    it('throws when sharing is not available', async () => {
      Sharing.isAvailableAsync.mockResolvedValue(false);

      await expect(
        CsvService.exportToCsv('no_share', [{ x: '1' }])
      ).rejects.toThrow('Sharing is not available');
    });
  });
});
