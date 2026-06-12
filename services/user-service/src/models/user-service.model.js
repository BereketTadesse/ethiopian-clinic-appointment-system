import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true },
    email: { 
        type: String, 
        required: true, 
        unique: true },
    password: { 
        type: String, 
        required: true },
    phoneNumber: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
    },
    birthDate: {
        type: Date,
        required: false
    },  
    profilePicture: {
        type: String
    },
    role: {
        type: String,
        enum: ['patient', 'doctor', 'admin'],
        default: 'patient'
    },
    address:{
        type: String,
        required: true
    },
    pendingEmail: {
        type: String,
    },
    emailUpdateToken: {
        type: String,
    },
    emailUpdateExpire: {
        type: Date,
    },
    
    isActive: { 
        type: Boolean, 
        default: true },
    isVerified: { 
        type: Boolean, 
        default: false
},
    verificationToken: { 
        type: String 
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;