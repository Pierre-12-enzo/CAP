// utils/csvParser.js
const csv = require('csv-parser');
const stream = require('stream');

/**
 * Parse CSV buffer into student objects
 * @param {Buffer} csvBuffer - CSV file buffer
 * @returns {Promise<Array>} Array of student objects
 */
async function parseCSVFromBuffer(csvBuffer) {
  return new Promise((resolve, reject) => {
    try {
      console.log('📊 Starting CSV parsing...');
      
      const students = [];
      let rowCount = 0;
      
      const bufferStream = new stream.PassThrough();
      bufferStream.end(csvBuffer);
      
      bufferStream
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;
          
          // Helper function for flexible field matching
          const findValue = (patterns, defaultValue = '') => {
            const rowKeys = Object.keys(row);
            for (const pattern of patterns) {
              for (const key of rowKeys) {
                if (key.toLowerCase().includes(pattern.toLowerCase())) {
                  const value = row[key];
                  if (value && value.toString().trim() !== '') {
                    return value.toString().trim();
                  }
                }
              }
            }
            return defaultValue;
          };
          
          // Create student object
          const student = {
            student_id: (() => {
              // Look for student ID field
              const rowKeys = Object.keys(row);
              for (const key of rowKeys) {
                const keyLower = key.toLowerCase();
                if ((keyLower.includes('student') && keyLower.includes('id')) || 
                    keyLower === 'id' || 
                    keyLower === 'studentid') {
                  const value = row[key];
                  if (value && value.toString().trim() !== '') {
                    return value.toString().trim();
                  }
                }
              }
              // Fallback
              return `STU${rowCount.toString().padStart(3, '0')}`;
            })(),
            
            name: findValue(['name', 'fullname', 'studentname'], 'Unknown Student'),
            class: findValue(['class', 'grade', 'form'], 'N/A'),
            level: findValue(['level', 'education', 'olevel', 'alevel'], 'N/A'),
            residence: findValue(['residence', 'address', 'location', 'city'], 'N/A'),
            gender: findValue(['gender', 'sex'], 'N/A'),
            academic_year: findValue(['academic', 'year', 'session'], '2024'),
            parent_phone: findValue(['parent', 'phone', 'contact', 'mobile'], ''),
            
            // Track import source
            imported_via_csv: true,
            csv_import_timestamp: new Date()
          };
          
          students.push(student);
        })
        .on('end', () => {
          console.log(`✅ Parsed ${students.length} students from CSV`);
          resolve(students);
        })
        .on('error', (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        });
        
    } catch (error) {
      reject(new Error(`CSV parsing failed: ${error.message}`));
    }
  });
}

/**
 * Parse a single CSV line (if needed for simple cases)
 * @param {string} line - CSV line
 * @returns {Array} Array of values
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

module.exports = {
  parseCSVFromBuffer,
  parseCSVLine
};