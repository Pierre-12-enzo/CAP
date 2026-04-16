// services/textbeeService.js - IMPROVED VERSION WITH SCHOOL NAME
const axios = require('axios');

class TextBeeService {
  constructor() {
    this.apiKey = process.env.TEXTBEE_API_KEY;
    this.deviceId = process.env.TEXTBEE_DEVICE_ID;
    this.baseURL = 'https://api.textbee.dev/api/v1';
    this.isConfigured = !!this.apiKey && !!this.deviceId;
    
    if (this.isConfigured) {
      console.log(`✅ TextBee: Ready (Device: ${this.deviceId})`);
    }
  }

  async sendSMS(to, message, retries = 2) {
    if (!this.isConfigured) {
      console.log('📱 [DEMO SMS]:', message.substring(0, 50) + '...');
      return { success: true, demo: true };
    }

    const formattedPhone = this.formatPhone(to);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📱 Attempt ${attempt}/${retries}: Sending to ${formattedPhone}`);
        
        const response = await axios.post(
          `${this.baseURL}/gateway/devices/${this.deviceId}/send-sms`,
          {
            recipients: [formattedPhone],
            message: message
          },
          {
            headers: {
              'x-api-key': this.apiKey,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
        
        console.log(`✅ SMS sent successfully!`);
        console.log('Batch ID:', response.data.smsBatchId);
        
        return {
          success: true,
          data: response.data,
          provider: 'textbee',
          batchId: response.data.smsBatchId,
          attempt: attempt
        };
        
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt < retries) {
          console.log(`⏳ Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        return {
          success: false,
          error: error.message,
          provider: 'textbee',
          attempts: attempt
        };
      }
    }
  }

  formatPhone(phone) {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      return `+250${cleaned.substring(1)}`;
    }
    
    if (cleaned.startsWith('250')) {
      return `+${cleaned}`;
    }
    
    if (cleaned.length === 9) {
      return `+250${cleaned}`;
    }
    
    return `+${cleaned}`;
  }

  // Check SMS delivery status
  async checkDeliveryStatus(batchId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/gateway/sms-batches/${batchId}`,
        {
          headers: { 'x-api-key': this.apiKey }
        }
      );
      
      return {
        success: true,
        status: response.data.status,
        data: response.data
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ✅ UPDATED: School-specific SMS templates with school name
  async sendPermissionCreated(student, permission, parentPhone, options = {}) {
    const schoolName = options.schoolName || 'Notre Dame de Lourdes';
    
    // Format return date nicely
    const returnDate = new Date(permission.returnDate).toLocaleDateString('rw-RW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const message = `${schoolName}\n` +
                   `==========================\n` +
                   `📚 URUHUSHANYA RW'UMWANA\n` +
                   `==========================\n\n` +
                   `MWIRIWE NEZA, MUBYEYI WA ${student.name?.toUpperCase()}\n\n` +
                   `Umwana wanyu witwa: ${student.name}\n` +
                   `Aho yiga: ${student.class} - ${student.level}\n` +
                   `Impamvu: ${permission.reason}\n` +
                   `Agiye i: ${permission.destination}\n` +
                   `Itariki yo kugaruka: ${returnDate}\n` +
                   `Numero y'uruhushya: ${permission.permissionNumber || 'N/A'}\n\n` +
                   `----------------------------\n` +
                   `✅ Uruhushanya rwemezanywe\n\n` +
                   `Ku bindi bisobanuro, mwafasha DOD w'ikigo.\n` +
                   `==========================`;
    
    return this.sendSMS(parentPhone, message);
  }

  // ✅ UPDATED: Return confirmation with school name
  async sendReturnConfirmation(student, permission, parentPhone, options = {}) {
    const schoolName = options.schoolName || 'Notre Dame de Lourdes';
    
    const returnDate = new Date().toLocaleDateString('rw-RW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const message = `${schoolName}\n` +
                   `==========================\n` +
                   `✅ KUGARUKA KW'UMWANA\n` +
                   `==========================\n\n` +
                   `MWIRIWE NEZA, MUBYEYI WA ${student.name?.toUpperCase()}\n\n` +
                   `Umwana wanyu witwa: ${student.name}\n` +
                   `Yasubiye mu ishuri neza kuri uyu wa ${returnDate}.\n` +
                   `Numero y'uruhushya: ${permission.permissionNumber || 'N/A'}\n\n` +
                   `Murakoze cyane, Imana ibahe amahoro.\n` +
                   `==========================`;
    
    return this.sendSMS(parentPhone, message);
  }

  // ✅ NEW: Send attendance notification with school name
  async sendAttendanceMarked(student, attendanceData, parentPhone, options = {}) {
    const schoolName = options.schoolName || 'Notre Dame de Lourdes';
    
    const message = `${schoolName}\n` +
                   `==========================\n` +
                   `📊 AMAHITAMO Y'UMWANA\n` +
                   `==========================\n\n` +
                   `MWIRIWE NEZA, MUBYEYI WA ${student.name?.toUpperCase()}\n\n` +
                   `Amahitamo y'umwana wanyu ku itariki ya ${new Date().toLocaleDateString('rw-RW')}:\n` +
                   `Status: ${attendanceData.status === 'present' ? '✅ Yahari' : '❌ Ntahari'}\n` +
                   `Igihe: ${new Date().toLocaleTimeString('rw-RW')}\n\n` +
                   `==========================`;
    
    return this.sendSMS(parentPhone, message);
  }

  // ✅ NEW: Send custom message with school name
  async sendCustomMessage(phone, message, schoolName = 'School') {
    const formattedMessage = `${schoolName}\n` +
                            `==========================\n` +
                            `${message}\n` +
                            `==========================`;
    
    return this.sendSMS(phone, formattedMessage);
  }
}

module.exports = new TextBeeService();