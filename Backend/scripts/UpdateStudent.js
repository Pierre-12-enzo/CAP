require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Student = require('../models/Student');

async function updateAllStudents() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        //Update all students to set the schoolId field
        const result = await Student.updateMany(
            {}, 
            { $set: { schoolId: '69acad6a2b88ef141923f9e2' } }
        )
        console.log('Students updated:', result.modifiedCount);
    } catch (error) {
        console.error('Error updating students:', error);
    }
}

updateAllStudents();
