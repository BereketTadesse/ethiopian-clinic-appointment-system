import mongoose from  'mongoose'


const patientProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    bloodType: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    },
    allergies: [{
        type: String
    }],
    emergencyContact: {
        name: {
            type: String
        },
        phoneNumber: {
            type: String
        },
        relationship: {
            type: String
        }
    },
    medicalHistory: [{
        date: {
            type: Date
        },
        description: {
            type: String
        }
    }],
    medications: [{
        name: {
            type: String
        },
        dosage: {
            type: String
        }

    }]
}, { timestamps: true });

const PatientProfile = mongoose.model('PatientProfile', patientProfileSchema);

export default PatientProfile;