import mongoose from 'mongoose';

const familyMemberProfileSchema = new mongoose.Schema({
    familyMemberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyMember',
        required: true,
        unique: true // Ensures one family member has at most one medical profile
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
    }],
    chronicConditions: [{
        type: String
    }]
}, { timestamps: true });

const FamilyMemberProfile = mongoose.model('FamilyMemberProfile', familyMemberProfileSchema);

export default FamilyMemberProfile;
